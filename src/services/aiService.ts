import { MessageType } from '../types';
import { getTranslation } from '../utils/translations'; 

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

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
  signal?: AbortSignal,
  userId?: string
): Promise<{ message: string; walkthroughData?: any; category: string; isError?: boolean; errorType?: 'fatal' | 'retryable' | 'abort' | 'rate_limit' }> {
  
  if (Date.now() < circuitOpenUntil) {
    console.warn("Circuit Breaker is OPEN. Blocking request.");
    return { message: "System is experiencing high traffic. Please try again in a minute.", category: 'General', isError: true, errorType: 'fatal' };
  }

  try {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 20000);
    
    const combinedSignal = signal ? 
      (signal.aborted ? signal : (signal.addEventListener('abort', () => timeoutController.abort()), timeoutController.signal)) 
      : timeoutController.signal;

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
        gameCategory,
        userId
      }),
      signal: combinedSignal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    
    // אנו רוצים לאפס את השגיאות גם אם המשתמש חסום בגלל Rate Limit, כי השרת הגיב בהצלחה.
    consecutiveFailures = 0; 
    return data;

  } catch (error: any) {
    if (error.name === "AbortError" || error.message === "AbortError") {
      if (!signal?.aborted) {
        console.error('Request timed out in the client.');
        return { message: getTranslation(language).aiError || "Connection timed out. Please try again.", category: 'General', isError: true, errorType: 'retryable' };
      }
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