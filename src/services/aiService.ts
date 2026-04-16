import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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
  userPlan: string = 'Free',
  gameCategory: string = 'General' 
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean }> {
  
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
      // 🌟 הפרומפט החדש: מפריד בין שפת הדיבור לשפת החיפוש במנועים 🌟
      systemInstruction: `You are an ELITE gaming AI assistant and video analysis expert.

CRITICAL JSON RULES:
- Output ONLY valid raw JSON. No markdown formatting, no backticks (\`\`\`), no introductory text.
- Do not include ANY text outside the JSON.
- The response MUST start with { and end with }.

ANTI-HALLUCINATION & ELITE GAMER LOGIC (CRITICAL):
1. If the user provides a mission NUMBER (e.g., "Mission 6"), use your knowledge to deduce the actual name of that mission in the given game.
2. If you know enough to generate search queries (like a YouTube video), YOU MUST NEVER ask the user what mission they are on.
3. 'quickFixTitle' MUST be the actual name of the mission/boss, or a very specific 3-5 word action.
4. 'taskSummary' MUST contain a highly specific, actionable gameplay tip for THAT EXACT mission/boss. NEVER output generic advice like "complete the level".
5. Only populate 'message' with a question IF the user provides absolutely zero context.
6. NEVER return both 'message' and 'taskSummary'. One MUST be empty.

LANGUAGE RULES (STRICT):
- 'quickFixTitle', 'message', and 'taskSummary' MUST be populated in: ${language}.
- CRITICAL: 'youtubeQuery', 'wikiQuery', 'ignQuery', 'polygonQuery', 'mapgenieQuery', and 'fextralifeQuery' MUST ALWAYS BE IN PURE ENGLISH. NEVER translate the game name or mission name in the queries. Search engines need the English names.

JSON RESPONSE FORMAT: Follow this format precisely.
{
  "confidence": 0,
  "quickFixTitle": "Exact Mission Name or 3-5 word action (in ${language})",
  "message": "Questions to the user ONLY if context is 100% missing (in ${language}).",
  "taskSummary": "Specific, elite gameplay tip under 25 words (in ${language}).",
  "youtubeQuery": "[English Game Name] [English Mission Name] fast walkthrough",
  "wikiQuery": "[English Game Name] [English Mission Name] wiki guide",
  "ignQuery": "[English Game Name] [English Mission Name] ign walkthrough",
  "polygonQuery": "[English Game Name] [English Mission Name] polygon guide",
  "mapgenieQuery": "[English Game Name] [Item/Location] mapgenie",
  "fextralifeQuery": "[English Game Name] [Boss/Quest] fextralife",
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
        promptParts.push({ inlineData: { data: media.base64, mimeType: 'image/jpeg' } });
        promptParts.push("Analyze this game screenshot carefully. Extract any text that indicates the current quest or objective.");
      } else if (media.type === 'video' && Array.isArray(media.base64)) {
        media.base64.forEach((base64Image) => {
          promptParts.push({ inlineData: { data: base64Image, mimeType: 'image/jpeg' } });
        });
        promptParts.push("These images are sequential frames from a short video clip. Analyze them to understand the gameplay flow, and read any on-screen objective text to find the exact mission.");
      }
    }

    if (userText) {
      if (gameCategory && gameCategory !== 'General' && gameCategory !== 'Unknown') {
        promptParts.push(`[SYSTEM NOTE: The user is playing ${gameCategory}. Do NOT ask what game it is. If they mention a mission number, provide a specific tip for that mission in ${gameCategory}.] User query: ${userText}`);
      } else {
        promptParts.push(`User query: ${userText}`);
      }
    }

    promptParts.push("Remember to respond STRICTLY with a valid JSON as instructed.");

    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<any>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("AI_TIMEOUT")), 8000);
    });

    const result = await Promise.race([
      chat.sendMessage(promptParts),
      timeoutPromise
    ]).finally(() => clearTimeout(timeoutId)); 

    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");
    
    let aiResponseJSON: AIResponseJSON;
    try {
      aiResponseJSON = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      throw new Error("Corrupted JSON from AI");
    }

    let allAvailableLinks: any[] = [];

    // 1. YouTube תמיד נכנס ראשון למערך, כדי שמשתמש חינמי יקבל אותו תמיד!
    const ytQ = aiResponseJSON.youtubeQuery || '';
    if (ytQ) {
      try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(ytQ)}&type=video&key=${YOUTUBE_API_KEY}`);
        const ytJson = await ytRes.json();
        if (ytJson.items && ytJson.items.length > 0) {
          const video = ytJson.items[0];
          allAvailableLinks.push({ type: 'youtube', data: { videoId: video.id.videoId, title: video.snippet.title, thumbnail: video.snippet.thumbnails.high.url } });
        }
      } catch(e) { console.error("YouTube Fetch Error:", e); }
    }

    // 2. רק אחרי יוטיוב נכנסים שאר הקישורים (ככה חינמי לעולם לא יקבל אותם אם יש יוטיוב)
    if (aiResponseJSON.wikiQuery) allAvailableLinks.push({ type: 'wiki', data: { title: "📖 Read Full Wiki Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`, thumbnail: "https://logospng.org/download/fandom/fandom-256.png" } });
    if (aiResponseJSON.ignQuery) allAvailableLinks.push({ type: 'ign', data: { title: "🕹️ Read IGN Walkthrough", url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`, thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" } });
    if (aiResponseJSON.polygonQuery) allAvailableLinks.push({ type: 'polygon', data: { title: "🟣 Polygon Game Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`, thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" } });
    if (aiResponseJSON.mapgenieQuery) allAvailableLinks.push({ type: 'mapgenie', data: { title: "🗺️ MapGenie Location", url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`, thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" } });
    if (aiResponseJSON.fextralifeQuery) allAvailableLinks.push({ type: 'fextralife', data: { title: "⚔️ Fextralife Boss Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`, thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" } });

    // חיתוך הקישורים לפי סוג מנוי
    let allowedLinksCount = userPlan === 'PREMIUM' ? 10 : (userPlan.startsWith('PRO') ? 3 : 1);
    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => { walkthroughData[link.type] = link.data; });
    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) {
      formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;
    }

    const finalMessageText = [aiResponseJSON.message, formattedSummary].filter(text => text && text.trim().length > 0).join('\n\n');

    return {
      message: finalMessageText,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category && aiResponseJSON.category !== 'Unknown' ? aiResponseJSON.category : (gameCategory || 'General'),
      isError: false
    };

  } catch (error) {
    console.error('AI Service Error:', error);
    return {
      message: getTranslation(language).aiError || "An error occurred.", 
      category: 'General',
      isError: true 
    };
  }
}