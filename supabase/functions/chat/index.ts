import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { createClient } from "npm:@supabase/supabase-js"

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

const youtubeCache = new Map<string, any>();

function safeParseJSON(str: string): any {
  try { return JSON.parse(str); } catch(e) {}
  const match = str.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch(e) {}
  }
  throw new Error("FATAL_JSON_PARSE: AI returned invalid JSON format.");
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const reqStartTime = Date.now();

  try {
    const { userText, media, language, previousMessages, userPlan, gameCategory, userId } = await req.json()

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    // משיכת מפתחות השרת לטובת אימות מאובטח
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY || !YOUTUBE_API_KEY || !GROQ_API_KEY) throw new Error("Missing API Keys");

    const hasMedia = media && media.base64 && (typeof media.base64 === 'string' || media.base64.length > 0);

    // ==========================================
    // 🛡️ ספרינט 1: אימות Premium והגבלת קצב (Rate Limiting)
    // ==========================================
    let serverValidatedPlan = userPlan; 
    let isActuallyPro = false;
    
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      // יצירת חיבור מאובטח למסד הנתונים
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('current_plan, is_pro, daily_message_count, max_messages, last_daily_reset, message_count')
        .eq('user_id', userId)
        .single();

      if (error) {
         console.warn(`[Supabase Fetch Error] User ${userId}: ${error.message}`);
      }

      if (profile) {
        serverValidatedPlan = profile.current_plan;
        isActuallyPro = profile.is_pro || serverValidatedPlan?.startsWith('PRO') || serverValidatedPlan === 'PREMIUM';
        
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        let currentCount = profile.daily_message_count || 0;
        let lastReset = profile.last_daily_reset || 0;

        // איפוס יומי
        if (now - lastReset >= oneDayMs) {
          currentCount = 0;
          lastReset = now;
        }

        // הגבלת קצב: 200 הודעות לפרו, 20 הודעות לחינמי
        const limit = profile.max_messages || (isActuallyPro ? 200 : 20);

        // אם המשתמש חרג, מחזירים הודעת Rate Limit
        if (currentCount >= limit) {
          console.warn(`[RATE LIMIT] User ${userId} blocked. Count: ${currentCount}/${limit}`);
          return new Response(JSON.stringify({
            isError: true,
            errorType: "rate_limit", 
            message: "מכסת ההודעות היומית שלך הסתיימה 🛑. שדרג לפרימיום כדי להמשיך לשוחח עם הסוכן ללא הגבלה!",
            category: gameCategory || 'General'
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // מעדכנים את הספירה
        await supabase.from('user_profiles').update({
          daily_message_count: currentCount + 1,
          last_daily_reset: lastReset,
          message_count: (profile.message_count || 0) + 1
        }).eq('user_id', userId);
      }
    }
    // ==========================================

    const systemInstruction = `You are an ELITE gaming AI assistant and video analysis expert.
CRITICAL JSON RULES: Output ONLY valid raw JSON. No markdown.
ANTI-HALLUCINATION & ELITE GAMER LOGIC:
0. YOU ARE A GAMING ASSISTANT ONLY. If the user asks about ANYTHING outside of video games (e.g., flights, cooking, politics, coding, math, general info), you MUST reject it.
   To reject, return exactly this JSON and nothing else:
   {
     "message": "אני עוזר AI שמתמחה במשחקי וידאו בלבד 🎮. אשמח לעזור לך עם מדריכים, משימות, בוסים או כל דבר שקשור למשחק שלך!",
     "category": "Unknown"
   }
1. Deduce the exact mission name if the user gives a number.
2. 'quickFixTitle' MUST be the exact mission/boss.
3. 'taskSummary' MUST be highly specific actionable gameplay tip.
4. NEVER return both 'message' and 'taskSummary'. One MUST be empty.

CRITICAL LANGUAGE RULES:
- The fields 'quickFixTitle', 'message', and 'taskSummary' MUST BE IN: ${language || 'Hebrew'}.
- ABSOLUTE OVERRIDE: The search query fields ('youtubeQuery', 'wikiQuery', 'ignQuery', 'polygonQuery', 'mapgenieQuery', 'fextralifeQuery') MUST STRICTLY BE IN 100% PURE ENGLISH. 
- You MUST translate the Game Name, Boss Name, and Mission Name to English for the queries.

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
    let providerUsed = "";

    // SMART ROUTING (משתמש בסטטוס המאומת)
    if (hasMedia) {
      providerUsed = "Gemini-2.5-Flash (Media)";
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction });
      
      let geminiHistory = history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text as string }] }));
      while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') geminiHistory.shift();

      const chat = model.startChat({ history: geminiHistory });
      const promptParts: any[] = [];
      if (media.type === 'image') promptParts.push({ inlineData: { data: media.base64, mimeType: 'image/jpeg' } });
      else media.base64.forEach((img: string) => promptParts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
      
      promptParts.push(`User query: ${userText || 'Help me with this part of the game.'}`);
      const result = await chat.sendMessage(promptParts);
      responseText = result.response.text();

    } else if (isActuallyPro) { 
       providerUsed = "Gemini-2.5-Flash-Lite (Premium)";
       const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction });
       let geminiHistory = history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text as string }] }));
       while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') geminiHistory.shift();
       const chat = model.startChat({ history: geminiHistory });
       const result = await chat.sendMessage([`User query: ${userText}`]);
       responseText = result.response.text();
    } else {
      let groqSuccess = false;
      const groqMessages = [{ role: "system", content: systemInstruction }, ...history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })), { role: "user", content: `User query: ${userText}` }];

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: groqMessages, response_format: { type: "json_object" }, temperature: 0.2 }),
            signal: AbortSignal.timeout(8000) 
          });

          if (!groqRes.ok) throw new Error(`Groq Status: ${groqRes.status}`);
          const groqData = await groqRes.json();
          responseText = groqData.choices[0].message.content;
          
          safeParseJSON(responseText);
          
          providerUsed = `Groq (Attempt ${attempt})`;
          groqSuccess = true;
          break; 

        } catch (e: any) {
          console.warn(`[Groq Warning] Attempt ${attempt} failed: ${e.message}`);
          if (attempt === 2) console.error("Groq totally failed. Falling back.");
        }
      }

      if (!groqSuccess) {
        providerUsed = "Gemini-2.5-Flash-Lite (Fallback)";
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction });
        let fallbackHistory = history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text as string }] }));
        while (fallbackHistory.length > 0 && fallbackHistory[0].role === 'model') fallbackHistory.shift();
        const chat = fallbackModel.startChat({ history: fallbackHistory });
        const result = await chat.sendMessage([`User query: ${userText}`]);
        responseText = result.response.text();
      }
    }

    rawParsed = safeParseJSON(responseText);

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
      category: safeString(rawParsed.category) || 'General',
    };

    let allAvailableLinks: any[] = [];
    
    if (!aiResponseJSON.message?.includes("🎮")) {
      const rawYtQ = aiResponseJSON.youtubeQuery || '';
      if (rawYtQ && YOUTUBE_API_KEY) {
          if (youtubeCache.has(rawYtQ)) {
             allAvailableLinks.push(youtubeCache.get(rawYtQ));
          } else {
             try {
                const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=2&q=${encodeURIComponent(rawYtQ)}&type=video&key=${YOUTUBE_API_KEY}`, { signal: AbortSignal.timeout(5000) });
                if (ytRes.ok) {
                  const ytJson = await ytRes.json();
                  if (ytJson.items && ytJson.items.length > 0) {
                      let bestVideo = ytJson.items[0];
                      const linkData = { type: 'youtube', data: { videoId: bestVideo.id.videoId, title: bestVideo.snippet.title, thumbnail: bestVideo.snippet.thumbnails.high.url } };
                      allAvailableLinks.push(linkData);
                      youtubeCache.set(rawYtQ, linkData); 
                      if (youtubeCache.size > 200) youtubeCache.clear(); 
                  }
                }
             } catch(e: any) { console.error("YouTube Error:", e.message); }
          }
      }

      if (aiResponseJSON.wikiQuery) allAvailableLinks.push({ type: 'wiki', data: { title: "📖 Read Full Wiki Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`, thumbnail: "https://logospng.org/download/fandom/fandom-256.png" } });
      if (aiResponseJSON.ignQuery) allAvailableLinks.push({ type: 'ign', data: { title: "🕹️ Read IGN Walkthrough", url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`, thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" } });
      if (aiResponseJSON.polygonQuery) allAvailableLinks.push({ type: 'polygon', data: { title: "🟣 Polygon Game Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`, thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" } });
      if (aiResponseJSON.mapgenieQuery) allAvailableLinks.push({ type: 'mapgenie', data: { title: "🗺️ MapGenie Location", url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`, thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" } });
      if (aiResponseJSON.fextralifeQuery) allAvailableLinks.push({ type: 'fextralife', data: { title: "⚔️ Fextralife Boss Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`, thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" } });
    }

    let allowedLinksCount = serverValidatedPlan === 'PREMIUM' ? 10 : (serverValidatedPlan?.startsWith('PRO') ? 3 : 1);
    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => { walkthroughData[link.type] = link.data; });
    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;

    const finalMessageText = [aiResponseJSON.message, formattedSummary].filter(text => text && text.trim().length > 0).join('\n\n');

    const latency = Date.now() - reqStartTime;
    console.log(`[SUCCESS] User: ${userId || 'Anon'} | Plan: ${serverValidatedPlan} | Provider: ${providerUsed} | Latency: ${latency}ms`);

    return new Response(JSON.stringify({
      message: finalMessageText,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category && aiResponseJSON.category !== 'Unknown' ? aiResponseJSON.category : (gameCategory || 'General'),
      isError: false
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error(`[FATAL ERROR] Latency: ${Date.now() - reqStartTime}ms | Reason:`, error.message);
    return new Response(JSON.stringify({ isError: true, message: "Server encountered an error processing your request.", errorType: "fatal" }), 
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})