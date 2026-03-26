import { getAuthenticatedSupabase } from './supabase';

// פונקציה ששומרת או מעדכנת שיחת צ'אט בשרת (מאובטחת)
export const saveChatSession = async (
  clerkToken: string,
  sessionId: string,
  userId: string,
  title: string,
  messages: any[],
  category?: string // <--- הוספנו את הקטגוריה לכאן
) => {
  const supabase = getAuthenticatedSupabase(clerkToken); // חיבור עם תעודה
  const { error } = await supabase
    .from('sessions')
    .upsert({
      id: sessionId,
      user_id: userId,
      title: title,
      messages: messages,
      category: category || 'General', // <--- שומרים את הקטגוריה (התיקייה) במסד הנתונים
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error saving to Supabase:', error.message);
    return false;
  }
  
  return true;
};

// מושכת את כל השיחות של משתמש ספציפי מהשרת (מאובטחת)
export const getUserChatSessions = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken); // חיבור עם תעודה
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching from Supabase:', error.message);
    return [];
  }
  
  return data;
};