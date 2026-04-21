import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

const safeString = (val: any) => typeof val === 'string' ? val : '';
const safeNumber = (val: any) => typeof val === 'number' ? val : 0;

Deno.serve(async (req) => {
  // 1. הטיפול בבקשות CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. משיכת הנתונים שנשלחו מהאפליקציה
    const { userText, media, language, previousMessages, userPlan, gameCategory } = await req.json()

    // 3. משיכת המפתחות (שמוגדרים כמשתני סביבה ב-Supabase)
    const GEMINI_API_KEY = Deno.env.get('EXPO_PUBLIC_GEMINI_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('EXPO_PUBLIC_YOUTUBE_API_KEY');

    if (!GEMINI_API_KEY || !YOUTUBE_API_KEY) {
      throw new Error("Missing API Keys in server environment.");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // 4. בניית הפרומפט ופנייה לג'מיני (בדיוק כמו שהיה באפליקציה)
    const hasMedia = media && media.base64 && (typeof media.base64 === 'string' || media.base64.length > 0);
    const selectedModel = hasMedia ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';

    const model = genAI.getGenerativeModel({ 
      model: selectedModel,
      systemInstruction: `You are an ELITE gaming AI assistant and video analysis expert.
CRITICAL JSON RULES: Output ONLY valid raw JSON. No markdown, no backticks.
ANTI-HALLUCINATION & ELITE GAMER LOGIC:
1. Deduce the exact mission name if the user gives a number.
2. NEVER ask the user what mission they are on if you can guess.
3. 'quickFixTitle' MUST be the exact mission/boss.
4. 'taskSummary' MUST be highly specific actionable gameplay tip.
5. NEVER return both 'message' and 'taskSummary'. One MUST be empty.
LANGUAGE RULES:
- 'quickFixTitle', 'message', 'taskSummary' in: ${language || 'English'}.
- All Queries MUST BE IN PURE ENGLISH.
JSON RESPONSE FORMAT:
{
  "confidence": 0,
  "quickFixTitle": "...",
  "message": "...",
  "taskSummary": "...",
  "youtubeQuery": "[English Game Name] [English Mission Name] walkthrough",
  "wikiQuery": "[English Game Name] [English Mission Name] wiki guide",
  "ignQuery": "[English Game Name] [English Mission Name] ign walkthrough",
  "polygonQuery": "[English Game Name] [English Mission Name] polygon guide",
  "mapgenieQuery": "[English Game Name] [Item/Location] mapgenie",
  "fextralifeQuery": "[English Game Name] [Boss/Quest] fextralife",
  "category": "The official Game Name (or 'Unknown')"
}`
    });

    let history = (previousMessages || []).filter((msg: any) => msg.text && !msg.isLoading).slice(-6).map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text as string }]
    }));
    while (history.length > 0 && history[0].role === 'model') history.shift();

    const chat = model.startChat({ history });
    const promptParts: any[] = [];
    
    if (media && media.base64) {
      if (media.type === 'image' && typeof media.base64 === 'string') {
        promptParts.push({ inlineData: { data: media.base64, mimeType: 'image/jpeg' } });
        promptParts.push("Analyze this game screenshot carefully. Extract any text indicating the quest.");
      } else if (media.type === 'video' && Array.isArray(media.base64)) {
        media.base64.forEach((img: string) => promptParts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
        promptParts.push("Analyze these sequential video frames for gameplay flow and objectives.");
      }
    }

    if (userText) {
      if (gameCategory && gameCategory !== 'General' && gameCategory !== 'Unknown') {
        promptParts.push(`[SYSTEM NOTE: Game is ${gameCategory}.] User query: ${userText}`);
      } else {
        promptParts.push(`User query: ${userText}`);
      }
    }
    promptParts.push("Respond STRICTLY with JSON.");

    // פנייה ל-Gemini
    const result = await chat.sendMessage(promptParts);
    if (!result || !result.response) throw new Error("EMPTY_RESPONSE");

    const responseText = result.response.text();
    let rawParsed: any;
    
    // Parse JSON
    try {
      rawParsed = JSON.parse(responseText);
    } catch (e) {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error("FATAL_JSON_BOUNDS");
      }
      try {
        rawParsed = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
      } catch (parseError) {
        throw new Error("FATAL_JSON_PARSE");
      }
    }

    const aiResponseJSON: AIResponseJSON = {
      message: safeString(rawParsed.message),
      taskSummary: safeString(rawParsed.taskSummary),
      quickFixTitle: safeString(rawParsed.quickFixTitle),
      youtubeQuery: safeString(rawParsed.youtubeQuery),
      wikiQuery: safeString(rawParsed.wikiQuery),
      ignQuery: safeString(rawParsed.ignQuery),
      polygonQuery: safeString(rawParsed.polygonQuery),
      mapgenieQuery: safeString(rawParsed.mapgenieQuery),
      fextralifeQuery: safeString(rawParsed.fextralifeQuery),
      confidence: safeNumber(rawParsed.confidence),
      category: safeString(rawParsed.category) || 'General',
    };

    let allAvailableLinks: any[] = [];
    const rawYtQ = aiResponseJSON.youtubeQuery || '';
    
    // פנייה ל-YouTube (שימוש ב-fetch הרגיל של Deno)
    if (rawYtQ && YOUTUBE_API_KEY) {
        try {
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(rawYtQ)}&type=video&key=${YOUTUBE_API_KEY}`);
          
          if (ytRes.ok) {
            const ytJson = await ytRes.json();
            if (ytJson.items && ytJson.items.length > 0) {
                let bestVideo = ytJson.items[0];
                allAvailableLinks.push({ 
                    type: 'youtube', 
                    data: { videoId: bestVideo.id.videoId, title: bestVideo.snippet.title, thumbnail: bestVideo.snippet.thumbnails.high.url } 
                });
            }
        } else {
            // הוספנו את השורות האלו כדי להדפיס ללוגים למה יוטיוב סירב!
            const errorText = await ytRes.text();
            console.error("YouTube API Rejected:", errorText);
        }
        } catch(e: any) { 
           console.error("YouTube Error on Server:", e.message); 
        }
    }

    // הוספת שאר הקישורים
    if (aiResponseJSON.wikiQuery) allAvailableLinks.push({ type: 'wiki', data: { title: "📖 Read Full Wiki Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`, thumbnail: "https://logospng.org/download/fandom/fandom-256.png" } });
    if (aiResponseJSON.ignQuery) allAvailableLinks.push({ type: 'ign', data: { title: "🕹️ Read IGN Walkthrough", url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`, thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" } });
    if (aiResponseJSON.polygonQuery) allAvailableLinks.push({ type: 'polygon', data: { title: "🟣 Polygon Game Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`, thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" } });
    if (aiResponseJSON.mapgenieQuery) allAvailableLinks.push({ type: 'mapgenie', data: { title: "🗺️ MapGenie Location", url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`, thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" } });
    if (aiResponseJSON.fextralifeQuery) allAvailableLinks.push({ type: 'fextralife', data: { title: "⚔️ Fextralife Boss Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`, thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" } });

    // מגבלות משתמשים לפי תוכנית
    let allowedLinksCount = userPlan === 'PREMIUM' ? 10 : (userPlan?.startsWith('PRO') ? 3 : 1);
    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => { walkthroughData[link.type] = link.data; });
    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;

    const finalMessageText = [aiResponseJSON.message, formattedSummary].filter(text => text && text.trim().length > 0).join('\n\n');

    // 5. החזרת התשובה לאפליקציה!
    return new Response(JSON.stringify({
      message: finalMessageText,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category && aiResponseJSON.category !== 'Unknown' ? aiResponseJSON.category : (gameCategory || 'General'),
      isError: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error: any) {
    console.error("Server Error:", error.message);
    return new Response(JSON.stringify({ 
        isError: true, 
        message: "Server encountered an error processing your request.",
        errorType: "fatal"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})