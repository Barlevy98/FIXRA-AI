import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <--- התיקון כאן
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePaywall } from '../context/PaywallContext';
import { getTranslation } from '../utils/translations'; 
import AffiliateModal from './AffiliateModal'; 

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}

const LANGUAGES = [
  { id: 'English', label: 'English', icon: '🇺🇸' },
  { id: 'Hebrew', label: 'עברית', icon: '🇮🇱' },
  { id: 'Russian', label: 'Русский', icon: '🇷🇺' },
  { id: 'Arabic', label: 'العربية', icon: '🇦🇪' }
];

export default function ProfileModal({ visible, onClose, onOpenPaywall }: ProfileModalProps) {
  const { user } = useUser();
  const insets = useSafeAreaInsets(); // <--- הוספנו את המדידה של המסך
  const { signOut } = useAuth();
  
  const { isPro, currentPlan, chatLanguage, changeLanguage, resetToFree } = usePaywall();
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  
  // סטייטים עבור תוכנית השותפים
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [affiliateMode, setAffiliateMode] = useState<'invite' | 'creator'>('invite');

  const t = getTranslation(chatLanguage);
  
  const currentLangObj = LANGUAGES.find(l => l.id === chatLanguage) || LANGUAGES[0];

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const selectLanguage = (langId: string) => {
    changeLanguage(langId);
    setShowLangMenu(false);
  };

  const handleOpenStore = () => {
    setShowPlanDetails(false); 
    
    setTimeout(() => {
      onClose(); 
      
      setTimeout(() => {
        onOpenPaywall();
      }, 500); 
    }, 50);
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure? Your plan will remain active until the end of your current billing cycle (one full month from your exact purchase date).\n\nThere are no refunds for partial months. You will not be charged again.",
      [
        { text: "Keep Plan", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: () => {
            resetToFree(); 
            setShowPlanDetails(false);
            Alert.alert("Cancelled", "Your subscription has been cancelled and will not renew next month.");
          }
        }
      ]
    );
  };

  const getActivePlanFeatures = () => {
    switch(currentPlan) {
      case 'PREMIUM': 
        return ['Unlimited mission solves', 'AI help (video + image + text)', 'Unlimited guide links', 'No ads', 'Fastest results ⚡', 'Priority processing'];
      case 'PRO_monthly':
      case 'PRO_onetime': 
        return ['50 mission solves per month', 'AI help (image + text input)', '3 guide links per solution', 'Priority support'];
      default: 
        return ['3 free messages per day', 'Basic AI help', 'Ads included'];
    }
  };

  const getDisplayPlanName = () => {
    if (currentPlan === 'PREMIUM') return 'PREMIUM Plan';
    if (currentPlan.startsWith('PRO')) return 'PRO Plan';
    return 'Free Tier';
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        {/* התיקון כאן: החלפנו את ה-SafeAreaView ב-View רגיל שדוחף את התוכן למטה */}
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.content}>
            
            {/* Header / כפתור חזרה */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="chevron-down" size={28} color="#aaaaaa" />
                <Text style={styles.closeBtnText}>{t.profileBack}</Text>
              </TouchableOpacity>
            </View>

            {/* אזור פרופיל / תמונה */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#6366f1" />
                  </View>
                )}
                {isPro && (
                  <View style={styles.proBadge}>
                    <Ionicons name="star" size={12} color="#fff" />
                  </View>
                )}
              </View>
              <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
              <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              
              {/* --- אזור הסטטוס מנוי --- */}
              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>{t.profileStatus}</Text>
                
                <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPlanDetails(true)}>
                  {isPro ? (
                    <View style={[styles.glassCard, styles.glassCardPro]}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="diamond" size={24} color="#00e5ff" />
                        <Text style={styles.proTitle}>FIXRA PREMIUM</Text>
                      </View>
                      <Text style={styles.statsTextPro}>Active Plan</Text>
                      <Text style={styles.statsSubText}>Unlimited Access</Text>
                      <Ionicons name="chevron-forward" size={20} color="#00e5ff" style={styles.chevronRightAbs} />
                    </View>
                  ) : (
                    <View style={styles.glassCard}>
                      <View style={styles.cardHeader}>
                        <Ionicons name="cube-outline" size={24} color="#aaaaaa" />
                        <Text style={styles.freeTitle}>CURRENT PLAN</Text>
                      </View>
                      <Text style={styles.statsTextPro}>
                        {getDisplayPlanName()}
                      </Text>
                      <Text style={styles.statsText}>
                        {currentPlan === 'Free' ? '3 Free Messages Daily' : 'Enhanced Features'}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#aaaaaa" style={styles.chevronRightAbs} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* --- אזור תוכנית שותפים (Earn with Fixra) --- */}
              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Earn with Fixra</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={() => { setAffiliateMode('invite'); setShowAffiliateModal(true); }}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="gift-outline" size={22} color="#00e5ff" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Invite Friends</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <View style={styles.badgeNew}><Text style={styles.badgeNewText}>GET PRO</Text></View>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, {marginTop: 10}]} onPress={() => { setAffiliateMode('creator'); setShowAffiliateModal(true); }}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="star-outline" size={22} color="#ff00cc" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Creator Program</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <View style={styles.badgeEarn}><Text style={styles.badgeEarnText}>EARN $$$</Text></View>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* --- אזור ההגדרות (שפה + תנאי שימוש) --- */}
              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>{t.profileSettings}</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={() => setShowLangMenu(true)}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="globe-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>{t.profileLang}</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Text style={styles.currentLangText}>{currentLangObj.icon} {currentLangObj.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, {marginTop: 10}]} onPress={() => setShowTermsModal(true)}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="document-text-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Terms & Privacy</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* כפתור החנות הרגיל */}
              {!isPro && (
                <TouchableOpacity style={styles.storeButton} onPress={handleOpenStore}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.storeButtonGradient}>
                    <Ionicons name="cart-outline" size={20} color="#ffffff" style={styles.btnIcon} />
                    <Text style={styles.storeButtonText}>{t.profileStore}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* כפתור יציאה */}
              <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color="#ff4444" style={styles.btnIcon} />
                <Text style={styles.logoutButtonText}>{t.profileLogout}</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>

          {/* --- חלונות קופצים (Modals) --- */}

          {/* 1. מודל בחירת שפה */}
          <Modal animationType="slide" transparent={true} visible={showLangMenu} onRequestClose={() => setShowLangMenu(false)}>
            <View style={styles.bottomSheetOverlay}>
              <View style={styles.bottomSheet}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{t.profileLang}</Text>
                  <TouchableOpacity onPress={() => setShowLangMenu(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={28} color="#555" />
                  </TouchableOpacity>
                </View>
                
                {LANGUAGES.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.langOption, chatLanguage === item.id && styles.langOptionActive]}
                    onPress={() => selectLanguage(item.id)}
                  >
                    <Text style={styles.langOptionIcon}>{item.icon}</Text>
                    <Text style={[styles.langOptionText, chatLanguage === item.id && styles.langOptionTextActive]}>{item.label}</Text>
                    {chatLanguage === item.id && <Ionicons name="checkmark" size={24} color="#ff00cc" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>

          {/* 2. מודל תנאי שימוש */}
          <Modal animationType="slide" transparent={true} visible={showTermsModal} onRequestClose={() => setShowTermsModal(false)}>
            <View style={styles.bottomSheetOverlay}>
              <View style={[styles.bottomSheet, { height: '80%' }]}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Terms & Privacy</Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={28} color="#555" />
                  </TouchableOpacity>
                </View>
                
                <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.termsText}>
                    <Text style={styles.boldText}>1. Acceptance of Terms</Text>{'\n'}
                    By accessing and using FIXRA, you accept and agree to be bound by the terms and provision of this agreement.{'\n\n'}
                    
                    <Text style={styles.boldText}>2. Use of AI Features</Text>{'\n'}
                    Our AI provides gaming hints and walkthroughs. While we strive for accuracy, FIXRA is not responsible for any progression loss or incorrect game guidance.{'\n\n'}
                    
                    <Text style={styles.boldText}>3. Privacy & Data</Text>{'\n'}
                    We process your chat history and uploaded media solely to provide you with the best gaming solutions. We do not share your personal data with third parties.{'\n\n'}
                    
                    <Text style={styles.boldText}>4. Subscriptions & Payments</Text>{'\n'}
                    Purchases made through FIXRA PRO or specific message packages are billed securely. You can manage your subscription at any time.{'\n\n'}
                    
                    <Text style={styles.boldText}>5. User Conduct</Text>{'\n'}
                    You agree not to use the service for any unlawful purpose or to upload explicit or harmful content to the AI system.
                  </Text>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* 3. מודל פרטי חבילה וניהול מנוי */}
          <Modal animationType="slide" transparent={true} visible={showPlanDetails} onRequestClose={() => setShowPlanDetails(false)}>
            <View style={styles.bottomSheetOverlay}>
              <View style={[styles.bottomSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Plan Details</Text>
                  <TouchableOpacity onPress={() => setShowPlanDetails(false)} style={styles.bottomSheetClose}>
                    <Ionicons name="close-circle" size={28} color="#555" />
                  </TouchableOpacity>
                </View>

                <View style={styles.planDetailsCard}>
                  <Text style={styles.planDetailsTitle}>
                    {getDisplayPlanName()}
                  </Text>
                  <View style={styles.planFeaturesList}>
                    {getActivePlanFeatures().map((feature, index) => (
                      <View key={index} style={styles.planFeatureRow}>
                        <Ionicons name="checkmark-circle" size={20} color="#00e5ff" style={{marginRight: 10}} />
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {currentPlan !== 'Free' ? (
                  <TouchableOpacity style={styles.cancelPlanBtn} onPress={handleCancelSubscription}>
                    <Text style={styles.cancelPlanBtnText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.upgradePlanBtn} onPress={handleOpenStore}>
                    <Text style={styles.upgradePlanBtnText}>Upgrade Plan</Text>
                  </TouchableOpacity>
                )}
                
              </View>
            </View>
          </Modal>

          {/* 4. מודל תוכנית השותפים האמיתי שמחובר לדאטה בייס */}
          <AffiliateModal 
            visible={showAffiliateModal} 
            onClose={() => setShowAffiliateModal(false)} 
            mode={affiliateMode} 
          />

        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 0 },
  
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingRight: 15 },
  closeBtnText: { color: '#aaaaaa', fontSize: 16, marginLeft: 5, fontWeight: '500' },
  
  profileSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#8a2be2' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1e1e1e', borderWidth: 3, borderColor: '#8a2be2', alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#ff00cc', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a0026' },
  name: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 5 },
  email: { fontSize: 15, color: '#aaaaaa' },

  cardWrapper: { width: '100%', marginBottom: 25 },
  sectionTitle: { color: '#aaaaaa', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  
  glassCard: { padding: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', position: 'relative' },
  glassCardPro: { borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 1.5 },
  chevronRightAbs: { position: 'absolute', right: 20, top: '50%', transform: [{translateY: -10}] },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  freeTitle: { color: '#aaaaaa', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  proTitle: { color: '#00e5ff', fontSize: 18, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 },
  
  statsTextPro: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  statsText: { color: '#aaaaaa', fontSize: 14 },
  statsSubText: { color: '#00e5ff', fontSize: 13, opacity: 0.8 },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center' },
  currentLangText: { color: '#aaaaaa', fontSize: 16, marginRight: 8 },

  badgeNew: { backgroundColor: 'rgba(0, 229, 255, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' },
  badgeNewText: { color: '#00e5ff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  badgeEarn: { backgroundColor: 'rgba(255, 0, 204, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: 'rgba(255, 0, 204, 0.3)' },
  badgeEarnText: { color: '#ff00cc', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  storeButton: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  storeButtonGradient: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  storeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  btnIcon: { marginRight: 8 },

  spacer: { flex: 1 },
  
  logoutButton: { flexDirection: 'row', backgroundColor: 'rgba(255, 68, 68, 0.05)', paddingVertical: 15, borderRadius: 15, width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.2)', marginBottom: Platform.OS === 'ios' ? 10 : 30 },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 30, borderWidth: 1, borderColor: '#333', borderBottomWidth: 0 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
  bottomSheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  bottomSheetClose: { padding: 5 },
  
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10, borderRadius: 15, marginBottom: 5 },
  langOptionActive: { backgroundColor: 'rgba(255, 0, 204, 0.1)' }, 
  langOptionIcon: { fontSize: 24, marginRight: 15 },
  langOptionText: { color: '#ffffff', fontSize: 18 },
  langOptionTextActive: { color: '#ff00cc', fontWeight: 'bold' },

  termsText: { color: '#cccccc', fontSize: 15, lineHeight: 24 },
  boldText: { color: '#ffffff', fontWeight: 'bold', fontSize: 17 },

  planDetailsCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  planDetailsTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  planFeaturesList: { marginTop: 10 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planFeatureText: { color: '#cccccc', fontSize: 15 },

  cancelPlanBtn: { width: '100%', paddingVertical: 16, borderRadius: 15, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.4)', alignItems: 'center' },
  cancelPlanBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  
  upgradePlanBtn: { width: '100%', paddingVertical: 16, borderRadius: 15, backgroundColor: 'rgba(0, 229, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.4)', alignItems: 'center' },
  upgradePlanBtnText: { color: '#00e5ff', fontSize: 16, fontWeight: 'bold' }
});