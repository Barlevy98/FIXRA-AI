import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string | string[] } | null, // שדרגנו את הטייפ לקבל מערך של base64
  language: string = 'English',
  previousMessages: MessageType[] = [],
  userPlan: string = 'Basic'
): Promise<{ message: string; walkthroughData?: any; category: string }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an ELITE gaming AI assistant and video analysis expert.
Language to respond in: ${language}.

CRITICAL RULES BASED ON INPUT TYPE:
1. VIDEO ONLY (Array of Images): Act as a video analyst. Treat the input images as sequential frames from a short video clip. Analyze movement, progression, and state changes across the frames. Identify the game and objective.
2. IMAGE ONLY (Single Image): Act as a visual recognition AI. Identify the game, mission, and objective from the visual evidence.
3. TEXT ONLY: Rely strictly on gaming knowledge.

JSON RESPONSE FORMAT (STRICT):
{
  "message": "Direct, short and helpful solution or hint in ${language}. If analyzing a video, explicitly mention what you observed in the clip.",
  "youtubeQuery": "[Exact Game Name] [Official Mission Name] walkthrough",
  "wikiQuery": "[Exact Game Name] [Official Mission Name]",
  "ignQuery": "[Exact Game Name] [Official Mission Name]",
  "polygonQuery": "[Exact Game Name] [Official Mission Name]",
  "mapgenieQuery": "[Exact Game Name] [Item or Location]",
  "fextralifeQuery": "[Exact Game Name] [Boss or Quest]",
  "category": "The official Game Name"
}`
    });

    let history = previousMessages
      .filter(msg => msg.text && !msg.isLoading) 
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text as string }]
      }));

    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const chat = model.startChat({ history });

    const promptParts: any[] = [];
    
    // לוגיקה מעודכנת לטיפול במדיה (תמונה בודדת או רצף תמונות של וידאו)
    if (media && media.base64) {
      if (media.type === 'image' && typeof media.base64 === 'string') {
        // טיפול בתמונה בודדת
        promptParts.push({
          inlineData: {
            data: media.base64,
            mimeType: 'image/jpeg',
          },
        });
        promptParts.push("Analyze this game screenshot carefully.");
      } else if (media.type === 'video' && Array.isArray(media.base64)) {
        // טיפול ברצף תמונות של וידאו (מערך)
        media.base64.forEach((base64Image, index) => {
          promptParts.push({
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg',
            },
          });
        });
        promptParts.push("These images are sequential frames from a short video clip. Analyze them to understand the gameplay flow and give a walkthrough.");
      }
    }

    if (userText) {
      promptParts.push(`User query: ${userText}`);
    }

    promptParts.push("Remember to respond STRICTLY with a valid JSON as instructed.");

    const result = await chat.sendMessage(promptParts);
    const responseText = result.response.text();
    
    // ... (שאר הקוד של ה-API של יוטיוב והקישורים נשאר אותו דבר) ...
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const aiResponseJSON: any = JSON.parse(jsonMatch[0]);
    let allAvailableLinks: any[] = [];

    // --- 1. YouTube API ---
    const ytQ = aiResponseJSON.youtubeQuery || '';
    if (ytQ) {
      try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(ytQ)}&type=video&key=${YOUTUBE_API_KEY}`);
        const ytJson = await ytRes.json();
        if (ytJson.items && ytJson.items.length > 0) {
          const video = ytJson.items[0];
          allAvailableLinks.push({
            type: 'youtube',
            data: {
              videoId: video.id.videoId,
              title: video.snippet.title,
              thumbnail: video.snippet.thumbnails.high.url
            }
          });
        }
      } catch(e) { console.error("YouTube Fetch Error:", e); }
    }

    // --- הוספת פרמטר &udm=14 לכל החיפושים בגוגל כדי לקבל טקסט נקי ---

    // --- 2. Fandom Wiki ---
    if (aiResponseJSON.wikiQuery) {
      allAvailableLinks.push({
        type: 'wiki',
        data: {
          title: "📖 Read Full Wiki Guide",
          url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`,
          thumbnail: "https://logospng.org/download/fandom/fandom-256.png" 
        }
      });
    }

    // --- 3. IGN ---
    if (aiResponseJSON.ignQuery) {
      allAvailableLinks.push({
        type: 'ign',
        data: {
          title: "🕹️ Read IGN Walkthrough",
          url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`,
          thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" 
        }
      });
    }

    // --- 4. Polygon ---
    if (aiResponseJSON.polygonQuery) {
      allAvailableLinks.push({
        type: 'polygon',
        data: {
          title: "🟣 Polygon Game Guide",
          url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`,
          thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" 
        }
      });
    }

    // --- 5. MapGenie ---
    if (aiResponseJSON.mapgenieQuery) {
      allAvailableLinks.push({
        type: 'mapgenie',
        data: {
          title: "🗺️ MapGenie Location",
          url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`,
          thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" 
        }
      });
    }

    // --- 6. Fextralife ---
    if (aiResponseJSON.fextralifeQuery) {
      allAvailableLinks.push({
        type: 'fextralife',
        data: {
          title: "⚔️ Fextralife Boss Guide",
          url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`,
          thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" 
        }
      });
    }

    // --- חיתוך הקישורים לפי סוג החבילה ---
    let allowedLinksCount = 2; // Default for Basic/Free
    if (userPlan === 'Advanced') allowedLinksCount = 3;
    if (userPlan === 'PRO') allowedLinksCount = 10; // All links

    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => {
      walkthroughData[link.type] = link.data;
    });

    return {
      message: aiResponseJSON.message,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category || 'General'
    };

  } catch (error) {
    console.error('AI Service Error:', error);
    return {
      message: getTranslation(language).aiError, 
      category: 'General'
    };
  }
}