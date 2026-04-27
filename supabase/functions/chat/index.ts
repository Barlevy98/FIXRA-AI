import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { GoogleGenerativeAI } from "npm:@google/generative-ai"
import { createClient } from "npm:@supabase/supabase-js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AIResponseJSON {
  confidence?: number;
  isFollowUp?: boolean;
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
const youtubeCache = new Map<string, any>();

// 🌟 OPTIMIZATION: Singleton Supabase Client 🌟
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
let supabaseSingleton: any = null;

function getSupabaseClient() {
  if (!supabaseSingleton && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseSingleton = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseSingleton;
}

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

    // --- 🛡️ 1. ABUSE PROTECTION 🛡️ ---
    const MAX_TEXT_LENGTH = 1500;
    const MAX_MEDIA_ITEMS = 3;
    const MAX_TOTAL_BASE64_CHARS = 14000000; // ~10MB

    if (userText && userText.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ isError: true, errorType: "abuse", message: "Your message is too long. Please keep it concise.", category: gameCategory || 'General' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hasMedia = media && media.base64 && (typeof media.base64 === 'string' || media.base64.length > 0);
    
    let mediaArray: string[] = [];
    if (hasMedia) {
      mediaArray = Array.isArray(media.base64) ? media.base64 : [media.base64];
      
      if (media.type === 'image' && mediaArray.length > MAX_MEDIA_ITEMS) {
        return new Response(JSON.stringify({ isError: true, errorType: "abuse", message: `Maximum ${MAX_MEDIA_ITEMS} images allowed.`, category: gameCategory || 'General' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const totalSizeChars = mediaArray.reduce((acc: number, img: string) => acc + img.length, 0);
      if (totalSizeChars > MAX_TOTAL_BASE64_CHARS) {
        return new Response(JSON.stringify({ isError: true, errorType: "abuse", message: "Media files are too large. Please reduce quality or length (Max ~10MB).", category: gameCategory || 'General' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GEMINI_API_KEY || !YOUTUBE_API_KEY || !GROQ_API_KEY) throw new Error("Missing API Keys");

    // --- 💼 הגדרות מודל עסקי ולימיטים 💼 ---
    let serverValidatedPlan = userPlan || 'Free'; 
    let isActuallyPro = false;
    let isActuallyPremium = false;
    
    let limit = 3;
    let cycleMs = 86400000; // 24 שעות
    let isTotalLimit = false; // האם זה מנוי שלא מתאפס לעולם
    let hasQuota = true;
    
    const supabase = getSupabaseClient();
    
    if (userId && supabase) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('current_plan, is_pro, lifetime_messages, cycle_used_messages, cycle_start_date, bonus_solves_balance')
        .eq('user_id', userId)
        .single();

      if (profile) {
        serverValidatedPlan = profile.current_plan || 'Free';
        const planLower = serverValidatedPlan.toLowerCase();
        
        isActuallyPremium = planLower.includes('premium');
        isActuallyPro = isActuallyPremium || profile.is_pro || planLower.includes('pro');

        if (isActuallyPremium) {
          limit = 500;
          cycleMs = 2592000000; 
        } else if (isActuallyPro) {
          // התיקון: מחפשים בדיוק 'onetime' ולא רק 'one'
          if (planLower === 'pro_onetime' || planLower.includes('onetime') || planLower.includes('חד פעמי')) {
            limit = 50;
            isTotalLimit = true;
          } else {
            limit = 50;
            cycleMs = 2592000000; 
          }
        } else {
          limit = 3;
          cycleMs = 86400000; 
        }

        const now = Date.now();
        const bonus = profile.bonus_solves_balance || 0;
        let currentCycleCount = profile.cycle_used_messages || 0;

        // 🌟 מנגנון AUTO-DOWNGRADE (נפילה חופשית לחינם) למנוי חד פעמי 🌟
        if (isTotalLimit && currentCycleCount >= limit && bonus <= 0) {
            console.log(`[DOWNGRADE] User ${userId} finished One-Time Plan. Downgrading to Free.`);
            
            // עדכון בדאטה בייס בזמן אמת!
            await supabase.from('user_profiles').update({
                current_plan: 'Free',
                is_pro: false,
                cycle_used_messages: 0, // איפוס כדי שיוכל להשתמש ב-3 בחינם מיד
                cycle_start_date: now
            }).eq('user_id', userId);
            
            // עדכון המשתנים כדי שהבקשה הנוכחית של המשתמש לא תידחה
            serverValidatedPlan = 'Free';
            isActuallyPro = false;
            limit = 3;
            cycleMs = 86400000;
            isTotalLimit = false;
            currentCycleCount = 0;
            profile.cycle_start_date = now;
        }

        // --- 🚦 הצצה מהירה (Pre-Check) 🚦 ---
        if (isTotalLimit) {
          if (currentCycleCount >= limit && bonus <= 0) hasQuota = false;
        } else {
          const lastReset = profile.cycle_start_date || 0;
          const isNewCycle = (now - lastReset) >= cycleMs;
          const activeCount = isNewCycle ? 0 : currentCycleCount;
          if (activeCount >= limit && bonus <= 0) hasQuota = false;
        }
      }

      if (!hasQuota) {
        return new Response(JSON.stringify({
          isError: true,
          errorType: "rate_limit", 
          message: "מכסת ההודעות שלך הסתיימה 🛑. הזמן 5 חברים כדי לקבל פתרונות חינם, או שדרג לפרימיום!",
          category: gameCategory || 'General'
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // --- 🛡️ VALIDATE PERMISSIONS FIRST 🛡️ ---
      if (hasMedia) {
        if (media.type === 'video' && !isActuallyPremium) {
          return new Response(JSON.stringify({ isError: true, errorType: "fatal", message: "Video analysis requires a Premium subscription.", category: gameCategory || 'General' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (media.type === 'image' && !isActuallyPro && !isActuallyPremium) {
           return new Response(JSON.stringify({ isError: true, errorType: "fatal", message: "Image analysis requires a Pro subscription.", category: gameCategory || 'General' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    let systemInstruction = `You are an ELITE gaming AI assistant and video analysis expert.
CRITICAL JSON RULES: Output ONLY valid raw JSON. No markdown.
ANTI-HALLUCINATION & ELITE GAMER LOGIC:
0. YOU ARE A GAMING ASSISTANT ONLY. If the user asks about ANYTHING outside of video games, you MUST reject it.
   To reject, return exactly this JSON:
   {
     "message": "אני עוזר AI שמתמחה במשחקי וידאו בלבד 🎮.",
     "category": "Unknown"
   }
1. 'quickFixTitle' MUST be the exact mission/boss.
2. 'taskSummary' MUST be a highly specific actionable gameplay tip.
3. NEVER return both 'message' and 'taskSummary'. One MUST be empty.
4. "isFollowUp": Evaluate the chat history. If the user's current query is a continuation or follow-up question about the EXACT SAME boss, mission, or topic as the immediate previous conversation, set this to true. If the user is asking about a NEW boss, NEW mission, or NEW topic, set this to false.
5. 🚨 NO REPETITION RULE: If 'isFollowUp' is true, you MUST NOT repeat the same advice from your previous messages. You must read the history and provide a completely NEW tip, alternative strategy, or deeper detail.`;

    if (isActuallyPremium) {
      systemInstruction += `
6. 💎 PREMIUM MICRO-CONTEXT PROTOCOL: You are analyzing a Premium user's gameplay. Detect not only the mission, but the CURRENT EXACT MOMENT.
   If possible, based on the user's text or uploaded media, you MUST identify the specific Boss Phase, current attack pattern, or exact mistake the player is making.`;
    }

    systemInstruction += `
CRITICAL LANGUAGE RULES:
- 'quickFixTitle', 'message', and 'taskSummary' MUST BE IN: ${language || 'Hebrew'}.
- Search queries ('youtubeQuery', etc.) MUST STRICTLY BE IN PURE ENGLISH AND ALWAYS BE GENERATED.

JSON RESPONSE FORMAT:
{
  "confidence": 0,
  "isFollowUp": false,
  "quickFixTitle": "...",
  "message": "...",
  "taskSummary": "...",
  "youtubeQuery": "...", 
  "wikiQuery": "...",
  "ignQuery": "...",
  "polygonQuery": "...",
  "mapgenieQuery": "...",
  "fextralifeQuery": "...",
  "category": "The official Game Name (or 'Unknown')"
}`;

    let history = (previousMessages || []).filter((msg: any) => msg.text && !msg.isLoading).slice(-6);
    let rawParsed: any = null;
    let providerUsed = "";
    
    // --- 🤖 3. AI INVOCATION WITH RETRY LOGIC 🤖 ---
    let attemptCount = 0;
    const MAX_RETRIES = 2;
    let lastError = null;

    while (attemptCount < MAX_RETRIES && !rawParsed) {
      attemptCount++;
      let responseText = "";

      try {
        if (hasMedia) {
          providerUsed = "Gemini-2.5-Flash (Media)";
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction });
          
          let geminiHistory = history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text as string }] }));
          while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') geminiHistory.shift();

          const chat = model.startChat({ history: geminiHistory });
          const promptParts: any[] = [];
          
          if (media.type === 'image') {
             mediaArray.forEach((img: string) => promptParts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
          } else if (media.type === 'video') {
             promptParts.push({ inlineData: { data: mediaArray[0], mimeType: 'video/mp4' } });
          }
          
          promptParts.push(`User query: ${userText || 'Analyze this.'}`);
          const result = await chat.sendMessage(promptParts);
          responseText = result.response.text();

        } else if (isActuallyPro) { 
           providerUsed = isActuallyPremium ? "Gemini-2.5-Flash-Lite (Premium)" : "Gemini-2.5-Flash-Lite (Pro)"; 
           const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
           const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite', systemInstruction });
           let geminiHistory = history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text as string }] }));
           while (geminiHistory.length > 0 && geminiHistory[0].role === 'model') geminiHistory.shift();
           const chat = model.startChat({ history: geminiHistory });
           const result = await chat.sendMessage([`User query: ${userText}`]);
           responseText = result.response.text();
        } else {
           const groqMessages = [{ role: "system", content: systemInstruction }, ...history.map((msg: any) => ({ role: msg.sender === 'user' ? 'user' : 'assistant', content: msg.text })), { role: "user", content: `User query: ${userText}` }];
           const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: { "Authorization": `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: groqMessages, response_format: { type: "json_object" }, temperature: 0.2 }),
              signal: AbortSignal.timeout(8000) 
           });

           if (!groqRes.ok) throw new Error(`Groq Status: ${groqRes.status}`);
           const groqData = await groqRes.json();
           responseText = groqData.choices[0].message.content;
           providerUsed = "Groq";
        }

        rawParsed = safeParseJSON(responseText);

        if (rawParsed.category === 'Unknown' || (rawParsed.message && rawParsed.message.includes('🎮'))) {
            rawParsed.youtubeQuery = "";
            rawParsed.wikiQuery = "";
            rawParsed.category = "Unknown";
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI ERROR] Attempt ${attemptCount} failed: ${err.message}`);
        rawParsed = null; 
      }
    }

    if (!rawParsed) {
       throw new Error(`AI generation failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
    }

    const aiResponseJSON: AIResponseJSON = {
      isFollowUp: rawParsed.isFollowUp === true, 
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

    if (aiResponseJSON.isFollowUp) {
        aiResponseJSON.youtubeQuery = "";
        aiResponseJSON.wikiQuery = "";
        aiResponseJSON.ignQuery = "";
        aiResponseJSON.polygonQuery = "";
        aiResponseJSON.mapgenieQuery = "";
        aiResponseJSON.fextralifeQuery = "";
    }

    let allAvailableLinks: any[] = [];
    
    if (aiResponseJSON.category !== 'Unknown') {
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
             } catch(e: any) { console.warn("YouTube Warning:", e.message); }
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

    // --- 🚦 FINAL STEP: POST-BILLING 🚦 ---
    if (userId && supabase) {
      const { data: isAllowed, error: rpcError } = await supabase.rpc('consume_chat_allowance', { 
        p_user_id: userId, 
        p_max_messages: limit,
        p_cycle_ms: cycleMs,
        p_is_total_limit: isTotalLimit
      });

      if (!isAllowed || rpcError) {
         return new Response(JSON.stringify({
            isError: true,
            errorType: "rate_limit", 
            message: "מכסת ההודעות שלך הסתיימה 🛑. הזמן 5 חברים כדי לקבל פתרונות חינם, או שדרג לפרימיום!",
            category: gameCategory || 'General'
         }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const latency = Date.now() - reqStartTime;
    console.log(`[SUCCESS] User: ${userId || 'Anon'} | Provider: ${providerUsed} | Latency: ${latency}ms`);

    return new Response(JSON.stringify({
      message: finalMessageText,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category && aiResponseJSON.category !== 'Unknown' ? aiResponseJSON.category : (gameCategory || 'General'),
      isError: false
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error(`[FATAL ERROR] Latency: ${Date.now() - reqStartTime}ms | Reason:`, error.message);
    return new Response(JSON.stringify({ isError: true, message: "Server encountered an error processing your request. Please try again.", errorType: "fatal" }), 
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
})