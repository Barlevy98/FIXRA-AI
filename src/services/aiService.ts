import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// --- 1. TypeScript Interface ---
interface AIResponseJSON {
  confidence?: number;
  quickFixTitle?: string;
  message?: string;
  taskSummary?: string;
  youtubeQuery?: string;
  wikiQuery?: string;
  ignQuery?: string;
  polygonQuery?: string;
  mapgenieQuery?: string;
  fextralifeQuery?: string;
  category?: string;
}

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string | string[] } | null,
  language: string = 'English',
  previousMessages: MessageType[] = [],
  userPlan: string = 'Free'
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean }> {
  
  // --- 2. Fail Fast:Api keys---
  if (!GEMINI_API_KEY) {
    console.error('AI Service Error: Missing Gemini API Key');
    return {
      message: getTranslation(language).aiError || "An error occurred. Don't worry, your credit was not used. Please try again.", 
      category: 'General',
      isError: true 
    };
  }

  try {
    const hasMedia = media && media.base64 && (typeof media.base64 === 'string' || media.base64.length > 0);
    const selectedModel = hasMedia ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';

    const model = genAI.getGenerativeModel({ 
      model: selectedModel,
      // --- עדכון הפרומפט  ---
      systemInstruction: `You are an ELITE gaming AI assistant and video analysis expert.
Language to respond in: ${language}.
CRITICAL JSON RULES:
- Output ONLY valid raw JSON. No markdown formatting, no backticks (\`\`\`), no introductory text.
- Do not include ANY text outside the JSON.
- The response MUST start with { and end with }.

ADDITIONAL ENFORCEMENTS (CRITICAL):
- Include "confidence" (0-100) representing how sure you are of the exact mission.
- If confidence < 90% for exact mission -> Treat the mission as UNKNOWN.
- Add "quickFixTitle" (3-5 words max, e.g., "Shoot the weak spot").
- taskSummary MUST be under 25 words total.
- taskSummary MUST include a clear immediate action.
- NEVER return vague advice. ALWAYS provide value, even if mission is unknown.
- NEVER return both 'message' and 'taskSummary'. One MUST be empty.
- Queries must prioritize: "fast walkthrough", "no damage", "easy guide".

CRITICAL RULES BASED ON INPUT TYPE:
1. EXACT MISSION IDENTIFICATION (Vision): Scan images/video for on-screen text (Quest Logs, HUD) to identify the specific mission/quest. Look at enemies and environment.
2. ANTI-HALLUCINATION & RESPONSE ROUTING:
   - If NO GAME IDENTIFIED from input: Populate 'message' asking the user what game they are playing. Leave 'taskSummary' and all queries empty.
   - IF YOU KNOW THE GAME, NEVER ask what game it is.
   - If game is known, but mission is UNKNOWN (or confidence < 90%):
     - Leave 'message' EMPTY.
     - Populate 'taskSummary' with general progression advice and explicitly ask: "What specific mission or quest are you on?".
     - Leave queries empty.
   - If exact mission IS known (confidence >= 90%):
     - Leave 'message' EMPTY.
     - Populate 'taskSummary' with a clear, ACTIONABLE step (under 25 words).
     - Populate the search queries with specific mission names.

JSON RESPONSE FORMAT (STRICT): Follow this format precisely. Populate in ${language}.
{
  "confidence": 0,
  "quickFixTitle": "Short 3-5 word action",
  "message": "Questions to the user ONLY if the game is completely unknown. Otherwise, leave empty.",
  "taskSummary": "Actionable tip under 25 words. NEVER use if 'message' is populated.",
  "youtubeQuery": "[Exact Game Name] [Exact Mission Name] fast walkthrough",
  "wikiQuery": "[Exact Game Name] [Exact Mission Name] wiki guide",
  "ignQuery": "[Exact Game Name] [Exact Mission Name] ign walkthrough",
  "polygonQuery": "[Exact Game Name] [Exact Mission Name] polygon guide",
  "mapgenieQuery": "[Exact Game Name] [Item/Location] mapgenie",
  "fextralifeQuery": "[Exact Game Name] [Boss/Quest] fextralife",
  "category": "The official Game Name (or 'Unknown')"
}`
    });

    let history = previousMessages
      .filter(msg => msg.text && !msg.isLoading) 
      .slice(-6) 
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

    // --- 3. Timeout Mechanism (8 sec ) ---
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<any>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("AI_TIMEOUT")), 8000);
    });

    const result = await Promise.race([
      chat.sendMessage(promptParts),
      timeoutPromise
    ]).finally(() => clearTimeout(timeoutId)); // <--- ברגע שיש תשובה, עוצרים את השעון

    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    // --- 4.JSON ---
    let aiResponseJSON: AIResponseJSON;
    try {
      aiResponseJSON = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      throw new Error("Corrupted JSON from AI");
    }

    let allAvailableLinks: any[] = [];

    // --- שאילתות החיפוש ---
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

    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) {
      formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;
    }

    const finalMessageText = [aiResponseJSON.message, formattedSummary]
      .filter(text => text && text.trim().length > 0)
      .join('\n\n');

    return {
      message: finalMessageText,
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