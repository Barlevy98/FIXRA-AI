import { getAuthenticatedSupabase } from './supabase';

// פונקציה ששומרת או מעדכנת שיחת צ'אט בשרת (מאובטחת)
export const saveChatSession = async (
  clerkToken: string,
  sessionId: string,
  userId: string,
  title: string,
  messages: any[],
  category?: string
) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('sessions')
    .upsert({
      id: sessionId,
      user_id: userId,
      title: title,
      messages: messages,
      category: category || 'General',
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
  const supabase = getAuthenticatedSupabase(clerkToken);
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

// ==========================================
// פונקציות חדשות עבור סטטוס משתמש (מדריך וכו')
// ==========================================

// בודקת אם המשתמש כבר אישר את תנאי השימוש
export const getUserTosStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('has_accepted_tos')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching TOS status:', error.message);
    return false;
  }

  return data?.has_accepted_tos || false;
};

// מעדכנת בשרת שהמשתמש אישר את תנאי השימוש
export const markTosAsAccepted = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      has_accepted_tos: true,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error updating TOS status:', error.message);
    return false;
  }

  return true;
};

// בודקת אם המשתמש כבר ראה את המדריך
export const getUserTutorialStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('has_seen_tutorial')
    .eq('user_id', userId)
    .single();

  // אם הפרופיל לא קיים עדיין (שגיאה PGRST116), זה אומר שזה משתמש חדש והוא בטוח לא ראה את המדריך
  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching tutorial status:', error.message);
    return false;
  }

  return data?.has_seen_tutorial || false;
};

// מעדכנת בשרת שהמשתמש סיים לראות את המדריך
export const markTutorialAsSeen = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      has_seen_tutorial: true,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error updating tutorial status:', error.message);
    return false;
  }

  return true;
};

// ==========================================
// פונקציות ניהול מנויים וקרדיטים (Paywall)
// ==========================================

export const getUserSubscriptionData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('message_count, max_messages, current_plan, is_pro, last_reset, daily_message_count, last_daily_reset') // <-- הוספנו פה את העמודות החדשות
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription data:', error.message);
    return null;
  }
  return data;
};

// הפונקציה הזו גנרית אז היא יודעת לעדכן גם את היומי וגם את החודשי בלי שינויים נוספים
export const updateSubscriptionData = async (clerkToken: string, userId: string, updates: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ user_id: userId, ...updates, updated_at: Date.now() });

  if (error) {
    console.error('Error updating subscription data:', error.message);
    return false;
  }
  return true;
};