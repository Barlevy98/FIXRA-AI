import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Alert, TextInput, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePaywall } from '../context/PaywallContext';
import { getTranslation } from '../utils/translations'; 
import AffiliateModal from './AffiliateModal'; 
import SettingsScreen from '../screens/SettingsScreen'; 
import * as Haptics from 'expo-haptics';
import { updateUserName } from '../utils/db'; 

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}

export default function ProfileModal({ visible, onClose, onOpenPaywall }: ProfileModalProps) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const insets = useSafeAreaInsets(); 
  
  // 🌟 משכנו גם את הנתונים החיים של ההודעות מהקונטקסט!
  const { isPro, currentPlan, chatLanguage, resetToFree, dailyCount, messageCount, maxMessages } = usePaywall();
  
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [affiliateMode, setAffiliateMode] = useState<'invite' | 'creator'>('invite');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const [isEditNameVisible, setIsEditNameVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const t = getTranslation(chatLanguage);

  // משתני עזר לזיהוי המנוי
  const isPremium = currentPlan === 'PREMIUM';
  const isProPlan = currentPlan.startsWith('PRO');
  const isFree = currentPlan === 'Free';

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
      "Are you sure? Your plan will remain active until the end of your current billing cycle.\n\nThere are no refunds for partial months.",
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

  const handleSaveName = async () => {
    if (!newName.trim() || !user) {
      setIsEditNameVisible(false);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const nameParts = newName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      await user.update({
        firstName: firstName,
        lastName: lastName,
      });

      const token = await getToken({ template: 'supabase' });
      if (token) {
        await updateUserName(token, user.id, newName.trim());
      }

      setIsEditNameVisible(false);
    } catch (error) {
      console.error("Failed to update name:", error);
      Alert.alert("Error", "Could not update your name. Please try again.");
    }
  };

  const openEditNameModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentFullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    setNewName(currentFullName);
    setIsEditNameVisible(true);
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
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.content}>
            
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="chevron-down" size={28} color="#aaaaaa" />
                <Text style={styles.closeBtnText}>{t.profileBack}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={styles.settingsBtn}>
                <Ionicons name="settings-outline" size={24} color="#aaaaaa" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {user?.imageUrl ? (
                  <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#6366f1" />
                  </View>
                )}
                {/* 🌟 שינוי צבע תג ה-VIP על התמונה לפי המנוי */}
                {!isFree && (
                  <View style={[styles.proBadge, { backgroundColor: isPremium ? '#00e5ff' : '#ff00cc' }]}>
                    <Ionicons name={isPremium ? "diamond" : "flash"} size={14} color={isPremium ? "#000" : "#fff"} />
                  </View>
                )}
              </View>
              
              <TouchableOpacity style={styles.nameEditContainer} onPress={openEditNameModal} activeOpacity={0.7}>
                <Text style={styles.name}>
                  {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Gamer'}
                </Text>
                <Ionicons name="pencil" size={18} color={isPremium ? "#00e5ff" : isProPlan ? "#ff00cc" : "#00e5ff"} style={styles.editIcon} />
              </TouchableOpacity>
              
              <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              
              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>{t.profileStatus}</Text>
                
                <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPlanDetails(true)}>
                  <View style={[
                    styles.glassCard, 
                    isPremium ? styles.glassCardPremium : isProPlan ? styles.glassCardPro : null
                  ]}>
                    <View style={styles.cardHeader}>
                      <Ionicons name={isPremium ? "diamond" : isProPlan ? "flash" : "cube-outline"} size={24} color={isPremium ? "#00e5ff" : isProPlan ? "#ff00cc" : "#aaaaaa"} />
                      <Text style={[styles.planCardTitle, { color: isPremium ? '#00e5ff' : isProPlan ? '#ff00cc' : '#aaaaaa' }]}>
                        {isPremium ? 'FIXRA PREMIUM' : isProPlan ? 'FIXRA PRO' : 'CURRENT PLAN'}
                      </Text>
                    </View>
                    
                    <Text style={styles.statsTextPro}>{getDisplayPlanName()}</Text>
                    
                    {/* 🌟 הוספת מד ההתקדמות הוויזואלי 🌟 */}
                    {isPremium ? (
                      <Text style={[styles.statsSubText, { color: '#00e5ff', marginTop: 5 }]}>Unlimited Access 👑</Text>
                    ) : isProPlan ? (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${Math.min((messageCount / maxMessages) * 100, 100)}%`, backgroundColor: '#ff00cc' }]} />
                        </View>
                        <Text style={styles.progressText}>{messageCount} / {maxMessages} used</Text>
                      </View>
                    ) : (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${Math.min((dailyCount / 3) * 100, 100)}%`, backgroundColor: '#888' }]} />
                        </View>
                        <Text style={styles.progressText}>{dailyCount} / 3 free daily messages used</Text>
                      </View>
                    )}

                    <Ionicons name="chevron-forward" size={20} color={isPremium ? "#00e5ff" : isProPlan ? "#ff00cc" : "#aaaaaa"} style={styles.chevronRightAbs} />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Earn with Fixra</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={() => { setAffiliateMode('invite'); setShowAffiliateModal(true); }}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="gift-outline" size={22} color="#00e5ff" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Invite Friends</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    {/* 🌟 גרדיאנט לבאדג'ים של השותפים 🌟 */}
                    <LinearGradient colors={['#00e5ff', '#007acc']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.badgeGradient}>
                      <Text style={styles.badgeTextDark}>GET PRO</Text>
                    </LinearGradient>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, {marginTop: 10}]} onPress={() => { setAffiliateMode('creator'); setShowAffiliateModal(true); }}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="star-outline" size={22} color="#ff00cc" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Creator Program</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <LinearGradient colors={['#ff00cc', '#b300ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.badgeGradient}>
                      <Text style={styles.badgeTextLight}>EARN $$$</Text>
                    </LinearGradient>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>
              </View>

              {!isPro && (
                <TouchableOpacity style={styles.storeButton} onPress={handleOpenStore}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.storeButtonGradient}>
                    <Ionicons name="cart-outline" size={20} color="#ffffff" style={styles.btnIcon} />
                    <Text style={styles.storeButtonText}>{t.profileStore}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

            </ScrollView>
          </View>

          {/* מודלים קיימים (תוכנית, שותפים, הגדרות, עריכת שם) */}
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
                  <Text style={styles.planDetailsTitle}>{getDisplayPlanName()}</Text>
                  <View style={styles.planFeaturesList}>
                    {getActivePlanFeatures().map((feature, index) => (
                      <View key={index} style={styles.planFeatureRow}>
                        <Ionicons name="checkmark-circle" size={20} color={isPremium ? "#00e5ff" : isProPlan ? "#ff00cc" : "#aaaaaa"} style={{marginRight: 10}} />
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

          <AffiliateModal visible={showAffiliateModal} onClose={() => setShowAffiliateModal(false)} mode={affiliateMode} />
          <SettingsScreen visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />

          <Modal animationType="fade" transparent={true} visible={isEditNameVisible} onRequestClose={() => setIsEditNameVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  
                  <Text style={styles.modalTitle}>Edit Profile Name</Text>
                  <Text style={styles.modalSubtitle}>Choose how FIXRA will call you</Text>

                  <TextInput
                    style={styles.nameInput}
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Enter your name or Gamer Tag"
                    placeholderTextColor="#888"
                    autoFocus={true}
                    maxLength={30}
                  />

                  <TouchableOpacity activeOpacity={0.8} style={styles.saveBtn} onPress={handleSaveName}>
                    <LinearGradient colors={['#00e5ff', '#0088ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.saveBtnGradient}>
                      <Text style={styles.saveBtnText}>Save Changes</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setIsEditNameVisible(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 0 },
  
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  closeBtnText: { color: '#aaaaaa', fontSize: 16, marginLeft: 5, fontWeight: '500' },
  settingsBtn: { padding: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  profileSection: { alignItems: 'center', marginBottom: 30 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#8a2be2' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1e1e1e', borderWidth: 3, borderColor: '#8a2be2', alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a0026' },
  
  nameEditContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5, paddingHorizontal: 15 },
  name: { fontSize: 26, fontWeight: 'bold', color: '#ffffff' },
  editIcon: { marginLeft: 10, marginTop: 4 },
  
  email: { fontSize: 15, color: '#aaaaaa' },

  cardWrapper: { width: '100%', marginBottom: 25 },
  sectionTitle: { color: '#aaaaaa', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  
  glassCard: { padding: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', position: 'relative' },
  glassCardPro: { borderColor: '#ff00cc', backgroundColor: 'rgba(255, 0, 204, 0.05)', borderWidth: 1.5 },
  glassCardPremium: { borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 1.5 },
  chevronRightAbs: { position: 'absolute', right: 20, top: '50%', transform: [{translateY: -10}] },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  planCardTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 },
  
  statsTextPro: { color: '#ffffff', fontSize: 22, fontWeight: '900', marginBottom: 5 },
  statsSubText: { fontSize: 13, opacity: 0.8 },

  // 🌟 סטיילים למד ההתקדמות 🌟
  progressContainer: { width: '100%', marginTop: 12, alignItems: 'center' },
  progressTrack: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressText: { color: '#aaaaaa', fontSize: 12, fontWeight: '600' },

  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center' },

  // 🌟 סטיילים מוגדרים לבאדג'ים החדשים 🌟
  badgeGradient: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 10 },
  badgeTextDark: { color: '#000000', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  badgeTextLight: { color: '#ffffff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  storeButton: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  storeButtonGradient: { flexDirection: 'row', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  storeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  btnIcon: { marginRight: 8 },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 30, borderWidth: 1, borderColor: '#333', borderBottomWidth: 0 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 15 },
  bottomSheetTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  bottomSheetClose: { padding: 5 },

  planDetailsCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  planDetailsTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  planFeaturesList: { marginTop: 10 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  planFeatureText: { color: '#cccccc', fontSize: 15 },

  cancelPlanBtn: { width: '100%', paddingVertical: 16, borderRadius: 15, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.4)', alignItems: 'center' },
  cancelPlanBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  
  upgradePlanBtn: { width: '100%', paddingVertical: 16, borderRadius: 15, backgroundColor: 'rgba(0, 229, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.4)', alignItems: 'center' },
  upgradePlanBtnText: { color: '#00e5ff', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#0a0026', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 10 },
  modalSubtitle: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', marginBottom: 25 },
  nameInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, color: '#ffffff', fontSize: 18, paddingVertical: 16, paddingHorizontal: 20, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
  saveBtn: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  saveBtnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 16, fontWeight: 'bold' }
});