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
// ==========================================
// פונקציות תוכנית שותפים ומשפיענים (Affiliates)
// ==========================================

// משיכת נתוני השותף של המשתמש (קוד, מאזן וכו')
export const getUserAffiliateData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('referral_code, referred_by, earnings_balance')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching affiliate data:', error.message);
    return null;
  }
  return data;
};

// יצירת קוד הפניה ייחודי למשתמש
export const createReferralCode = async (clerkToken: string, userId: string, customCode: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  // קודם נוודא שהקוד הזה לא תפוס כבר על ידי מישהו אחר
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('referral_code', customCode)
    .single();
    
  if (existing && existing.user_id !== userId) {
    return { success: false, error: 'Code already taken' };
  }

  // אם פנוי, נעדכן את הפרופיל של המשתמש
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ 
      user_id: userId, 
      referral_code: customCode,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error saving referral code:', error.message);
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

// ==========================================
// פונקציות הגדרות משתמש (Settings)
// ==========================================

// מעדכנת את שפת הממשק הנבחרת של המשתמש בשרת
export const updateUserLanguage = async (clerkToken: string, userId: string, languageId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ 
      user_id: userId, 
      chat_language: languageId,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error updating language:', error.message);
    return false;
  }
  return true;
};


// ==========================================
// פונקציות מועדפים (Bookmarks)
// ==========================================

// שמירת הודעה (פתרון) למועדפים
export const saveBookmark = async (clerkToken: string, userId: string, title: string, messageData: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: userId,
      title: title,
      message_data: messageData // אנחנו שומרים את כל אובייקט ההודעה (JSON) כמו שהוא!
    });

  if (error) {
    console.error('Error saving bookmark:', error.message);
    return false;
  }
  return true;
};

// משיכת כל המועדפים של המשתמש (הכי חדשים למעלה)
export const getUserBookmarks = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookmarks:', error.message);
    return [];
  }
  return data;
};

// מחיקת מועדף
export const deleteBookmark = async (clerkToken: string, bookmarkId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .eq('id', bookmarkId);

  if (error) {
    console.error('Error deleting bookmark:', error.message);
    return false;
  }
  return true;
};
// ==========================================
// פונקציות הגדרות מתקדמות (Advanced Settings)
// ==========================================

// משיכת העדפת הרטט של המשתמש (ברירת מחדל: מופעל)
export const getUserHapticsPreference = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('haptics_enabled')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching haptics preference:', error.message);
    return true; // נחזיר True כברירת מחדל במקרה של שגיאה
  }
  
  // אם הערך לא קיים עדיין (null), נחזיר true
  return data?.haptics_enabled ?? true; 
};

// עדכון העדפת הרטט בענן
export const updateUserHapticsPreference = async (clerkToken: string, userId: string, enabled: boolean) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ 
      user_id: userId, 
      haptics_enabled: enabled,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error updating haptics preference:', error.message);
    return false;
  }
  return true;
};
// עדכון שם המשתמש (Gamer Tag / Full Name) בפרופיל
export const updateUserName = async (clerkToken: string, userId: string, fullName: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      full_name: fullName,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error updating user name:', error.message);
    return false;
  }
  return true;
};
// מחיקת שיחת צ'אט מהשרת
export const deleteChatSession = async (clerkToken: string, sessionId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Error deleting session from Supabase:', error.message);
    return false;
  }
  
  return true;
};
// מחיקת *כל* שיחות הצ'אט של המשתמש מהשרת
export const deleteAllUserChatSessions = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all sessions from Supabase:', error.message);
    return false;
  }
  
  return true;
};