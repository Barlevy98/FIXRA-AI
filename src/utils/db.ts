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

// 🌟 תוקן מ-upsert ל-update
export const markTosAsAccepted = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ has_accepted_tos: true, updated_at: Date.now() }).eq('user_id', userId);
  return !error;
};

export const getUserTutorialStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase.from('user_profiles').select('has_seen_tutorial').eq('user_id', userId).single();
  return data?.has_seen_tutorial || false;
};

// 🌟 תוקן מ-upsert ל-update
export const markTutorialAsSeen = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ has_seen_tutorial: true, updated_at: Date.now() }).eq('user_id', userId);
  return !error;
};

export const getUserSubscriptionData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  // 🌟 הוספנו את bonus_solves_balance לתוך רשימת ה-select!
  const { data, error } = await supabase.from('user_profiles').select('lifetime_messages, cycle_limit, current_plan, is_pro, cycle_used_messages, cycle_start_date, has_used_premium_trial, fallback_used_messages, fallback_start_date, bonus_solves_balance').eq('user_id', userId).single();
  return error && error.code !== 'PGRST116' ? null : data;
};

// 🌟 תוקן מ-upsert ל-update
export const updateSubscriptionData = async (clerkToken: string, userId: string, updates: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ ...updates, updated_at: Date.now() }).eq('user_id', userId);
  return !error;
};

export const getUserAffiliateData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('referral_code, creator_code, referred_by, earnings_balance, pending_balance, creator_status, registered_invites_count, claimed_invites_milestones, bonus_solves_balance')
    .eq('user_id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    return null;
  }

  const { data: withdrawalHistory, error: historyError } = await supabase
    .from('withdrawal_requests')
    .select('amount, status, paypal_email, rejection_reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    ...profileData,
    withdrawal_history: historyError ? [] : withdrawalHistory
  };
};

// 🌟 תוקן מ-upsert ל-update
export const createReferralCode = async (clerkToken: string, userId: string, customCode: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data: existing } = await supabase.from('user_profiles').select('user_id').eq('referral_code', customCode).single();
  if (existing && existing.user_id !== userId) return { success: false, error: 'Code already taken' };
  const { error } = await supabase.from('user_profiles').update({ referral_code: customCode, updated_at: Date.now() }).eq('user_id', userId);
  return error ? { success: false, error: error.message } : { success: true };
};

// 🌟 תוקן מ-upsert ל-update
export const submitCreatorApplication = async (clerkToken: string, userId: string, link: string, followers: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ creator_status: 'pending', creator_link: link, creator_followers: followers, updated_at: Date.now() }).eq('user_id', userId);
  return error ? { success: false, error: error.message } : { success: true };
};

// 🌟 תוקן מ-upsert ל-update
export const claimInviteReward = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error: fetchErr } = await supabase.from('user_profiles').select('registered_invites_count, claimed_invites_milestones, bonus_solves_balance').eq('user_id', userId).single();
  if (fetchErr || !data) return { success: false, error: 'Could not fetch data' };
  const unclaimed = (data.registered_invites_count || 0) - ((data.claimed_invites_milestones || 0) * 5);
  if (unclaimed < 5) return { success: false, error: 'Not enough invites to claim' };
  const newBonus = (data.bonus_solves_balance || 0) + 2;
  const newClaimed = (data.claimed_invites_milestones || 0) + 1;
  const { error: updateErr } = await supabase.from('user_profiles').update({ bonus_solves_balance: newBonus, claimed_invites_milestones: newClaimed, updated_at: Date.now() }).eq('user_id', userId);
  return updateErr ? { success: false, error: updateErr.message } : { success: true, newBonus, newClaimed };
};

// 🌟 תוקן מ-upsert ל-update
export const updateUserLanguage = async (clerkToken: string, userId: string, languageId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ chat_language: languageId, updated_at: Date.now() }).eq('user_id', userId);
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

// 🌟 תוקן מ-upsert ל-update
export const updateUserHapticsPreference = async (clerkToken: string, userId: string, enabled: boolean) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ haptics_enabled: enabled, updated_at: Date.now() }).eq('user_id', userId);
  return !error;
};

// 🌟 תוקן מ-upsert ל-update
export const updateUserName = async (clerkToken: string, userId: string, fullName: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase.from('user_profiles').update({ full_name: fullName, updated_at: Date.now() }).eq('user_id', userId);
  return !error;
};

export const syncUserFullName = async (clerkToken: string, userId: string, fullName: string) => {
  try {
    const supabase = getAuthenticatedSupabase(clerkToken);
    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName, updated_at: Date.now() })
      .eq('user_id', userId)
      .is('full_name', null);
      
    if (error) {
       console.error("Failed to sync full name:", error);
    }
  } catch (error) {
    console.error("Failed to sync full name:", error);
  }
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

export const submitWithdrawalRequest = async (clerkToken: string, userId: string, amount: number, paypalEmail: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  const { data, error } = await supabase.rpc('request_withdrawal', {
    p_user_id: userId,
    p_amount: amount,
    p_paypal_email: paypalEmail
  });

  if (error || !data) {
    console.error("Supabase RPC Withdrawal Error:", error);
    return false;
  }
  
  return true;
};