import { GoogleGenerativeAI } from '@google/generative-ai';
import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Circuit Breaker (Local to device)
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const CIRCUIT_COOLDOWN_MS = 60 * 1000; 

class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableError";
  }
}

interface CacheItem {
  data: any;
  timestamp: number;
}
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; 
const MAX_CACHE_SIZE = 50; // 🌟 פיניש סופי: הקטנת עומס זיכרון במכשיר 🌟
const youtubeSearchCache = new Map<string, CacheItem>();

const enforceCacheSize = () => {
  if (youtubeSearchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = youtubeSearchCache.keys().next().value;
    if (oldestKey) youtubeSearchCache.delete(oldestKey);
  }
};

// 🌟 פיניש סופי: הגנה מוחלטת מ-Memory Leak בסביבת Expo/React Native 🌟
// @ts-ignore - globalThis extension for React Native hot refresh
if (!globalThis.__fixra_cacheCleanupStarted) {
  // @ts-ignore
  globalThis.__fixra_cacheCleanupStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of youtubeSearchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL_MS) {
        youtubeSearchCache.delete(key);
      }
    }
  }, 60 * 60 * 1000);
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

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string | string[] } | null,
  language: string = 'English',
  previousMessages: MessageType[] = [],
  userPlan: string = 'Free',
  gameCategory: string = 'General',
  signal?: AbortSignal 
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean; errorType?: 'fatal' | 'retryable' | 'abort' }> {
  
  if (!GEMINI_API_KEY) {
    console.error('AI Service Error: Missing Gemini API Key');
    return { message: getTranslation(language).aiError || "Configuration Error", category: 'General', isError: true, errorType: 'fatal' };
  }

  if (Date.now() < circuitOpenUntil) {
    console.warn("Circuit Breaker is OPEN. Blocking request to save device quota.");
    return { message: "System is experiencing high traffic. Please try again in a minute.", category: 'General', isError: true, errorType: 'fatal' };
  }

  try {
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
- 'quickFixTitle', 'message', 'taskSummary' in: ${language}.
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

    let history = previousMessages.filter(msg => msg.text && !msg.isLoading).slice(-6).map(msg => ({
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
        media.base64.forEach(img => promptParts.push({ inlineData: { data: img, mimeType: 'image/jpeg' } }));
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

    if (signal?.aborted) throw new Error("AbortError");

    let timeoutId: NodeJS.Timeout;
    let abortHandler: (() => void) | undefined;
    let isAborted = false;

    const timeoutPromise = new Promise<any>((_, reject) => { 
      timeoutId = setTimeout(() => {
        isAborted = true;
        reject(new RetryableError("AI_TIMEOUT"));
      }, 8000); 
      
      if (signal) {
        abortHandler = () => {
          isAborted = true;
          clearTimeout(timeoutId);
          reject(new Error("AbortError"));
        };
        signal.addEventListener('abort', abortHandler);
      }
    });
    
    const result = await Promise.race([chat.sendMessage(promptParts), timeoutPromise]).finally(() => {
      clearTimeout(timeoutId);
      if (signal && abortHandler) {
        signal.removeEventListener('abort', abortHandler);
      }
    }); 
    
    if (!result || !result.response) throw new RetryableError("EMPTY_RESPONSE");

    const responseText = result.response.text();
    let rawParsed: any;
    
    // 🌟 פיניש סופי: ניסיון Parse נקי קודם, ואז Fallback למציאת סוגריים 🌟
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

    if (!aiResponseJSON.message && !aiResponseJSON.taskSummary) {
      throw new Error("FATAL_JSON_STRUCTURE");
    }

    let allAvailableLinks: any[] = [];
    const rawYtQ = aiResponseJSON.youtubeQuery || '';
    
    if (rawYtQ && YOUTUBE_API_KEY) {
      const normalizedQuery = rawYtQ
        .toLowerCase()
        .replace(/\b(fast|walkthrough|guide|boss|fight|mission|how to|part \d+)\b/gi, "")
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      let cachedItem = youtubeSearchCache.get(normalizedQuery);
      if (cachedItem && Date.now() - cachedItem.timestamp > CACHE_TTL_MS) {
        youtubeSearchCache.delete(normalizedQuery);
        cachedItem = undefined; 
      }

      if (cachedItem) {
        youtubeSearchCache.delete(normalizedQuery);
        youtubeSearchCache.set(normalizedQuery, { data: cachedItem.data, timestamp: Date.now() }); 
        allAvailableLinks.push({ type: 'youtube', data: cachedItem.data });
      } else {
        const ytAbortController = new AbortController();
        const ytTimeout = setTimeout(() => ytAbortController.abort(), 5000);
        
        const ytAbortListener = () => ytAbortController.abort();
        if (signal) signal.addEventListener('abort', ytAbortListener);

        try {
          const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(rawYtQ)}&type=video&key=${YOUTUBE_API_KEY}`, { signal: ytAbortController.signal });
          
          if (!ytRes.ok) {
             if (ytRes.status === 429 || ytRes.status >= 500) throw new RetryableError("RETRYABLE_YT_ERROR");
             throw new Error("FATAL_YT_ERROR");
          }
          
          const ytJson = await ytRes.json();
          
          if (ytJson.items && ytJson.items.length > 0) {
            let bestVideo = ytJson.items[0]; 
            let highestScore = 0;

            ytJson.items.forEach((v: any, index: number) => {
              const title = v.snippet.title.toLowerCase();
              let score = 0;
              if (title.includes("walkthrough") || title.includes("guide")) score += 3;
              if (title.includes("boss") || title.includes("mission")) score += 2;
              if (title.includes("no damage") || title.includes("easy")) score += 1;
              if (gameCategory !== 'General' && title.includes(gameCategory.toLowerCase())) score += 2;
              
              const ageDays = (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 86400000;
              if (ageDays < 365) score += 1; 
              
              if (title.includes("part")) score -= 1; 
              if (title.includes("full playthrough")) score -= 2;

              if (score > highestScore) {
                highestScore = score;
                bestVideo = ytJson.items[index];
              }
            });

            if (highestScore < 2 && (aiResponseJSON.confidence || 0) < 0.6 && userPlan !== 'Free' && ytJson.items.length > 1) {
              const videosList = ytJson.items.map((v: any, index: number) => `${index}: ${v.snippet.title}`).join('\n');
              const rankingPrompt = `Which video MOST directly solves the user's exact problem? User problem: "${userText}". Return ONLY the single digit index number. Videos: \n${videosList}`;
              
              const rankingModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
              try {
                if (signal?.aborted) throw new Error("AbortError");
                const rankingResult = await rankingModel.generateContent(rankingPrompt);
                const cleanedResponse = rankingResult.response.text().trim().replace(/\D/g, ''); 
                if (cleanedResponse.length > 0) {
                  const bestIndex = parseInt(cleanedResponse);
                  if (!isNaN(bestIndex) && bestIndex >= 0 && bestIndex < ytJson.items.length) {
                    bestVideo = ytJson.items[bestIndex];
                  }
                }
              } catch (rankErr: any) { 
                if (rankErr.name === "AbortError" || rankErr.message === "AbortError") throw rankErr;
                console.log("Ranking fallback to heuristic."); 
              }
            }

            if (bestVideo) {
                const videoData = { videoId: bestVideo.id.videoId, title: bestVideo.snippet.title, thumbnail: bestVideo.snippet.thumbnails.high.url };
                if ((aiResponseJSON.confidence || 0) > 0.7) {
                  enforceCacheSize();
                  youtubeSearchCache.set(normalizedQuery, { data: videoData, timestamp: Date.now() });
                }
                allAvailableLinks.push({ type: 'youtube', data: videoData });
            }
          }
        } catch(e: any) { 
          if (e.name === 'AbortError' || e.message === 'AbortError') {
             if (signal?.aborted) throw new Error("AbortError"); 
             console.error("YouTube Timeout"); 
          } else if (e instanceof RetryableError) {
             throw e; 
          } else {
             console.error("YouTube Error (Fatal):", e); 
          }
        } finally {
          clearTimeout(ytTimeout);
          if (signal && ytAbortListener) signal.removeEventListener('abort', ytAbortListener);
        }
      }
    }

    if (aiResponseJSON.wikiQuery) allAvailableLinks.push({ type: 'wiki', data: { title: "📖 Read Full Wiki Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fandom.com ' + aiResponseJSON.wikiQuery)}&udm=14`, thumbnail: "https://logospng.org/download/fandom/fandom-256.png" } });
    if (aiResponseJSON.ignQuery) allAvailableLinks.push({ type: 'ign', data: { title: "🕹️ Read IGN Walkthrough", url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + aiResponseJSON.ignQuery)}&udm=14`, thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" } });
    if (aiResponseJSON.polygonQuery) allAvailableLinks.push({ type: 'polygon', data: { title: "🟣 Polygon Game Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:polygon.com ' + aiResponseJSON.polygonQuery)}&udm=14`, thumbnail: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Polygon_logo.svg/1200px-Polygon_logo.svg.png" } });
    if (aiResponseJSON.mapgenieQuery) allAvailableLinks.push({ type: 'mapgenie', data: { title: "🗺️ MapGenie Location", url: `https://www.google.com/search?q=${encodeURIComponent('site:mapgenie.io ' + aiResponseJSON.mapgenieQuery)}&udm=14`, thumbnail: "https://cdn.mapgenie.io/images/logo-icon.png" } });
    if (aiResponseJSON.fextralifeQuery) allAvailableLinks.push({ type: 'fextralife', data: { title: "⚔️ Fextralife Boss Guide", url: `https://www.google.com/search?q=${encodeURIComponent('site:fextralife.com ' + aiResponseJSON.fextralifeQuery)}&udm=14`, thumbnail: "https://fextralife.com/wp-content/uploads/2021/05/fextralife-logo-150x150.png" } });

    let allowedLinksCount = userPlan === 'PREMIUM' ? 10 : (userPlan.startsWith('PRO') ? 3 : 1);
    const finalLinks = allAvailableLinks.slice(0, allowedLinksCount);

    let walkthroughData: any = {};
    finalLinks.forEach(link => { walkthroughData[link.type] = link.data; });
    
    let formattedSummary = aiResponseJSON.taskSummary || '';
    if (aiResponseJSON.quickFixTitle && formattedSummary) formattedSummary = `💡 **${aiResponseJSON.quickFixTitle}**\n${formattedSummary}`;

    const finalMessageText = [aiResponseJSON.message, formattedSummary].filter(text => text && text.trim().length > 0).join('\n\n');

    consecutiveFailures = 0;

    return {
      message: finalMessageText,
      walkthroughData: Object.keys(walkthroughData).length > 0 ? walkthroughData : undefined,
      category: aiResponseJSON.category && aiResponseJSON.category !== 'Unknown' ? aiResponseJSON.category : (gameCategory || 'General'),
      isError: false
    };

  } catch (error: any) {
    if (error.message === "AbortError" || error.name === "AbortError") {
      return { message: "", category: 'General', isError: true, errorType: 'abort' };
    }
    
    const isFatal = error.message.startsWith("FATAL_") || !(error instanceof RetryableError);
    
    // 🌟 פיניש סופי: לא מקפיצים Circuit Breaker על בעיות JSON נקודתיות של מודל ה-AI 🌟
    if (isFatal && !error.message.startsWith("FATAL_JSON_")) {
      consecutiveFailures++;
      if (consecutiveFailures >= MAX_FAILURES) {
        console.error(`Circuit Breaker TRIPPED. Blocking requests for ${CIRCUIT_COOLDOWN_MS / 1000}s.`);
        circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      }
    }

    console.error('AI Service Error:', error.message);
    return { 
      message: getTranslation(language).aiError || "An error occurred.", 
      category: 'General', 
      isError: true, 
      errorType: isFatal ? 'fatal' : 'retryable' 
    };
  }
}