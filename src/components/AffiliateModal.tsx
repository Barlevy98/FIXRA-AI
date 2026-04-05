import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Share, Platform, KeyboardAvoidingView, Linking } from 'react-native';
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
  const [showGuide, setShowGuide] = useState(false); // הסטייט החדש שמנהל את מסך ההדרכה
  
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<number>(0);
  const [customCodeInput, setCustomCodeInput] = useState('');
  
  const isCreator = mode === 'creator';
  const themeColor = isCreator ? '#ff00cc' : '#00e5ff';

  useEffect(() => {
    if (visible && userId) {
      setShowGuide(false); // תמיד נאפס את מסך ההדרכה כשפותחים מחדש
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

  // --- הפונקציה שמרנדרת את מסך ההדרכה החדש ---
  const renderGuide = () => (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>How it works?</Text>

      <View style={styles.stepRow}>
        <View style={[styles.stepNumber, { backgroundColor: themeColor + '20' }]}>
          <Text style={[styles.stepNumberText, { color: themeColor }]}>1</Text>
        </View>
        <View style={styles.stepTextContainer}>
          <Text style={styles.stepTitle}>Create your Tag</Text>
          <Text style={styles.stepDesc}>Choose a unique gaming nickname to generate your personal link.</Text>
        </View>
      </View>

      <View style={styles.stepRow}>
        <View style={[styles.stepNumber, { backgroundColor: themeColor + '20' }]}>
          <Text style={[styles.stepNumberText, { color: themeColor }]}>2</Text>
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
        <View style={[styles.stepNumber, { backgroundColor: themeColor + '20' }]}>
          <Text style={[styles.stepNumberText, { color: themeColor }]}>3</Text>
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

      <View style={{ flex: 1 }} />

      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowGuide(false)}>
        <LinearGradient colors={isCreator ? ['#ff00cc', '#8a2be2'] : ['#00e5ff', '#0055ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
          <Text style={styles.actionBtnText}>Got it!</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContentWrapper}>
          <LinearGradient colors={['#0a0026', '#050012', '#000000']} style={styles.modalContent}>
            
            {/* Header (עם כפתור ההדרכה החדש) */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name={isCreator ? "star" : "gift"} size={24} color={themeColor} style={{ marginRight: 10 }} />
                <Text style={styles.title}>{isCreator ? 'Creator Program' : 'Invite Friends'}</Text>
              </View>
              <View style={styles.headerActions}>
                {!showGuide && (
                  <TouchableOpacity onPress={() => setShowGuide(true)} style={styles.iconBtn}>
                    <Ionicons name="help-circle-outline" size={26} color="#aaaaaa" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={closeAndVibrate} style={styles.iconBtn}>
                  <Ionicons name="close" size={28} color="#aaaaaa" />
                </TouchableOpacity>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color={themeColor} />
              </View>
            ) : showGuide ? (
              
              // --- מציג את מסך ההדרכה אם הסטייט דלוק ---
              renderGuide()

            ) : !referralCode ? (
              
              // --- מצב 1: למשתמש עדיין אין קוד ---
              <View style={styles.setupContainer}>
                <View style={styles.iconCircle}>
                  <Ionicons name="game-controller-outline" size={40} color={themeColor} />
                </View>
                <Text style={styles.setupTitle}>Claim Your Gamer Tag</Text>
                <Text style={styles.setupDesc}>
                  {isCreator 
                    ? "Create your unique link to start earning real money from your followers." 
                    : "Create your unique link to share with friends and unlock free PRO messages."}
                </Text>
                
                <View style={styles.inputWrapper}>
                  <Text style={styles.urlPrefix}>fixra.ai/ref/</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="YOUR_NAME"
                    placeholderTextColor="#555"
                    value={customCodeInput}
                    onChangeText={setCustomCodeInput}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                </View>
                
                <TouchableOpacity style={styles.actionBtn} onPress={handleCreateCode} disabled={isSaving}>
                  <LinearGradient colors={isCreator ? ['#ff00cc', '#8a2be2'] : ['#00e5ff', '#0055ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Generate Link</Text>}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            ) : (
              
              // --- מצב 2: למשתמש יש קוד (Dashboard) ---
              <View style={styles.dashboardContainer}>
                
                <View style={[styles.balanceCard, { borderColor: isCreator ? 'rgba(255, 0, 204, 0.3)' : 'rgba(0, 229, 255, 0.3)' }]}>
                  <Text style={styles.balanceLabel}>{isCreator ? 'TOTAL EARNINGS' : 'REWARD BALANCE'}</Text>
                  <Text style={styles.balanceAmount}>
                    {isCreator ? `$${earnings.toFixed(2)}` : `${earnings} MSG`}
                  </Text>
                  {isCreator && (
                    <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw}>
                      <Text style={styles.withdrawText}>Withdraw Funds</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.sectionLabel}>YOUR UNIQUE LINK</Text>
                <View style={styles.linkCard}>
                  <Text style={styles.linkText} numberOfLines={1}>fixra.ai/ref/{referralCode}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyLink}>
                    <Ionicons name="copy-outline" size={20} color={themeColor} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
                  <LinearGradient colors={isCreator ? ['#ff00cc', '#8a2be2'] : ['#00e5ff', '#0055ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.actionBtnGradient}>
                    <Ionicons name="share-social" size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.actionBtnText}>Share Now</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* הורדנו את ה-infoBox הישן כי יש לנו עכשיו מסך הדרכה ייעודי */}

              </View>
            )}

          </LinearGradient>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContentWrapper: { width: '100%', height: '75%' },
  modalContent: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, borderWidth: 1, borderColor: '#333', borderBottomWidth: 0 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, marginLeft: 10 },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  setupContainer: { flex: 1, alignItems: 'center', paddingTop: 10 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  setupTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  setupDesc: { fontSize: 15, color: '#aaa', textAlign: 'center', marginBottom: 40, paddingHorizontal: 10, lineHeight: 22 },
  
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingHorizontal: 15, width: '100%', height: 60, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  urlPrefix: { color: '#888', fontSize: 16, fontWeight: '500' },
  input: { flex: 1, color: '#fff', fontSize: 16, fontWeight: 'bold', height: '100%' },
  
  dashboardContainer: { flex: 1, paddingTop: 10 },
  balanceCard: { width: '100%', padding: 25, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, alignItems: 'center', marginBottom: 30 },
  balanceLabel: { color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 8 },
  balanceAmount: { color: '#fff', fontSize: 48, fontWeight: '900' },
  withdrawBtn: { marginTop: 15, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  withdrawText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  
  sectionLabel: { color: '#aaa', fontSize: 12, fontWeight: 'bold', letterSpacing: 1.5, marginBottom: 10, marginLeft: 5 },
  linkCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingLeft: 20, paddingRight: 5, height: 60, marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  linkText: { flex: 1, color: '#fff', fontSize: 16, fontWeight: '500' },
  copyBtn: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  
  actionBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  actionBtnGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

  // סגנונות חדשים למסך ההדרכה
  guideContainer: { flex: 1, paddingTop: 10 },
  guideTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingRight: 10 },
  stepNumber: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  stepNumberText: { fontSize: 18, fontWeight: 'bold' },
  stepTextContainer: { flex: 1 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  stepDesc: { fontSize: 14, color: '#aaa', lineHeight: 20 },
});