import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Share, Platform, KeyboardAvoidingView, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@clerk/clerk-expo';
import { getUserAffiliateData, createReferralCode } from '../utils/db';

interface AffiliateModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'invite' | 'creator';
}

export default function AffiliateModal({ visible, onClose, mode }: AffiliateModalProps) {
  const { getToken, userId } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false); 
  
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<number>(0);
  const [customCodeInput, setCustomCodeInput] = useState('');
  
  const [isInputFocused, setIsInputFocused] = useState(false);

  const isCreator = mode === 'creator';
  const themeColor = isCreator ? '#ff00cc' : '#00e5ff';
  const themeGradient = isCreator ? ['#ff00cc', '#b300ff'] : ['#00e5ff', '#007acc'];

  useEffect(() => {
    if (visible && userId) {
      setShowGuide(false); 
      loadData();
    }
  }, [visible, userId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const data = await getUserAffiliateData(token, userId!);
        if (data && data.referral_code) {
          setReferralCode(data.referral_code);
          setEarnings(data.earnings_balance || 0);
        } else {
          setReferralCode(null);
        }
      }
    } catch (e) {
      console.error('Error loading affiliate data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (customCodeInput.trim().length < 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert("Code must be at least 3 characters.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const finalCode = customCodeInput.trim().toUpperCase().replace(/\s+/g, '');
        const res = await createReferralCode(token, userId!, finalCode);
        
        if (res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setReferralCode(finalCode);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          alert(res.error === 'Code already taken' ? "This tag is already taken. Choose another!" : "Error saving code.");
        }
      }
    } catch (e) {
      console.error("Error creating code", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = async () => {
    const link = `https://fixra.ai/ref/${referralCode}`;
    await Clipboard.setStringAsync(link);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    alert("Link copied to clipboard! 📋");
  };

  const handleShare = async () => {
    const link = `https://fixra.ai/ref/${referralCode}`;
    const message = isCreator 
      ? `Check out FIXRA AI for gaming guides! Use my link: ${link}`
      : `I'm using FIXRA to solve levels! Use my link to get a PRO discount: ${link}`;
      
    try {
      await Share.share({
        message: Platform.OS === 'android' ? link : message,
        url: Platform.OS === 'ios' ? link : undefined,
        title: 'Share FIXRA'
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleWithdraw = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (earnings <= 0) {
      alert("You need a balance of at least $1 to withdraw funds.");
      return;
    }
    
    const email = 'fixra.partners@gmail.com'; 
    const subject = `Withdrawal Request - Creator: ${referralCode}`;
    const body = `Hello FIXRA Team,\n\nI am a creator with the tag "${referralCode}".\nI have a balance of $${earnings.toFixed(2)} and would like to request a withdrawal to my PayPal account.\n\nMy PayPal email is: [ENTER PAYPAL EMAIL HERE]\n\nThank you!`;
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        alert(`Could not open email app. Please email us directly at ${email}`);
      }
    } catch (error) {
      console.error('Error opening email client', error);
    }
  };

  const closeAndVibrate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomCodeInput(''); 
    onClose();
  };

  // 🌟 מסך הדרכה (Quest Log Style) 🌟
  const renderGuide = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>Quest Objectives</Text>
      <Text style={styles.guideSubtitle}>Complete these steps to unlock rewards</Text>

      <View style={styles.questTimeline}>
        <View style={styles.questLine} />
        
        <View style={styles.stepRow}>
          <View style={[styles.stepIconWrapper, { borderColor: themeColor, shadowColor: themeColor }]}>
            <Ionicons name="pricetag" size={20} color={themeColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepTitle}>Claim Your Tag</Text>
            <Text style={styles.stepDesc}>Choose a unique gaming nickname to generate your personal link.</Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepIconWrapper, { borderColor: themeColor, shadowColor: themeColor }]}>
            <Ionicons name="share-social" size={20} color={themeColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepTitle}>{isCreator ? "Share & Earn" : "Invite Friends"}</Text>
            <Text style={styles.stepDesc}>
              {isCreator 
                ? "Share your link on TikTok or YouTube. You get a 20% commission for every PRO upgrade." 
                : "Send your link via WhatsApp or Discord to your gaming buddies."}
            </Text>
          </View>
        </View>

        <View style={styles.stepRow}>
          <View style={[styles.stepIconWrapper, { borderColor: themeColor, shadowColor: themeColor }]}>
            <Ionicons name={isCreator ? "wallet" : "flash"} size={20} color={themeColor} />
          </View>
          <View style={styles.stepTextContainer}>
            <Text style={styles.stepTitle}>{isCreator ? "Get Paid" : "Get Rewarded"}</Text>
            <Text style={styles.stepDesc}>
              {isCreator 
                ? "Accumulate earnings and withdraw real money directly to your PayPal account." 
                : "Whenever a friend upgrades using your link, you instantly get 100 free PRO messages!"}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} />

      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowGuide(false)}>
        <LinearGradient colors={themeGradient as [string, string]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
          <Text style={styles.actionBtnText}>Accept Quest</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      {/* 🌟 עטפנו את כל המסך ב-KeyboardAvoidingView כדי לטפל במקלדת 🌟 */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalContentWrapper}>
          <View style={styles.modalContent}>
            
            {/* Header נשאר מחוץ ל-ScrollView כדי שיישאר תמיד למעלה */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name={isCreator ? "star" : "gift"} size={24} color={themeColor} style={{ marginRight: 10 }} />
                <Text style={styles.title}>{isCreator ? 'Creator Program' : 'Invite Friends'}</Text>
              </View>
              <View style={styles.headerActions}>
                {!showGuide && (
                  <TouchableOpacity onPress={() => setShowGuide(true)} style={styles.iconBtn}>
                    <Ionicons name="help-circle" size={26} color="#aaaaaa" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeAndVibrate} style={styles.iconBtn}>
                  <Ionicons name="close" size={28} color="#aaaaaa" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 🌟 עטפנו את התוכן הפנימי ב-ScrollView שמאפשר גלילה מעל המקלדת 🌟 */}
            <ScrollView 
              contentContainerStyle={{ flexGrow: 1 }} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {isLoading ? (
                <View style={styles.centerContent}>
                  <ActivityIndicator size="large" color={themeColor} />
                </View>
              ) : showGuide ? (
                
                renderGuide()

              ) : !referralCode ? (
                
                // 🌟 מצב 1: יצירת תג 🌟
                <View style={styles.setupContainer}>
                  <View style={[styles.iconCircle, { shadowColor: themeColor, borderColor: themeColor }]}>
                    <Ionicons name="game-controller" size={40} color={themeColor} />
                  </View>
                  <Text style={styles.setupTitle}>Claim Your Gamer Tag</Text>
                  <Text style={styles.setupDesc}>
                    {isCreator 
                      ? "Create your unique link to start earning real money from your followers." 
                      : "Create your unique link to share with friends and unlock free PRO messages."}
                  </Text>
                  
                  <View style={[styles.inputWrapper, isInputFocused && { borderColor: themeColor, shadowColor: themeColor, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.5, shadowRadius: 10 }]}>
                    <Text style={styles.urlPrefix}>fixra.ai/ref/</Text>
                    <TextInput 
                      style={styles.input}
                      placeholder="YOUR_NAME"
                      placeholderTextColor="#666"
                      value={customCodeInput}
                      onChangeText={setCustomCodeInput}
                      autoCapitalize="characters"
                      maxLength={15}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                    />
                  </View>
                  
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCreateCode} disabled={isSaving}>
                    <LinearGradient colors={themeGradient as [string, string]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
                      {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Generate Link</Text>}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

              ) : (
                
                // 🌟 מצב 2: ה-Dashboard 🌟
                <View style={styles.dashboardContainer}>
                  
                  <LinearGradient 
                    colors={['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.8)']} 
                    style={[styles.vipCard, { borderColor: themeColor }]}
                  >
                    <Ionicons name="planet" size={120} color="rgba(255,255,255,0.02)" style={styles.cardWatermark} />
                    
                    <View style={styles.cardTopRow}>
                      <Text style={styles.balanceLabel}>{isCreator ? 'TOTAL EARNINGS' : 'REWARD BALANCE'}</Text>
                      <Ionicons name={isCreator ? "diamond" : "flash"} size={20} color={themeColor} />
                    </View>
                    
                    <Text style={styles.balanceAmount}>
                      {isCreator ? `$${earnings.toFixed(2)}` : `${earnings} MSG`}
                    </Text>
                    
                    <View style={styles.cardBottomRow}>
                      <Text style={styles.cardTagText}>{referralCode}</Text>
                      {isCreator && (
                        <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
                          <Text style={styles.withdrawText}>Withdraw</Text>
                          <Ionicons name="arrow-forward" size={14} color="#fff" style={{marginLeft: 5}} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>

                  <Text style={styles.sectionLabel}>YOUR UNIQUE LINK</Text>
                  <View style={[styles.linkCard, { borderColor: themeColor + '50' }]}>
                    <Ionicons name="link" size={20} color="#888" style={{marginRight: 10}} />
                    <Text style={styles.linkText} numberOfLines={1}>fixra.ai/ref/{referralCode}</Text>
                    <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
                      <Ionicons name="copy" size={20} color={themeColor} />
                    </TouchableOpacity>
                  </View>

                  <View style={{flex: 1}} />

                  <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                    <LinearGradient colors={themeGradient as [string, string]} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
                      <Ionicons name="share-social" size={22} color="#fff" style={{ marginRight: 10 }} />
                      <Text style={styles.actionBtnText}>Share Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                </View>
              )}
            </ScrollView>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  // 🌟 גובה מקסימלי שמאפשר למקלדת לדחוף את התוכן למעלה 🌟
  modalContentWrapper: { width: '100%', maxHeight: '85%' },
  modalContent: { backgroundColor: '#050012', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 0, minHeight: '60%' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, marginLeft: 10 },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  
  // 🌟 יצירת התג 🌟
  setupContainer: { flex: 1, alignItems: 'center', paddingTop: 20, paddingBottom: 20 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 2, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.5, shadowRadius: 15 },
  setupTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 12, letterSpacing: 0.5 },
  setupDesc: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 40, paddingHorizontal: 15, lineHeight: 22 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, paddingHorizontal: 20, width: '100%', height: 65, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  urlPrefix: { color: '#888', fontSize: 17, fontWeight: '600' },
  input: { flex: 1, color: '#fff', fontSize: 17, fontWeight: '900', height: '100%', letterSpacing: 1 },
  
  // 🌟 VIP Dashboard 🌟
  dashboardContainer: { flex: 1, paddingTop: 10, paddingBottom: 20 },
  vipCard: { width: '100%', padding: 25, borderRadius: 25, borderWidth: 1, marginBottom: 35, position: 'relative', overflow: 'hidden', shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  cardWatermark: { position: 'absolute', right: -20, bottom: -20, transform: [{rotate: '-15deg'}] },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  balanceLabel: { color: '#aaa', fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  balanceAmount: { color: '#fff', fontSize: 52, fontWeight: '900', marginBottom: 25, letterSpacing: -1 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardTagText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 'bold', letterSpacing: 3, textTransform: 'uppercase' },
  withdrawBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  withdrawText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  
  sectionLabel: { color: '#888', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10, marginLeft: 5 },
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 18, paddingLeft: 20, paddingRight: 8, height: 65, marginBottom: 20, borderWidth: 1 },
  linkText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '600' },
  copyBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14 },
  
  actionBtn: { width: '100%', borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  actionBtnGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  // 🌟 Quest Log (המדריך) 🌟
  guideContainer: { flex: 1, paddingTop: 10, paddingBottom: 20 },
  guideTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: 1 },
  guideSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 35, marginTop: 5 },
  questTimeline: { paddingLeft: 10, position: 'relative' },
  questLine: { position: 'absolute', left: 32, top: 20, bottom: 40, width: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 35 },
  stepIconWrapper: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#050012', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 2, shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.5, shadowRadius: 10 },
  stepTextContainer: { flex: 1, paddingTop: 2 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#aaa', lineHeight: 22 },
});