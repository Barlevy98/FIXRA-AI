import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string | string[] } | null,
  language: string = 'English',
  previousMessages: MessageType[] = [],
  userPlan: string = 'Free'
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash-lite',
      systemInstruction: `You are an ELITE gaming AI assistant and video analysis expert.
Language to respond in: ${language}.

CRITICAL RULES BASED ON INPUT TYPE:
1. EXACT MISSION IDENTIFICATION (Vision): To identify the specific mission, quest, or objective, you MUST actively scan the images/video for on-screen text (like Quest Logs, Objective Trackers, or HUD text usually located in the corners). Look at the enemies and exact environment.
2. ANTI-HALLUCINATION PROTOCOL:
   - If you don't know the GAME, do not guess. Ask the user.
   - If you know the game, but CANNOT visually verify the EXACT MISSION or objective with high confidence, DO NOT GUESS a random mission. Instead, provide a helpful general observation about what you see, and politely ask the user: "What specific mission or quest are you on?"
   - Only populate the search queries (YouTube, Wiki, etc.) with specific mission names IF you are 100% sure of the mission. Otherwise, leave the mission part of the query blank or use general terms.
3. TEXT ONLY: Rely strictly on gaming knowledge.

JSON RESPONSE FORMAT (STRICT):
{
  "message": "Direct, short and helpful solution in ${language}. If asking for the mission name, put the question here.",
  "youtubeQuery": "[Exact Game Name] [Exact Mission Name] walkthrough (leave mission empty if unknown)",
  "wikiQuery": "[Exact Game Name] [Exact Mission Name] (leave mission empty if unknown)",
  "ignQuery": "[Exact Game Name] [Exact Mission Name] (leave mission empty if unknown)",
  "polygonQuery": "[Exact Game Name] [Exact Mission Name] (leave mission empty if unknown)",
  "mapgenieQuery": "[Exact Game Name] [Item/Location] (leave empty if unknown)",
  "fextralifeQuery": "[Exact Game Name] [Boss/Quest] (leave empty if unknown)",
  "category": "The official Game Name (or 'Unknown')"
}`
    });

    let history = previousMessages
      .filter(msg => msg.text && !msg.isLoading) 
      .slice(-6) // <--- הקסם קורה פה: חותך ולוקח רק את 6 ההודעות האחרונות
      .map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text as string }]
      }));

    while (history.length > 0 && history[0].role === 'model') {
      history.shift();
    }

    const chat = model.startChat({ history });

    const promptParts: any[] = [];
    
    if (media && media.base64) {
      if (media.type === 'image' && typeof media.base64 === 'string') {
        promptParts.push({
          inlineData: {
            data: media.base64,
            mimeType: 'image/jpeg',
          },
        });
        promptParts.push("Analyze this game screenshot carefully. Extract any text that indicates the current quest or objective.");
      } else if (media.type === 'video' && Array.isArray(media.base64)) {
        media.base64.forEach((base64Image, index) => {
          promptParts.push({
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg',
            },
          });
        });
        promptParts.push("These images are sequential frames from a short video clip. Analyze them to understand the gameplay flow, and read any on-screen objective text to find the exact mission.");
      }
    }

    if (userText) {
      promptParts.push(`User query: ${userText}`);
    }

    promptParts.push("Remember to respond STRICTLY with a valid JSON as instructed.");

    const result = await chat.sendMessage(promptParts);
    const responseText = result.response.text();
    
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

    // --- חיתוך הקישורים לפי החבילות החדשות ---
    let allowedLinksCount = 0;
    if (userPlan === 'PREMIUM') {
      allowedLinksCount = 10; 
    } else if (userPlan.startsWith('PRO')) {
      allowedLinksCount = 3; 
    } else {
      allowedLinksCount = 1; 
    }

    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => {
      walkthroughData[link.type] = link.data;
    });

    return {
      message: aiResponseJSON.message,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category || 'General',
      isError: false
    };

  } catch (error) {
    console.error('AI Service Error:', error);
    return {
      message: getTranslation(language).aiError || "An error occurred. Don't worry, your credit was not used. Please try again.", 
      category: 'General',
      isError: true 
    };
  }
}