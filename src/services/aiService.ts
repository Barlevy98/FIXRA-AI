import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

// שולפים את כתובת השרת שלכם ממשתני הסביבה
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Circuit Breaker פשוט (כדי למנוע ספאם מהטלפון עצמו)
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 5;
const CIRCUIT_COOLDOWN_MS = 60 * 1000; 

export async function fetchGameWalkthrough(
  userText: string,
  media: { uri: string; type: 'image' | 'video'; base64?: string | string[] } | null,
  language: string = 'English',
  previousMessages: MessageType[] = [],
  userPlan: string = 'Free',
  gameCategory: string = 'General',
  signal?: AbortSignal 
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean; errorType?: 'fatal' | 'retryable' | 'abort' }> {
  
  // אם ה-Circuit Breaker פתוח, אנחנו אפילו לא פונים לשרת
  if (Date.now() < circuitOpenUntil) {
    console.warn("Circuit Breaker is OPEN. Blocking request.");
    return { message: "System is experiencing high traffic. Please try again in a minute.", category: 'General', isError: true, errorType: 'fatal' };
  }

  try {
    // זו הבקשה האחת והיחידה שהטלפון עושה עכשיו - פנייה לשרת ה-Edge שלכם!
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        userText,
        media,
        language,
        previousMessages,
        userPlan,
        gameCategory
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    // השרת מחזיר לנו בדיוק את ה-JSON שאנחנו צריכים
    const data = await response.json();
    
    consecutiveFailures = 0; // איפוס תקלות
    return data;

  } catch (error: any) {
    if (error.name === "AbortError" || error.message === "AbortError") {
      return { message: "", category: 'General', isError: true, errorType: 'abort' };
    }
    
    consecutiveFailures++;
    if (consecutiveFailures >= MAX_FAILURES) {
      circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    }

    console.error('Edge Function Error:', error.message);
    return { 
      message: getTranslation(language).aiError || "An error occurred while connecting to the server.", 
      category: 'General', 
      isError: true, 
      errorType: 'retryable' 
    };
  }
}