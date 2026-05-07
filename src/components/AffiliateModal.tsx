import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Share, Platform, KeyboardAvoidingView, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { getUserAffiliateData, createReferralCode, submitCreatorApplication, claimInviteReward , submitWithdrawalRequest} from '../utils/db'; 

interface AffiliateModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'invite' | 'creator';
}

export default function AffiliateModal({ visible, onClose, mode }: AffiliateModalProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false); 
  const [showLegal, setShowLegal] = useState(false); 
  
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [creatorCode, setCreatorCode] = useState<string | null>(null); 
  
  const [earnings, setEarnings] = useState<number>(0); 
  const [pendingBalance, setPendingBalance] = useState<number>(0); // נוסף: יתרה בהמתנה
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]); // נוסף: היסטוריית משיכות

  const [registeredInvites, setRegisteredInvites] = useState<number>(0);
  const [claimedMilestones, setClaimedMilestones] = useState<number>(0);
  const [bonusSolves, setBonusSolves] = useState<number>(0);
  
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [creatorStatus, setCreatorStatus] = useState<'none' | 'pending' | 'active' | 'blocked'>('none');
  const [creatorLinkInput, setCreatorLinkInput] = useState('');
  const [creatorFollowersInput, setCreatorFollowersInput] = useState('');
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  // סטייטים למשיכת כספים
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState('');

  const isCreator = mode === 'creator';
  const themeColor = isCreator ? '#ff00cc' : '#00e5ff';
  const themeGradient = isCreator ? ['#ff00cc', '#b300ff'] : ['#00e5ff', '#007acc'];

  const unclaimedInvites = registeredInvites - (claimedMilestones * 5);
  const canClaimReward = unclaimedInvites >= 5 && !isCreator;

  useEffect(() => {
    if (visible && userId) { setShowGuide(false); loadData(); }
  }, [visible, userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const data = await getUserAffiliateData(token, userId!);
        if (data) {
          setReferralCode(data.referral_code || null);
          setCreatorCode(data.creator_code || null); 
          setEarnings(data.earnings_balance || 0); 
          setPendingBalance(data.pending_balance || 0); // משיכת יתרה בהמתנה
          setWithdrawalHistory(data.withdrawal_history || []); // משיכת היסטוריה
          setRegisteredInvites(data.registered_invites_count || 0);
          setClaimedMilestones(data.claimed_invites_milestones || 0);
          setBonusSolves(data.bonus_solves_balance || 0);
          setCreatorStatus(data.creator_status || 'none');
        }
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const handleClaimReward = async () => {
    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const res = await claimInviteReward(token, userId!);
        if (res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Reward Claimed! 🎁", "2 Premium Solves have been added to your vault!");
          setBonusSolves(res.newBonus || bonusSolves + 2);
          setClaimedMilestones(res.newClaimed || claimedMilestones + 1);
        } else {
          Alert.alert("Oops", "Could not claim reward right now.");
        }
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleApplyCreator = async () => {
    if (!creatorLinkInput.trim() || !creatorFollowersInput.trim()) {
      return Alert.alert("Missing Info", "Please fill in all fields.");
    }
    if (!isTermsAccepted) {
      return Alert.alert("Legal Requirement", "You must accept the Creator Agreement to proceed.");
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const res = await submitCreatorApplication(token, userId!, creatorLinkInput.trim(), creatorFollowersInput.trim());
        if (res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setCreatorStatus('pending');
          Alert.alert("Application Sent! 🚀", "Our team will review your channel and update your status soon.");
        } else {
          Alert.alert("Error", "Could not submit application.");
        }
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleWithdrawRequest = async () => {
    if (earnings < 10) return Alert.alert("Minimum Withdrawal", "You need at least $10 available to withdraw.");
    if (!paypalEmail.includes('@')) return Alert.alert("Invalid Email", "Please enter a valid PayPal email address.");
    
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const success = await submitWithdrawalRequest(token, userId!, earnings, paypalEmail.trim());
        if (success) {
          Alert.alert("Request Sent! 💸", "Your withdrawal is being processed.");
          setShowWithdrawForm(false);
          setPaypalEmail('');
          loadData(); // רענון נתונים כדי להראות את הסטטוס החדש והיתרות המעודכנות
        } else {
          Alert.alert("Error", "Failed to submit request.");
        }
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleCreateCode = async () => {
    if (customCodeInput.trim().length < 3) return Alert.alert("Invalid Tag", "Min 3 characters.");
    setIsSaving(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const finalCode = customCodeInput.trim().toUpperCase().replace(/\s+/g, '');
        const res = await createReferralCode(token, userId!, finalCode);
        if (res.success) { setReferralCode(finalCode); }
        else { Alert.alert("Error", "This tag is already taken."); }
      }
    } catch (e) { console.error(e); } finally { setIsSaving(false); }
  };

  const handleCopyLink = async () => {
    const activeCode = (isCreator && creatorStatus === 'active' && creatorCode) ? creatorCode : referralCode;
    await Clipboard.setStringAsync(`https://fixra.ai/ref/${activeCode}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Link Copied", "Ready to paste!");
  };

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const activeCode = (isCreator && creatorStatus === 'active' && creatorCode) ? creatorCode : referralCode;
    const link = `https://fixra.ai/ref/${activeCode}`;
    const message = isCreator 
      ? `Level up with FIXRA AI! Use my official link: ${link}` 
      : `Join me on FIXRA AI and get smarter game guides! ${link}`;
    Share.share({ message: Platform.OS === 'android' ? link : message, url: Platform.OS === 'ios' ? link : undefined });
  };

  const renderWithdrawalHistory = () => {
    if (!withdrawalHistory || withdrawalHistory.length === 0) return null;
    
    return (
      <View style={{marginTop: 20}}>
        <Text style={styles.sectionLabel}>WITHDRAWAL HISTORY</Text>
        {withdrawalHistory.map((req, idx) => (
          <View key={idx} style={styles.historyCard}>
            <View>
              <Text style={{color: '#fff', fontWeight: 'bold'}}>${req.amount?.toFixed(2)}</Text>
              <Text style={{color: '#666', fontSize: 12}}>
                {new Date(req.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
               {req.status === 'pending' && <Text style={{color: '#ffaa00', fontWeight: 'bold'}}>In Review</Text>}
               {req.status === 'approved' && <Text style={{color: '#00ff88', fontWeight: 'bold'}}>Paid</Text>}
               {req.status === 'rejected' && (
                 <TouchableOpacity onPress={() => Alert.alert("Declined", req.rejection_reason || "Your request was declined. Please contact support.")}>
                   <Text style={{color: '#ff3333', fontWeight: 'bold', textDecorationLine: 'underline'}}>Declined ℹ️</Text>
                 </TouchableOpacity>
               )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalContent}>
            
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name={isCreator ? "star" : "gift"} size={24} color={themeColor} style={{ marginRight: 10 }} />
                <Text style={styles.title}>{isCreator ? 'Creator Program' : 'Invite & Earn'}</Text>
              </View>
              <View style={styles.headerActions}>
                {!showGuide && (
                  <TouchableOpacity onPress={() => setShowGuide(true)} style={[styles.iconBtn, { borderColor: themeColor, borderWidth: 1 }]}>
                    <Ionicons name="help" size={22} color={themeColor} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => { setCustomCodeInput(''); setShowWithdrawForm(false); onClose(); }} style={styles.iconBtn}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {isLoading ? ( <View style={styles.centerContent}><ActivityIndicator color={themeColor} /></View> ) : 
              
              showGuide ? (
                <View style={styles.guideContainer}>
                  <Text style={styles.guideTitle}>How It Works</Text>
                  <Text style={styles.guideSubtitle}>Follow these steps to earn dual rewards</Text>
                  <View style={styles.questTimeline}>
                    <View style={[styles.questLine, { backgroundColor: themeColor + '40' }]} />
                    <View style={styles.stepRow}>
                      <View style={[styles.stepIconWrapper, { borderColor: themeColor }]}><Ionicons name="shield-outline" size={20} color={themeColor} /></View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepTitle}>Equip Your Tag</Text>
                        <Text style={styles.stepDesc}>Claim a unique gaming handle.</Text>
                      </View>
                    </View>
                    <View style={styles.stepRow}>
                      <View style={[styles.stepIconWrapper, { borderColor: themeColor }]}><Ionicons name="megaphone-outline" size={20} color={themeColor} /></View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepTitle}>Share The Link</Text>
                        <Text style={styles.stepDesc}>Send your link to friends via WhatsApp or Discord.</Text>
                      </View>
                    </View>
                    
                    {/* סעיף הפתרונות / או סעיף הרווח ליוצרים */}
                    <View style={styles.stepRow}>
                      <View style={[styles.stepIconWrapper, { borderColor: themeColor }]}><Ionicons name="trophy-outline" size={20} color={themeColor} /></View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepTitle}>{isCreator ? "Earn Rewards" : "Unlock Free Solves"}</Text>
                        <Text style={styles.stepDesc}>
                          {isCreator 
                            ? "Earn real cash commissions for every PRO upgrade." 
                            : "Invite 5 friends to unlock 2 free Premium AI solves."}
                        </Text>
                      </View>
                    </View>

                    {/* סעיף הכסף המופרד אך ורק למצב Invite & Earn */}
                    {!isCreator && (
                      <View style={styles.stepRow}>
                        <View style={[styles.stepIconWrapper, { borderColor: themeColor }]}><Ionicons name="cash-outline" size={20} color={themeColor} /></View>
                        <View style={styles.stepTextContainer}>
                          <Text style={styles.stepTitle}>Earn Real Cash 💵</Text>
                          <Text style={styles.stepDesc}>Earn REAL CASH commissions if your friends upgrade to PRO!</Text>
                        </View>
                      </View>
                    )}
                    
                  </View>
                  <TouchableOpacity style={[styles.actionBtn, {marginTop: 20}]} onPress={() => setShowGuide(false)}>
                    <LinearGradient colors={themeGradient as [string, string]} style={styles.actionBtnGradient}>
                      <Text style={styles.actionBtnText}>Got it!</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              ) : isCreator && creatorStatus === 'none' ? (
                <View style={styles.setupContainer}>
                  <View style={[styles.iconCircle, { borderColor: themeColor }]}><Ionicons name="videocam" size={40} color={themeColor} /></View>
                  <Text style={styles.setupTitle}>Apply as Creator</Text>
                  <Text style={styles.setupDesc}>Join our Elite Creator team to earn real revenue. Our team will manually review your channel.</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>CHANNEL LINK (YouTube / TikTok / Twitch)</Text>
                    <View style={[styles.inputWrapper, { borderColor: themeColor + '40' }]}>
                      <TextInput style={styles.input} placeholder="https://..." placeholderTextColor="#666" value={creatorLinkInput} onChangeText={setCreatorLinkInput} autoCapitalize="none" />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>FOLLOWERS COUNT</Text>
                    <View style={[styles.inputWrapper, { borderColor: themeColor + '40' }]}>
                      <TextInput style={styles.input} placeholder="e.g. 50,000" placeholderTextColor="#666" value={creatorFollowersInput} onChangeText={setCreatorFollowersInput} keyboardType="numeric" />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.legalCheckRow} onPress={() => setIsTermsAccepted(!isTermsAccepted)}>
                    <View style={[styles.checkbox, isTermsAccepted && { backgroundColor: themeColor, borderColor: themeColor }]}>
                       {isTermsAccepted && <Ionicons name="checkmark" size={14} color="#000" />}
                    </View>
                    <Text style={styles.legalCheckText}>I agree to the </Text>
                    <TouchableOpacity onPress={() => setShowLegal(true)}>
                      <Text style={[styles.legalLink, { color: themeColor }]}>Creator Agreement</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionBtn} onPress={handleApplyCreator} disabled={isSaving}>
                    <LinearGradient colors={themeGradient as [string, string]} style={styles.actionBtnGradient}>
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Send Application</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              ) : isCreator && creatorStatus === 'pending' ? (
                <View style={styles.centerContent}>
                  <View style={[styles.iconCircle, { borderColor: '#ffaa00' }]}>
                    <Ionicons name="hourglass-outline" size={45} color="#ffaa00" />
                  </View>
                  <Text style={[styles.setupTitle, {color: '#ffaa00'}]}>Pending Review</Text>
                  <Text style={styles.setupDesc}>We received your application! Our partners are reviewing your channel. You'll be notified soon.</Text>
                </View>

              ) : isCreator && creatorStatus === 'blocked' ? (
                <View style={styles.centerContent}>
                  <View style={[styles.iconCircle, { borderColor: '#ff3333' }]}>
                    <Ionicons name="ban" size={45} color="#ff3333" />
                  </View>
                  <Text style={[styles.setupTitle, {color: '#ff3333'}]}>Partnership Revoked</Text>
                  <Text style={styles.setupDesc}>Your creator privileges and official code have been suspended due to a violation of our terms.</Text>
                </View>

              ) : isCreator && creatorStatus === 'active' ? (
                <View style={styles.dashboardContainer}>
                  <View style={[styles.vipCard, { shadowColor: themeColor, borderColor: themeColor, borderWidth: 1 }]}>
                    <LinearGradient colors={['rgba(255,0,204,0.15)', 'rgba(0,0,0,0.8)']} style={styles.vipCardGradient}>
                      
                      <View style={{alignItems: 'center', marginBottom: 25}}>
                        <Ionicons name="rocket" size={45} color={themeColor} style={{marginBottom: 10}} />
                        <Text style={{fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 8}}>
                          השותפות שלך אושרה! 🚀
                        </Text>
                        <Text style={{fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 15}}>
                          זה הקוד הרשמי שלך לשיווק:
                        </Text>
                        
                        <View style={{backgroundColor: themeColor, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginBottom: 15}}>
                          <Text style={{fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: 2}}>
                            {creatorCode || "PENDING"}
                          </Text>
                        </View>
                        
                        <Text style={{fontSize: 15, color: '#aaa', textAlign: 'center'}}>
                          שתף אותו עם הקהילה שלך כדי להתחיל להרוויח!
                        </Text>
                      </View>

                      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 }} />
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{flexDirection: 'row', gap: 20}}>
                          <View>
                            <Text style={styles.balanceLabel}>AVAILABLE</Text>
                            <Text style={[styles.balanceAmount, { textShadowColor: themeColor, textShadowRadius: 10, fontSize: 32 }]}>
                              ${earnings.toFixed(2)}
                            </Text>
                          </View>
                          {pendingBalance > 0 && (
                            <View>
                              <Text style={styles.balanceLabel}>PENDING 🕒</Text>
                              <Text style={[styles.balanceAmount, { color: '#ffaa00', fontSize: 22, marginTop: 5 }]}>
                                ${pendingBalance.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdrawForm(!showWithdrawForm)}>
                          <Text style={styles.withdrawText}>{showWithdrawForm ? "Cancel" : "Withdraw"}</Text>
                        </TouchableOpacity>
                      </View>

                      {showWithdrawForm && (
                        <View style={{ marginTop: 15, backgroundColor: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: themeColor }}>
                          <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>Enter your PayPal Email:</Text>
                          <TextInput 
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 10 }}
                            placeholder="creator@paypal.com"
                            placeholderTextColor="#666"
                            value={paypalEmail}
                            onChangeText={setPaypalEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                          <TouchableOpacity 
                            onPress={handleWithdrawRequest} 
                            disabled={isSaving}
                            style={{ backgroundColor: themeColor, padding: 12, borderRadius: 8, alignItems: 'center' }}
                          >
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Request ${earnings.toFixed(2)}</Text>}
                          </TouchableOpacity>
                        </View>
                      )}

                    </LinearGradient>
                  </View>
                  
                  <Text style={styles.sectionLabel}>YOUR OFFICIAL CREATOR LINK</Text>
                  <TouchableOpacity style={[styles.linkCard, { borderColor: themeColor + '40' }]} onPress={handleCopyLink}>
                    <Ionicons name="link" size={20} color={themeColor} style={{marginRight: 10}} />
                    <Text style={styles.linkText} numberOfLines={1}>fixra.ai/ref/{creatorCode}</Text>
                    <Ionicons name="copy-outline" size={20} color="#888" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionBtn, { marginTop: 20 }]} onPress={handleShare}>
                    <LinearGradient colors={themeGradient as [string, string]} style={styles.actionBtnGradient}>
                      <Ionicons name="logo-whatsapp" size={22} color="#fff" style={{ marginRight: 10 }} />
                      <Text style={styles.actionBtnText}>Share Official Link</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {renderWithdrawalHistory()}
                </View>

              ) : !referralCode ? (
                <View style={styles.setupContainer}>
                   <View style={[styles.iconCircle, { borderColor: themeColor }]}><Ionicons name="id-card" size={40} color={themeColor} /></View>
                   <Text style={styles.setupTitle}>Claim Gamer Tag</Text>
                   <Text style={styles.setupDesc}>Choose a unique name for your referral link.</Text>
                   <View style={[styles.inputWrapper, { borderColor: themeColor + '40', marginTop: 10 }]}>
                    <Text style={styles.urlPrefix}>fixra.ai/ref/</Text>
                    <TextInput style={styles.input} placeholder="NAME" placeholderTextColor="#666" value={customCodeInput} onChangeText={setCustomCodeInput} autoCapitalize="characters" maxLength={15} />
                  </View>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCreateCode} disabled={isSaving}>
                    <LinearGradient colors={themeGradient as [string, string]} style={styles.actionBtnGradient}><Text style={styles.actionBtnText}>Generate Link</Text></LinearGradient>
                  </TouchableOpacity>
                </View>

              ) : (
                <View style={styles.dashboardContainer}>
                  <View style={[styles.vipCard, { shadowColor: themeColor }]}>
                    <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.6)']} style={styles.vipCardGradient}>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showWithdrawForm ? 0 : 15 }}>
                        <View style={{flexDirection: 'row', gap: 20}}>
                          <View>
                            <Text style={styles.balanceLabel}>AVAILABLE</Text>
                            <Text style={[styles.balanceAmount, { textShadowColor: themeColor, textShadowRadius: 10, fontSize: 38 }]}>
                              ${earnings.toFixed(2)}
                            </Text>
                          </View>
                          {pendingBalance > 0 && (
                            <View>
                              <Text style={styles.balanceLabel}>PENDING 🕒</Text>
                              <Text style={[styles.balanceAmount, { color: '#ffaa00', fontSize: 24, marginTop: 10 }]}>
                                ${pendingBalance.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                        <TouchableOpacity style={styles.withdrawBtn} onPress={() => setShowWithdrawForm(!showWithdrawForm)}>
                          <Text style={styles.withdrawText}>{showWithdrawForm ? "Cancel" : "Withdraw"}</Text>
                        </TouchableOpacity>
                      </View>

                      {showWithdrawForm && (
                        <View style={{ marginTop: 15, marginBottom: 15, backgroundColor: 'rgba(0,0,0,0.4)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: themeColor }}>
                          <Text style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>Enter your PayPal Email:</Text>
                          <TextInput 
                            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 10, borderRadius: 8, marginBottom: 10 }}
                            placeholder="user@paypal.com"
                            placeholderTextColor="#666"
                            value={paypalEmail}
                            onChangeText={setPaypalEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                          />
                          <TouchableOpacity 
                            onPress={handleWithdrawRequest} 
                            disabled={isSaving}
                            style={{ backgroundColor: themeColor, padding: 12, borderRadius: 8, alignItems: 'center' }}
                          >
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Request ${earnings.toFixed(2)}</Text>}
                          </TouchableOpacity>
                        </View>
                      )}

                      {!isCreator && <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 15 }} />}

                      {!isCreator && (
                        <View>
                          <Text style={styles.balanceLabel}>VAULT: BONUS SOLVES</Text>
                          <Text style={[styles.balanceAmount, { textShadowColor: themeColor, textShadowRadius: 10, fontSize: 38, marginBottom: 10 }]}>
                            {bonusSolves} <Text style={{fontSize: 16}}>AI</Text>
                          </Text>

                          {canClaimReward ? (
                            <TouchableOpacity onPress={handleClaimReward} disabled={isSaving}>
                              <LinearGradient colors={['#ffaa00', '#ff5500']} style={{paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, alignSelf: 'flex-start'}}>
                                {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>🎁 CLAIM 2 FREE SOLVES!</Text>}
                              </LinearGradient>
                            </TouchableOpacity>
                          ) : (
                            <Text style={{color: '#aaa', fontSize: 13, fontWeight: 'bold'}}>
                              🎯 Goal: {unclaimedInvites}/5 Invites to next reward
                            </Text>
                          )}
                        </View>
                      )}

                      <View style={[styles.cardBottomRow, {marginTop: 20}]}>
                        <View style={styles.tagPill}><Text style={styles.cardTagText}>{referralCode}</Text></View>
                      </View>
                    </LinearGradient>
                  </View>
                  
                  <Text style={styles.sectionLabel}>YOUR LINK</Text>
                  <TouchableOpacity style={[styles.linkCard, { borderColor: themeColor + '40' }]} onPress={handleCopyLink}>
                    <Ionicons name="link" size={20} color={themeColor} style={{marginRight: 10}} />
                    <Text style={styles.linkText} numberOfLines={1}>fixra.ai/ref/{referralCode}</Text>
                    <Ionicons name="copy-outline" size={20} color="#888" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={[styles.actionBtn, { marginTop: 20 }]} onPress={handleShare}>
                    <LinearGradient colors={themeGradient as [string, string]} style={styles.actionBtnGradient}>
                      <Ionicons name="logo-whatsapp" size={22} color="#fff" style={{ marginRight: 10 }} />
                      <Text style={styles.actionBtnText}>{isCreator ? 'Share Creator Link' : 'Share with Friends'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {renderWithdrawalHistory()}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showLegal} animationType="fade" transparent>
        <View style={styles.legalOverlay}>
          <View style={styles.legalContent}>
            <Text style={styles.legalTitle}>Creator Agreement</Text>
            <ScrollView style={styles.legalScroll}>
              <Text style={styles.legalText}>
                <Text style={styles.bold}>1. Brand Protection:</Text> Creators agree to promote FIXRA in a professional manner. Any association with hate speech, racism, or antisemitism will result in immediate termination.{'\n\n'}
                <Text style={styles.bold}>2. Integrity:</Text> Fraudulent activity or misleading followers regarding AI capabilities is strictly prohibited.{'\n\n'}
                <Text style={styles.bold}>3. Disassociation:</Text> FIXRA (The Company) reserves the right to terminate any creator partnership immediately and revoke pending balances if the creator’s actions harm the brand's reputation.{'\n\n'}
                <Text style={styles.bold}>4. Payments:</Text> Commissions are paid via PayPal after manual verification of traffic quality.
              </Text>
            </ScrollView>
            <TouchableOpacity style={[styles.actionBtn, {marginTop: 20}]} onPress={() => setShowLegal(false)}>
              <LinearGradient colors={['#333', '#000']} style={styles.actionBtnGradient}><Text style={styles.actionBtnText}>Close</Text></LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContentWrapper: { width: '100%', maxHeight: '92%' },
  modalContent: { backgroundColor: '#0a0026', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', minHeight: '70%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginLeft: 10 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300, paddingHorizontal: 30 },
  setupContainer: { flex: 1, alignItems: 'center', paddingTop: 10 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2 },
  setupTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 12, textAlign: 'center' },
  setupDesc: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 30, lineHeight: 22 },
  inputGroup: { width: '100%', marginBottom: 20 },
  inputLabel: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, marginLeft: 5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, paddingHorizontal: 20, height: 60, borderWidth: 1 },
  urlPrefix: { color: '#666', fontSize: 16, fontWeight: 'bold' },
  input: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '900', height: '100%', letterSpacing: 1 },
  legalCheckRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 30, marginTop: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  legalCheckText: { color: '#888', fontSize: 14 },
  legalLink: { fontSize: 14, fontWeight: 'bold', textDecorationLine: 'underline' },
  actionBtn: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  actionBtnGradient: { paddingVertical: 18, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  dashboardContainer: { flex: 1 },
  vipCard: { width: '100%', borderRadius: 24, marginBottom: 30, elevation: 15 },
  vipCardGradient: { padding: 25, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  balanceLabel: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  balanceAmount: { color: '#fff', fontWeight: '900', letterSpacing: -1 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  tagPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  cardTagText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  withdrawBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff', borderRadius: 12 },
  withdrawText: { color: '#000', fontSize: 12, fontWeight: '900' },
  sectionLabel: { color: '#888', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10, marginLeft: 5 },
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, paddingHorizontal: 20, height: 60, marginBottom: 20, borderWidth: 1 },
  linkText: { flex: 1, color: '#fff', fontSize: 15, fontWeight: 'bold' },
  guideContainer: { flex: 1, paddingTop: 10 },
  guideTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
  guideSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 40, marginTop: 5 },
  questTimeline: { paddingLeft: 10, position: 'relative' },
  questLine: { position: 'absolute', left: 32, top: 20, bottom: 40, width: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 35 },
  stepIconWrapper: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#050012', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 2 },
  stepTextContainer: { flex: 1, paddingTop: 2 },
  stepTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 6 },
  stepDesc: { fontSize: 14, color: '#aaa', lineHeight: 20 },
  legalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', padding: 25 },
  legalContent: { backgroundColor: '#111', borderRadius: 30, padding: 25, width: '100%', borderWidth: 1, borderColor: '#333' },
  legalTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 20, textAlign: 'center' },
  legalScroll: { maxHeight: 300 },
  legalText: { color: '#ccc', fontSize: 15, lineHeight: 24 },
  bold: { fontWeight: 'bold', color: '#fff' },
  historyCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }
});