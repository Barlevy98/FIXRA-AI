import { getAuthenticatedSupabase } from './supabase';

// =======================================================
// USER FUNCTIONS 
// =======================================================

export const saveChatSession = async (clerkToken: string, sessionId: string, userId: string, title: string, messages: any[], category?: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('sessions').upsert({
    id: sessionId,
    user_id: userId,
    title,
    messages,
    category: category || 'General',
    updated_at: Date.now()
  });
  return !error;
};

export const getUserChatSessions = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  return error ? [] : data;
};

export const getUserTosStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('user_profiles').select('has_accepted_tos').eq('user_id', userId).single();
  return data?.has_accepted_tos || false;
};

export const markTosAsAccepted = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, has_accepted_tos: true, updated_at: Date.now() });
  return !error;
};

export const getUserTutorialStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('user_profiles').select('has_seen_tutorial').eq('user_id', userId).single();
  return data?.has_seen_tutorial || false;
};

export const markTutorialAsSeen = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, has_seen_tutorial: true, updated_at: Date.now() });
  return !error;
};

export const getUserSubscriptionData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('user_profiles').select('lifetime_messages, cycle_limit, current_plan, is_pro, cycle_used_messages, cycle_start_date, has_used_premium_trial').eq('user_id', userId).single();
  return error && error.code !== 'PGRST116' ? null : data;
};

export const updateSubscriptionData = async (clerkToken: string, userId: string, updates: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, ...updates, updated_at: Date.now() });
  return !error;
};

// 🌟 פונקציית שליפת נתוני השותף - מעודכנת 🌟
export const getUserAffiliateData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  // 1. קודם שולפים את נתוני הפרופיל, כולל העמודה החדשה pending_balance
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('referral_code, creator_code, referred_by, earnings_balance, pending_balance, creator_status, registered_invites_count, claimed_invites_milestones, bonus_solves_balance')
    .eq('user_id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    return null;
  }

  // 2. עכשיו שולפים גם את היסטוריית המשיכות מהטבלה החדשה, אם יש
  const { data: withdrawalHistory, error: historyError } = await supabase
    .from('withdrawal_requests')
    .select('amount, status, paypal_email, rejection_reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // מאחדים את שני הנתונים לאובייקט אחד כדי שהאפליקציה תוכל להשתמש בזה בקלות
  return {
    ...profileData,
    withdrawal_history: historyError ? [] : withdrawalHistory
  };
};

export const createReferralCode = async (clerkToken: string, userId: string, customCode: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data: existing } = await supabase.from('user_profiles').select('user_id').eq('referral_code', customCode).single();
  if (existing && existing.user_id !== userId) return { success: false, error: 'Code already taken' };
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, referral_code: customCode, updated_at: Date.now() });
  return error ? { success: false, error: error.message } : { success: true };
};

export const submitCreatorApplication = async (clerkToken: string, userId: string, link: string, followers: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, creator_status: 'pending', creator_link: link, creator_followers: followers, updated_at: Date.now() });
  return error ? { success: false, error: error.message } : { success: true };
};

export const claimInviteReward = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error: fetchErr } = await supabase.from('user_profiles').select('registered_invites_count, claimed_invites_milestones, bonus_solves_balance').eq('user_id', userId).single();
  if (fetchErr || !data) return { success: false, error: 'Could not fetch data' };
  const unclaimed = (data.registered_invites_count || 0) - ((data.claimed_invites_milestones || 0) * 5);
  if (unclaimed < 5) return { success: false, error: 'Not enough invites to claim' };
  const newBonus = (data.bonus_solves_balance || 0) + 2;
  const newClaimed = (data.claimed_invites_milestones || 0) + 1;
  const { error: updateErr } = await supabase.from('user_profiles').upsert({ user_id: userId, bonus_solves_balance: newBonus, claimed_invites_milestones: newClaimed, updated_at: Date.now() });
  return updateErr ? { success: false, error: updateErr.message } : { success: true, newBonus, newClaimed };
};

export const updateUserLanguage = async (clerkToken: string, userId: string, languageId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, chat_language: languageId, updated_at: Date.now() });
  return !error;
};

export const saveBookmark = async (clerkToken: string, userId: string, title: string, messageData: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('bookmarks').insert({ user_id: userId, title, message_data: messageData });
  return !error;
};

export const getUserBookmarks = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('bookmarks').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  return error ? [] : data;
};

export const deleteBookmark = async (clerkToken: string, bookmarkId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('bookmarks').delete().eq('id', bookmarkId);
  return !error;
};

export const getUserHapticsPreference = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('user_profiles').select('haptics_enabled').eq('user_id', userId).single();
  return error && error.code !== 'PGRST116' ? true : (data?.haptics_enabled ?? true);
};

export const updateUserHapticsPreference = async (clerkToken: string, userId: string, enabled: boolean) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, haptics_enabled: enabled, updated_at: Date.now() });
  return !error;
};

export const updateUserName = async (clerkToken: string, userId: string, fullName: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').upsert({ user_id: userId, full_name: fullName, updated_at: Date.now() });
  return !error;
};

export const deleteChatSession = async (clerkToken: string, sessionId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  return !error;
};

export const deleteAllUserChatSessions = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('sessions').delete().eq('user_id', userId);
  return !error;
};

export async function reportMessageToCloud(token: string, userId: string, messageId: string, messageText: string, reason: string) {
  try {
    const supabase = getAuthenticatedSupabase(token);
    const { error } = await supabase.from('reported_messages').insert([{ user_id: userId, message_id: messageId, message_text: messageText, reason }]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error sending report:", err);
    return false;
  }
}

// 🌟 פונקציית יצירת בקשת משיכה - מעודכנת 🌟
export const submitWithdrawalRequest = async (clerkToken: string, userId: string, amount: number, paypalEmail: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  // 1. קודם כל, רושמים את הבקשה בטבלת withdrawal_requests
  const { error: requestError } = await supabase.from('withdrawal_requests').insert([{
    user_id: userId,
    amount: amount,
    paypal_email: paypalEmail,
    status: 'pending' // סטטוס התחלתי הוא תמיד בהמתנה
  }]);
  
  if (requestError) {
    console.error("Supabase Withdrawal Error:", requestError);
    return false;
  }

  // 2. אם הבקשה נרשמה בהצלחה, אנחנו חייבים "להקפיא" את הכסף:
  // נמשוך את היתרות הנוכחיות
  const { data: currentProfile } = await supabase
    .from('user_profiles')
    .select('earnings_balance, pending_balance')
    .eq('user_id', userId)
    .single();

  if (currentProfile) {
    const newEarnings = Math.max(0, (currentProfile.earnings_balance || 0) - amount); // מורידים מהזמין
    const newPending = (currentProfile.pending_balance || 0) + amount; // מוסיפים לבהמתנה

    // נעדכן את היתרות במסד הנתונים
    await supabase.from('user_profiles').upsert({ 
      user_id: userId, 
      earnings_balance: newEarnings,
      pending_balance: newPending,
      updated_at: Date.now() 
    });
  }
  
  return true;
};