import { getAuthenticatedSupabase } from './supabase';

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

export const getUserTutorialStatus = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('has_seen_tutorial')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching tutorial status:', error.message);
    return false;
  }

  return data?.has_seen_tutorial || false;
};

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

export const getUserSubscriptionData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('message_count, max_messages, current_plan, is_pro, last_reset, daily_message_count, last_daily_reset, has_used_premium_trial')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription data:', error.message);
    return null;
  }
  return data;
};

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

export const getUserAffiliateData = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('referral_code, referred_by, earnings_balance, creator_status, registered_invites_count, claimed_invites_milestones, bonus_solves_balance')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching affiliate data:', error.message);
    return null;
  }
  return data;
};

export const createReferralCode = async (clerkToken: string, userId: string, customCode: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('referral_code', customCode)
    .single();
    
  if (existing && existing.user_id !== userId) {
    return { success: false, error: 'Code already taken' };
  }

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

export const submitCreatorApplication = async (clerkToken: string, userId: string, link: string, followers: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      creator_status: 'pending',
      creator_link: link,
      creator_followers: followers,
      updated_at: Date.now()
    });

  if (error) {
    console.error('Error submitting creator app:', error.message);
    return { success: false, error: error.message };
  }
  
  return { success: true };
};

// 🌟 עודכן ליעד של 5 חברים = 2 פתרונות 🌟
export const claimInviteReward = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  
  const { data, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('registered_invites_count, claimed_invites_milestones, bonus_solves_balance')
    .eq('user_id', userId)
    .single();
    
  if (fetchErr || !data) return { success: false, error: 'Could not fetch data' };
  
  // מחשב כמה נרשמו פחות מה שהוא כבר פדה (כפול 5 כי כל מנה היא 5 חברים)
  const unclaimed = (data.registered_invites_count || 0) - ((data.claimed_invites_milestones || 0) * 5);
  if (unclaimed < 5) return { success: false, error: 'Not enough invites to claim' };

  // מוסיף 2 פתרונות לכספת, ומעדכן שהוא פדה עוד אבן דרך אחת
  const newBonus = (data.bonus_solves_balance || 0) + 2;
  const newClaimed = (data.claimed_invites_milestones || 0) + 1;

  const { error: updateErr } = await supabase
    .from('user_profiles')
    .upsert({ 
      user_id: userId, 
      bonus_solves_balance: newBonus, 
      claimed_invites_milestones: newClaimed, 
      updated_at: Date.now() 
    });

  if (updateErr) return { success: false, error: updateErr.message };
  return { success: true, newBonus, newClaimed };
};

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

export const saveBookmark = async (clerkToken: string, userId: string, title: string, messageData: any) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { error } = await supabase
    .from('bookmarks')
    .insert({
      user_id: userId,
      title: title,
      message_data: messageData 
    });

  if (error) {
    console.error('Error saving bookmark:', error.message);
    return false;
  }
  return true;
};

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

export const getUserHapticsPreference = async (clerkToken: string, userId: string) => {
  const supabase = getAuthenticatedSupabase(clerkToken);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('haptics_enabled')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching haptics preference:', error.message);
    return true; 
  }
  
  return data?.haptics_enabled ?? true; 
};

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

export async function reportMessageToCloud(token: string, userId: string, messageId: string, messageText: string, reason: string) {
  try {
    const supabase = getAuthenticatedSupabase(token);
    const { error } = await supabase
      .from('reported_messages')
      .insert([
        { 
          user_id: userId, 
          message_id: messageId, 
          message_text: messageText, 
          reason: reason 
        }
      ]);
      
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error sending report:", err);
    return false;
  }
}