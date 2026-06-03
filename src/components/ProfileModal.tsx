import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Alert, TextInput, KeyboardAvoidingView, Linking } from 'react-native';
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
  
  const { 
    isPro, 
    currentPlan, 
    chatLanguage, 
    resetToFree, 
    lifetimeMessages, 
    cycleUsedMessages,  
    cycleLimit,        
    cycleStartDate  
  } = usePaywall();
  
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [affiliateMode, setAffiliateMode] = useState<'invite' | 'creator'>('invite');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isEditNameVisible, setIsEditNameVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const t = getTranslation(chatLanguage);

  const safeLifetime = lifetimeMessages || 0;
  const safeUsed = cycleUsedMessages || 0;
  const safeLimit = cycleLimit || (isPro ? 50 : 3);
  const safeStartDate = cycleStartDate || Date.now();

  const planLower = (currentPlan || '').toLowerCase();
  const isPremium = planLower === 'premium';
  const isProPlan = planLower.startsWith('pro');
  const isOneTime = planLower.includes('one') || planLower.includes('time') || planLower.includes('חד');
  const isFree = planLower === 'free' || !isProPlan;

  const themeColor = isPremium ? '#00e5ff' : isProPlan ? '#ff00cc' : '#aaaaaa';

  let renewalText = '';
  if (isPremium) {
    renewalText = 'Auto-renews monthly';
  } else if (isOneTime) {
    renewalText = 'Lifetime Plan - No Expiration';
  } else {
    const cycleMs = isProPlan ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const nextDate = new Date(safeStartDate + cycleMs);
    renewalText = `Resets on ${nextDate.toLocaleDateString('he-IL')}`;
  }

  const getActivePlanFeatures = () => {
    if (isPremium) {
      return ['Unlimited mission solves', 'AI video & image analysis', 'Unlimited guide links', 'No ads', 'Fastest results ⚡', 'Priority processing'];
    }
    
    if (planLower.includes('pro')) {
      return ['50 mission solves', 'AI image analysis', '3 guide links per solution', 'Priority support'];
    }
    
    return ['3 free messages per day', 'Basic AI text help', 'Ads included'];
  };

  const getDisplayPlanName = () => {
    if (isPremium) return 'FIXRA PREMIUM';
    if (isProPlan) return isOneTime ? 'FIXRA PRO (ONE-TIME)' : 'FIXRA PRO';
    return 'FREE TIER';
  };

  const handleOpenStore = () => {
    setShowPlanDetails(false); 
    setTimeout(() => { onClose(); setTimeout(() => { onOpenPaywall(); }, 500); }, 50);
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      "Manage Subscription",
      "To cancel your subscription, you need to manage it in your Apple ID settings. It will remain active until the end of the current billing cycle.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Go to Settings", 
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('https://apps.apple.com/account/subscriptions');
            }
            setShowPlanDetails(false);
          }
        }
      ]
    );
  };

  const handleSaveName = async () => {
    if (!newName.trim() || !user) { setIsEditNameVisible(false); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const nameParts = newName.trim().split(' ');
      await user.update({ firstName: nameParts[0], lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : '' });
      const token = await getToken({ template: 'supabase' });
      if (token) await updateUserName(token, user.id, newName.trim());
      setIsEditNameVisible(false);
    } catch (error) { Alert.alert("Error", "Could not update your name."); }
  };

  const openEditNameModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewName([user?.firstName, user?.lastName].filter(Boolean).join(' '));
    setIsEditNameVisible(true);
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.content}>
            
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                <Ionicons name="chevron-down" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Gamer ID</Text>
              <TouchableOpacity onPress={() => setIsSettingsVisible(true)} style={styles.iconBtn}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              
              <LinearGradient colors={['rgba(255,255,255,0.08)', 'rgba(0,0,0,0.4)']} style={[styles.idCard, { borderColor: themeColor }]}>
                <View style={styles.idCardTop}>
                  <View style={styles.avatarContainer}>
                    {user?.imageUrl ? <Image source={{ uri: user.imageUrl }} style={[styles.avatar, { borderColor: themeColor }]} /> : <View style={[styles.avatarPlaceholder, { borderColor: themeColor }]}><Ionicons name="person" size={40} color={themeColor} /></View>}
                    {!isFree && (
                      <View style={[styles.proBadge, { backgroundColor: themeColor, shadowColor: themeColor }]}>
                        <Ionicons name={isPremium ? "diamond" : "flash"} size={16} color="#000" />
                      </View>
                    )}
                  </View>
                  <View style={styles.idCardInfo}>
                    <TouchableOpacity style={styles.nameEditContainer} onPress={openEditNameModal}>
                      <Text style={styles.name} numberOfLines={1}>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Gamer'}</Text>
                      <Ionicons name="pencil" size={16} color={themeColor} style={styles.editIcon} />
                    </TouchableOpacity>
                    <Text style={styles.email} numberOfLines={1}>{user?.primaryEmailAddress?.emailAddress}</Text>
                    <View style={[styles.tierTag, { backgroundColor: themeColor + '20', borderColor: themeColor }]}>
                      <Text style={[styles.tierTagText, { color: themeColor }]}>{isPremium ? 'ELITE PREMIUM' : isProPlan ? 'PRO MEMBER' : 'FREE TIER'}</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{safeLifetime}</Text>
                    <Text style={styles.statLabel}>LIFETIME SOLVES</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    {isPremium ? (
                      <>
                        <Text style={styles.statNumber}>∞</Text>
                        <Text style={styles.statLabel}>UNLIMITED</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.statNumber}>{safeUsed}/{safeLimit}</Text>
                        <Text style={styles.statLabel}>{isOneTime ? 'TOTAL LIMIT' : isProPlan ? 'MONTHLY LIMIT' : 'DAILY LIMIT'}</Text>
                      </>
                    )}
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Subscription</Text>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setShowPlanDetails(true)}>
                  <View style={styles.glassCard}>
                    <View style={styles.cardRow}>
                      <Ionicons name="shield-checkmark" size={24} color={themeColor} />
                      <View style={styles.cardTextContent}>
                        <Text style={styles.cardMainText}>Active Plan</Text>
                        <Text style={[styles.cardSubText, { color: themeColor }]}>{getDisplayPlanName()}</Text>
                        <Text style={styles.renewalDateText}>{renewalText}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#555" />
                    </View>
                    {!isPremium && (
                      <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                          <View style={[styles.progressFill, { width: `${Math.min((safeUsed / safeLimit) * 100, 100)}%`, backgroundColor: themeColor }]} />
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Growth</Text>
                <TouchableOpacity style={styles.glassCardRow} onPress={() => { setAffiliateMode('invite'); setShowAffiliateModal(true); }}>
                  <LinearGradient colors={['#00e5ff', '#007acc']} style={styles.iconBox}><Ionicons name="gift" size={20} color="#fff" /></LinearGradient>
                  <Text style={styles.cardMainText}>Invite Friends</Text>
                  <View style={[styles.smallBadge, { backgroundColor: 'rgba(0, 229, 255, 0.1)' }]}><Text style={{color: '#00e5ff', fontSize: 10, fontWeight: '900'}}>GET PRO</Text></View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.glassCardRow, {marginTop: 10}]} onPress={() => { setAffiliateMode('creator'); setShowAffiliateModal(true); }}>
                  <LinearGradient colors={['#ff00cc', '#b300ff']} style={styles.iconBox}><Ionicons name="star" size={20} color="#fff" /></LinearGradient>
                  <Text style={styles.cardMainText}>Creator Program</Text>
                  <View style={[styles.smallBadge, { backgroundColor: 'rgba(255, 0, 204, 0.1)' }]}><Text style={{color: '#ff00cc', fontSize: 10, fontWeight: '900'}}>EARN CASH</Text></View>
                </TouchableOpacity>
              </View>

              {!isPremium && (
                <TouchableOpacity style={styles.storeButton} onPress={handleOpenStore}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.storeButtonGradient}>
                    <Ionicons name={isFree ? "flash" : "diamond"} size={20} color="#ffffff" style={{marginRight: 8}} />
                    <Text style={styles.storeButtonText}>{isFree ? 'Upgrade to Pro' : 'Upgrade to Premium 👑'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
          
          <AffiliateModal visible={showAffiliateModal} onClose={() => setShowAffiliateModal(false)} mode={affiliateMode} />
          <SettingsScreen visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />

          <Modal animationType="slide" transparent={true} visible={showPlanDetails} onRequestClose={() => setShowPlanDetails(false)}>
            <View style={styles.bottomSheetOverlay}>
            <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 20, 40), borderColor: themeColor }]}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Plan Details</Text>
                  <TouchableOpacity onPress={() => setShowPlanDetails(false)} style={styles.iconBtn}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>

                <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.5)']} style={[styles.planDetailsCard, { borderColor: themeColor + '50' }]}>
                  <Text style={[styles.planDetailsTitle, { color: themeColor }]}>{getDisplayPlanName()}</Text>
                  <View style={styles.planFeaturesList}>
                    {getActivePlanFeatures().map((feature, index) => (
                      <View key={index} style={styles.planFeatureRow}>
                        <Ionicons name="checkmark-circle" size={20} color={themeColor} style={{marginRight: 12}} />
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>

                {!isFree ? (
                  <TouchableOpacity style={styles.cancelPlanBtn} onPress={handleCancelSubscription}>
                    <Text style={styles.cancelPlanBtnText}>Cancel Subscription</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.upgradePlanBtn} onPress={handleOpenStore}>
                    <LinearGradient colors={['#8a2be2', '#4b0082']} style={styles.upgradePlanBtnGradient}>
                       <Text style={styles.upgradePlanBtnText}>Upgrade Plan</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Modal>

          <Modal animationType="fade" transparent={true} visible={isEditNameVisible} onRequestClose={() => setIsEditNameVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Edit Gamer Tag</Text>
                  <TextInput style={styles.nameInput} value={newName} onChangeText={setNewName} placeholder="Enter tag" placeholderTextColor="#888" autoFocus={true} maxLength={20} />
                  <TouchableOpacity activeOpacity={0.8} style={styles.saveBtn} onPress={handleSaveName}>
                    <LinearGradient colors={['#00e5ff', '#0088ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.saveBtnGradient}><Text style={styles.saveBtnText}>Save</Text></LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsEditNameVisible(false)} style={styles.cancelBtn}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
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
  content: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  
  idCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 30, shadowOffset: {width: 0, height: 10}, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  idCardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatarContainer: { position: 'relative', marginRight: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  proBadge: { position: 'absolute', bottom: -5, right: -5, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0a0026', shadowOffset: {width: 0, height: 0}, shadowOpacity: 0.8, shadowRadius: 10 },
  idCardInfo: { flex: 1 },
  nameEditContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '900', color: '#fff', flexShrink: 1 },
  editIcon: { marginLeft: 8 },
  email: { fontSize: 13, color: '#888', marginBottom: 10 },
  tierTag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  tierTagText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  statsRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

  cardWrapper: { marginBottom: 25 },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '800', marginBottom: 10, letterSpacing: 1.5, marginLeft: 5 },
  glassCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardTextContent: { flex: 1, marginLeft: 15 },
  cardMainText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cardSubText: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  renewalDateText: { fontSize: 11, color: '#888', marginTop: 4, fontWeight: '500' },
  progressContainer: { marginTop: 15 },
  progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  glassCardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  smallBadge: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  storeButton: { width: '100%', borderRadius: 20, overflow: 'hidden', marginTop: 10 },
  storeButtonGradient: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  storeButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#0a0026', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#00e5ff' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 20 },
  nameInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, color: '#fff', fontSize: 18, paddingVertical: 16, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
  saveBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 15 },
  saveBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: 'bold' },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, borderWidth: 1 },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bottomSheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  planDetailsCard: { borderRadius: 20, padding: 25, marginBottom: 25, borderWidth: 1 },
  planDetailsTitle: { fontSize: 22, fontWeight: '900', marginBottom: 20, textAlign: 'center', letterSpacing: 1 },
  planFeaturesList: { marginTop: 5 },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  planFeatureText: { color: '#ccc', fontSize: 15, fontWeight: '500' },
  cancelPlanBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.3)', alignItems: 'center' },
  cancelPlanBtnText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  upgradePlanBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  upgradePlanBtnGradient: { paddingVertical: 18, alignItems: 'center' },
  upgradePlanBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});