import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Switch, Linking, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePaywall } from '../context/PaywallContext';
import { getTranslation } from '../utils/translations'; 
import { getUserHapticsPreference, updateUserHapticsPreference, deleteAllUserChatSessions } from '../utils/db'; 

interface SettingsScreenProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { id: 'English', label: 'English', icon: '🇺🇸' },
  { id: 'Hebrew', label: 'עברית', icon: '🇮🇱' },
  { id: 'Russian', label: 'Русский', icon: '🇷🇺' },
  { id: 'Arabic', label: 'العربية', icon: '🇦🇪' }
];

export default function SettingsScreen({ visible, onClose }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const { chatLanguage, changeLanguage } = usePaywall();
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const t = getTranslation(chatLanguage);
  const currentLangObj = LANGUAGES.find(l => l.id === chatLanguage) || LANGUAGES[0];

  useEffect(() => { if (visible && user?.id) loadHaptics(); }, [visible, user?.id]);

  const loadHaptics = async () => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) setHapticsEnabled(await getUserHapticsPreference(token, user!.id));
    } catch (e) { console.error(e); }
  };

  const toggleHaptics = async (value: boolean) => {
    setHapticsEnabled(value);
    if (value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token && user?.id) await updateUserHapticsPreference(token, user.id, value);
    } catch (e) { console.error(e); }
  };

  const handleSignOut = async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try { await signOut(); onClose(); } catch (err) { console.error(err); }
  };

  const selectLanguage = (langId: string) => {
    if (hapticsEnabled) Haptics.selectionAsync();
    changeLanguage(langId); setShowLangMenu(false);
  };

  const handleContactUs = () => { Linking.openURL(`mailto:fixra.partners@gmail.com?subject=FIXRA Support - ID: ${user?.id}`); };
  
  const handleRateUs = () => {
    Alert.alert("Enjoying FIXRA?", "Tap here to leave a 5-star review! ⭐️⭐️⭐️⭐️⭐️", [{ text: "Not Now", style: "cancel" }, { text: "Rate Us", onPress: () => {} }]);
  };

  const handleClearHistory = () => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Clear Chat History", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear History", style: "destructive", onPress: async () => {
          if (!user?.id) return;
          await AsyncStorage.removeItem(`@fixra_sessions_${user.id}`);
          try { const token = await getToken({ template: 'supabase' }); if (token) await deleteAllUserChatSessions(token, user.id); } catch (error) { }
          if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Success", "Chat history cleared.");
      }}
    ]);
  };

  const handleDeleteAccount = () => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Delete Account", "Permanently delete your account and data? This action is irreversible.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            if (!user?.id) return;
            const token = await getToken({ template: 'supabase' });
            if (token) await deleteAllUserChatSessions(token, user.id);
            await user.delete();
            await signOut(); onClose();
          } catch (error) { Alert.alert("Error", "Could not delete account."); }
      }}
    ]);
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
            <View style={{width: 48}} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <Text style={styles.sectionTitle}>Preferences</Text>
            <View style={styles.cardGroup}>
              <TouchableOpacity style={[styles.settingRow, styles.borderBottom]} onPress={() => setShowLangMenu(true)}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#00e5ff20' }]}><Ionicons name="globe" size={18} color="#00e5ff" /></View>
                  <Text style={styles.settingRowText}>{t.profileLang}</Text>
                </View>
                <View style={styles.settingRowRight}>
                  <Text style={styles.currentValueText}>{currentLangObj.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#555" />
                </View>
              </TouchableOpacity>

              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#ff00cc20' }]}><Ionicons name="phone-portrait" size={18} color="#ff00cc" /></View>
                  <Text style={styles.settingRowText}>Haptics</Text>
                </View>
                <Switch trackColor={{ false: '#333', true: '#ff00cc' }} thumbColor={'#ffffff'} onValueChange={toggleHaptics} value={hapticsEnabled} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Support</Text>
            <View style={styles.cardGroup}>
              <TouchableOpacity style={[styles.settingRow, styles.borderBottom]} onPress={handleRateUs}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#ffca2820' }]}><Ionicons name="star" size={18} color="#ffca28" /></View>
                  <Text style={styles.settingRowText}>Rate FIXRA</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingRow, styles.borderBottom]} onPress={handleContactUs}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#00e5ff20' }]}><Ionicons name="mail" size={18} color="#00e5ff" /></View>
                  <Text style={styles.settingRowText}>Contact Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={() => setShowTermsModal(true)}>
                <View style={styles.settingRowLeft}>
                  <View style={[styles.iconWrapper, { backgroundColor: '#8a2be220' }]}><Ionicons name="document-text" size={18} color="#8a2be2" /></View>
                  <Text style={styles.settingRowText}>Terms & Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#555" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: '#ff4444' }]}>Danger Zone</Text>
            <View style={styles.dangerCardGroup}>
              <TouchableOpacity style={[styles.settingRow, styles.borderBottomDanger]} onPress={handleClearHistory}>
                <View style={styles.settingRowLeft}>
                  <Ionicons name="trash-bin" size={20} color="#ffaa00" style={{ marginRight: 15 }} />
                  <Text style={[styles.settingRowText, { color: '#ffaa00' }]}>Clear History</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
                <View style={styles.settingRowLeft}>
                  <Ionicons name="warning" size={20} color="#ff4444" style={{ marginRight: 15 }} />
                  <Text style={[styles.settingRowText, { color: '#ff4444', fontWeight: 'bold' }]}>Delete Account</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Text style={styles.logoutButtonText}>{t.profileLogout}</Text>
            </TouchableOpacity>

            <Text style={styles.versionFooter}>FIXRA AI - Version 1.1{'\n'}Made for Gamers</Text>

          </ScrollView>

          {/* Lang Modal */}
          <Modal animationType="slide" transparent={true} visible={showLangMenu} onRequestClose={() => setShowLangMenu(false)}>
            <View style={styles.bottomSheetOverlay}>
              <View style={styles.bottomSheet}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>{t.profileLang}</Text>
                  <TouchableOpacity onPress={() => setShowLangMenu(false)}><Ionicons name="close-circle" size={28} color="#555" /></TouchableOpacity>
                </View>
                {LANGUAGES.map((item) => (
                  <TouchableOpacity key={item.id} style={[styles.langOption, chatLanguage === item.id && styles.langOptionActive]} onPress={() => selectLanguage(item.id)}>
                    <Text style={styles.langOptionIcon}>{item.icon}</Text>
                    <Text style={[styles.langOptionText, chatLanguage === item.id && styles.langOptionTextActive]}>{item.label}</Text>
                    {chatLanguage === item.id && <Ionicons name="checkmark" size={24} color="#00e5ff" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Modal>

          {/* 🌟 Terms Modal המעודכן עם הטקסט המלא 🌟 */}
          <Modal animationType="slide" transparent={true} visible={showTermsModal} onRequestClose={() => setShowTermsModal(false)}>
            <View style={styles.bottomSheetOverlay}>
              <View style={[styles.bottomSheet, { height: '80%' }]}>
                <View style={styles.bottomSheetHeader}>
                  <Text style={styles.bottomSheetTitle}>Terms & Privacy</Text>
                  <TouchableOpacity onPress={() => setShowTermsModal(false)}><Ionicons name="close-circle" size={28} color="#555" /></TouchableOpacity>
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

        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
  iconBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  
  sectionTitle: { color: '#888', fontSize: 12, fontWeight: '800', marginBottom: 8, marginLeft: 15, textTransform: 'uppercase', letterSpacing: 1 },
  cardGroup: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  dangerCardGroup: { backgroundColor: 'rgba(255, 68, 68, 0.05)', borderRadius: 24, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.2)', overflow: 'hidden' },
  
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  borderBottomDanger: { borderBottomWidth: 1, borderBottomColor: 'rgba(255, 68, 68, 0.1)' },
  
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconWrapper: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  settingRowText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  settingRowRight: { flexDirection: 'row', alignItems: 'center' },
  currentValueText: { color: '#888', fontSize: 15, marginRight: 8 },
  
  logoutButton: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 30 },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  versionFooter: { color: '#555', textAlign: 'center', fontSize: 12, fontWeight: '800', letterSpacing: 1, lineHeight: 18 },

  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: '#0a0026', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 30, paddingBottom: Platform.OS === 'ios' ? 50 : 30, borderWidth: 1, borderColor: '#333' },
  bottomSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  bottomSheetTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  langOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 15, borderRadius: 16, marginBottom: 8 },
  langOptionActive: { backgroundColor: 'rgba(0, 229, 255, 0.1)' }, 
  langOptionIcon: { fontSize: 24, marginRight: 15 },
  langOptionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  langOptionTextActive: { color: '#00e5ff', fontWeight: 'bold' },
  
  // 🌟 סטייל מותאם לטקסט המלא 🌟
  termsText: { color: '#cccccc', fontSize: 14, lineHeight: 22 },
  boldText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 }
});