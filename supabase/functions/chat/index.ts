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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userText, media, language, previousMessages, userPlan, gameCategory } = await req.json()

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GEMINI_API_KEY || !YOUTUBE_API_KEY || !GROQ_API_KEY) {
      throw new Error("Missing API Keys in server environment.");
    }

    const hasMedia = media && media.base64 && (typeof media.base64 === 'string' || media.base64.length > 0);

    const systemInstruction = `You are an ELITE gaming AI assistant and video analysis expert.
CRITICAL JSON RULES: Output ONLY valid raw JSON. No markdown, no backticks.
ANTI-HALLUCINATION & ELITE GAMER LOGIC:
0. YOU ARE A GAMING ASSISTANT ONLY. If the user asks about ANYTHING outside of video games (e.g., flights, cooking, politics, coding, math, general info), you MUST reject it.
   To reject, return exactly this JSON and nothing else:
   {
     "message": "עצור! 🛑 נראה שניסית לפתוח Side Quest שאני לא לוקח. אני כאן רק בשביל ה-Loot, ה-Walkthroughs והניצחון. אני סוכן AI שמתמחה אך ורק בעזרה במשחקים – בוא נחזור ל-Main Quest שלנו. מה המשימה הבאה שלך במשחק?",
     "category": "Unknown"
   }
1. Deduce the exact mission name if the user gives a number.
2. NEVER ask the user what mission they are on if you can guess.
3. 'quickFixTitle' MUST be the exact mission/boss.
4. 'taskSummary' MUST be highly specific actionable gameplay tip.
5. NEVER return both 'message' and 'taskSummary'. One MUST be empty.

CRITICAL LANGUAGE RULES:
- The fields 'quickFixTitle', 'message', and 'taskSummary' MUST BE IN: ${language || 'Hebrew'}.
- ABSOLUTE OVERRIDE: The search query fields ('youtubeQuery', 'wikiQuery', 'ignQuery', 'polygonQuery', 'mapgenieQuery', 'fextralifeQuery') MUST STRICTLY BE IN 100% PURE ENGLISH. 
- You MUST translate the Game Name, Boss Name, and Mission Name to English for the queries, even if the user asked in Hebrew. DO NOT output any Hebrew letters inside the query fields.

JSON RESPONSE FORMAT:
{
  "confidence": 0,
  "quickFixTitle": "...",
  "message": "...",
  "taskSummary": "...",
  "youtubeQuery": "[Game Name in English] [Mission/Boss in English] walkthrough",
  "wikiQuery": "[Game Name in English] [Mission in English] wiki guide",
  "ignQuery": "[Game Name in English] [Mission in English] ign walkthrough",
  "polygonQuery": "[Game Name in English] [Mission in English] polygon guide",
  "mapgenieQuery": "[Game Name in English] [Item/Location in English] mapgenie",
  "fextralifeQuery": "[Game Name in English] [Boss/Quest in English] fextralife",
  "category": "The official Game Name (or 'Unknown')"
}`;

    let history = (previousMessages || []).filter((msg: any) => msg.text && !msg.isLoading).slice(-6);
    let rawParsed: any;
    let responseText = "";

    if (hasMedia) {
      console.log("Routing to Gemini 2.5 Flash (Media detected)");
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction });
      
      let geminiHistory = history.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text as string }]
      }));
      while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') geminiHistory.shift();

      const chat = model.startChat({ history: geminiHistory });
      const promptParts: any[] = [];
      
      if (media.type === 'image' && typeof media.base64 === 'string') {
        promptParts.push({ inlineData: { data: media.base64, mimeType: 'image/jpeg' } });
        promptParts.push("Analyze this game screenshot carefully.");
      } else if (media.type === 'video' && Array.isArray(media.base64)) {
        media.base64.forEach((img: string) => promptParts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
        promptParts.push("Analyze these sequential video frames for gameplay flow.");
      }

      promptParts.push(`User query: ${userText || 'Help me with this part of the game.'}`);
      const result = await chat.sendMessage(promptParts);
      responseText = result.response.text();

    } else {
      console.log("Routing to Groq (Text only)");
      try {
        const groqMessages = [{ role: "system", content: systemInstruction }];
        history.forEach((msg: any) => {
          groqMessages.push({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text });
        });
        groqMessages.push({ role: "user", content: `User query: ${userText}` });

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile", // המודל החדש והמהיר ביותר שלהם
            messages: groqMessages,
            response_format: { type: "json_object" },
            temperature: 0.2
          })
        });

        // התיקון שלנו: הדפסת השגיאה הספציפית מ-Groq
        if (!groqRes.ok) {
          const groqErrorBody = await groqRes.text();
          console.error("GROQ SPECIFIC ERROR:", groqErrorBody);
          throw new Error("Groq API failed");
        }
        
        const groqData = await groqRes.json();
        responseText = groqData.choices[0].message.content;

      } catch (groqError) {
        console.error("Groq Failed, falling back to Gemini 2.5 Flash-Lite:", groqError);
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction });
        
        let fallbackHistory = history.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text as string }]
        }));
        while (fallbackHistory.length > 0 && fallbackHistory[0].role === 'model') fallbackHistory.shift();

        const chat = fallbackModel.startChat({ history: fallbackHistory });
        const result = await chat.sendMessage([`User query: ${userText}`]);
        responseText = result.response.text();
      }
    }

    try {
      rawParsed = JSON.parse(responseText);
    } catch (e) {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
        throw new Error("FATAL_JSON_BOUNDS");
      }
      rawParsed = JSON.parse(responseText.substring(firstBrace, lastBrace + 1));
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
    
    if (!aiResponseJSON.message?.includes("עצור! 🛑")) {
      const rawYtQ = aiResponseJSON.youtubeQuery || '';
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
          }
          } catch(e: any) { console.error("YouTube Error on Server:", e.message); }
      }

      if (aiResponseJSON.wikiQuery) allAvailableLinks.push({ type: 'wiki', data: { title: "📖 Read Full Wiki Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`, thumbnail: "https://logospng.org/download/fandom/fandom-256.png" } });
      if (aiResponseJSON.ignQuery) allAvailableLinks.push({ type: 'ign', data: { title: "🕹️ Read IGN Walkthrough", url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`, thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" } });
      if (aiResponseJSON.polygonQuery) allAvailableLinks.push({ type: 'polygon', data: { title: "🟣 Polygon Game Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`, thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" } });
      if (aiResponseJSON.mapgenieQuery) allAvailableLinks.push({ type: 'mapgenie', data: { title: "🗺️ MapGenie Location", url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`, thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" } });
      if (aiResponseJSON.fextralifeQuery) allAvailableLinks.push({ type: 'fextralife', data: { title: "⚔️ Fextralife Boss Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`, thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" } });
    }

    let allowedLinksCount = userPlan === 'PREMIUM' ? 10 : (userPlan?.startsWith('PRO') ? 3 : 1);
    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => { walkthroughData[link.type] = link.data; });
    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;

    const finalMessageText = [aiResponseJSON.message, formattedSummary].filter(text => text && text.trim().length > 0).join('\n\n');

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