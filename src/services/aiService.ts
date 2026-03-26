import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIResponse, MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '';

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string } | null,
  language: string = 'English',
  previousMessages: MessageType[] = [] 
): Promise<{ message: string; walkthroughData?: MessageType['walkthroughData']; category: string }> {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: `You are an ELITE gaming AI assistant.
Language to respond in: ${language}.

CRITICAL RULES BASED ON INPUT TYPE:
1. IMAGE ONLY: Act as an elite visual analysis AI. Identify the EXACT game and objective from the visual evidence.
2. TEXT ONLY: Act as a highly precise gaming knowledge base. Rely strictly on the text and chat history.
3. IMAGE + TEXT: Combine visual analysis with the user's specific text question.
4. FOLLOW-UP QUESTIONS: ALWAYS use the exact game name established in the chat history.

MISSION NAMES VS NUMBERS (CRITICAL RULE):
If the user asks for a mission by NUMBER (e.g., "mission 20"), YOU MUST TRANSLATE THIS NUMBER INTO THE OFFICIAL MISSION NAME (e.g., "The Jewel Store Job"). 
NEVER use numbers like "Mission 20" in your search queries! YouTube and IGN will return wrong results if you use numbers. You MUST use ONLY the Official Mission Name.

GOLDEN RULES FOR QUERIES:
1. NEVER simplify names. Do not summarize 'Grand Theft Auto V' to 'GTA V'.
2. DO NOT USE MISSION NUMBERS IN QUERIES. Use the exact Official Mission Name.
3. IGN: Create a precise search query for IGN using the exact Game Name and Official Mission Name.

Respond STRICTLY with a valid JSON object matching this exact structure:
{
  "message": "Direct, short and helpful solution or hint in ${language}.",
  "youtubeQuery": "English search query: [Exact Game Name] + [Official Mission Name] + 'walkthrough'",
  "wikiQuery": "English search query: [Exact Game Name] + [Official Mission Name] + 'fandom wiki'",
  "ignQuery": "English search query: [Exact Game Name] + [Official Mission Name] + 'walkthrough guide'",
  "category": "The official Game Name (e.g., 'GTA V', 'Elden Ring')"
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
    
    if (media && media.base64 && media.type === 'image') {
      promptParts.push({
        inlineData: {
          data: media.base64,
          mimeType: 'image/jpeg',
        },
      });
      promptParts.push("Analyze this game screenshot carefully. Identify the game, the mission/location, and provide a walkthrough.");
    }

    if (userText) {
      promptParts.push(`User query: ${userText}`);
    }

    promptParts.push("Remember to respond STRICTLY with a valid JSON object as instructed. Translate any mission numbers into official mission names for the search queries.");

    const result = await chat.sendMessage(promptParts);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid AI response format");
    }
    
    const aiResponseJSON: any = JSON.parse(jsonMatch[0]);
    let walkthroughData: any = {}; 

    // --- 1. YouTube API ---
    const ytQ = aiResponseJSON.youtubeQuery || '';
    if (ytQ) {
      try {
        const ytRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${encodeURIComponent(ytQ)}&type=video&key=${YOUTUBE_API_KEY}`);
        const ytJson = await ytRes.json();
        if (ytJson.items && ytJson.items.length > 0) {
          const video = ytJson.items[0];
          walkthroughData.youtube = {
            videoId: video.id.videoId,
            title: video.snippet.title,
            thumbnail: video.snippet.thumbnails.high.url
          };
        }
      } catch(e) { console.error("YouTube Fetch Error:", e); }
    }

    // --- 2. Fandom Wiki ---
    const wikiQ = aiResponseJSON.wikiQuery || '';
    if (wikiQ) {
      walkthroughData.wiki = {
        title: "📖 Read Full Wiki Guide",
        url: `https://duckduckgo.com/?q=${encodeURIComponent('!ducky ' + wikiQ)}`,
        thumbnail: "https://logospng.org/download/fandom/fandom-256.png" 
      };
    }

    // --- 3. IGN Search (גוגל המסונן שלנו במקום הניתוב השבור) ---
    const ignQ = aiResponseJSON.ignQuery || '';
    if (ignQ) {
      walkthroughData.ign = {
        title: "🕹️ Read IGN Walkthrough",
        url: `https://www.google.com/search?q=${encodeURIComponent('site:ign.com ' + ignQ)}`,
        thumbnail: "https://cdn-icons-png.flaticon.com/512/5260/5260498.png" 
      };
    }

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