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

  useEffect(() => {
    if (visible && user?.id) {
      loadHaptics();
    }
  }, [visible, user?.id]);

  const loadHaptics = async () => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const isEnabled = await getUserHapticsPreference(token, user!.id);
        setHapticsEnabled(isEnabled);
      }
    } catch (e) {
      console.error('Failed to load haptics', e);
    }
  };

  const toggleHaptics = async (value: boolean) => {
    setHapticsEnabled(value);
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const token = await getToken({ template: 'supabase' });
      if (token && user?.id) {
        await updateUserHapticsPreference(token, user.id, value);
      }
    } catch (e) {
      console.error('Failed to update haptics', e);
    }
  };

  const handleSignOut = async () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signOut();
      onClose();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const selectLanguage = (langId: string) => {
    if (hapticsEnabled) Haptics.selectionAsync();
    changeLanguage(langId);
    setShowLangMenu(false);
  };

  // 🌟 תיקון המייל ליצירת קשר
  const handleContactUs = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(`mailto:fixra.partners@gmail.com?subject=FIXRA Support - ID: ${user?.id || 'Unknown'}`);
  };

  const handleRateUs = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Enjoying FIXRA?", 
      "Tap here to leave a 5-star review in the App Store! ⭐️⭐️⭐️⭐️⭐️", 
      [
        { text: "Not Now", style: "cancel" },
        { text: "Rate Us", style: "default", onPress: () => console.log('Redirecting to store...') }
      ]
    );
  };

  const handleClearHistory = () => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Clear Chat History",
      "Are you sure you want to delete all your local conversations? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear History",
          style: "destructive",
          onPress: async () => {
            if (!user?.id) return;
            
            // 1. מוחק מהטלפון
            const SESSIONS_KEY = `@fixra_sessions_${user.id}`;
            await AsyncStorage.removeItem(SESSIONS_KEY);
            
            // 2. מוחק מהענן!
            try {
               const token = await getToken({ template: 'supabase' });
               if (token) {
                 await deleteAllUserChatSessions(token, user.id);
               }
            } catch (error) {
               console.error("Error clearing cloud history", error);
            }

            if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", "Your chat history has been cleared. Restart the app for a fresh start.");
          }
        }
      ]
    );
  };

  // 🌟 מחיקת חשבון אמיתית מול Clerk ו-Supabase 🌟
  const handleDeleteAccount = () => {
    if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account and all associated data? This action is irreversible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              if (!user?.id) return;

              // קודם ננקה את כל היסטוריית השיחות שלו מהשרת שלנו (Supabase)
              const token = await getToken({ template: 'supabase' });
              if (token) {
                await deleteAllUserChatSessions(token, user.id);
              }

              // עכשיו נשמיד את החשבון שלו מ-Clerk
              await user.delete();

              if (hapticsEnabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Account Deleted", "Your account and data have been successfully deleted.");
              
              // ננתק אותו (למרות שהמחיקה כבר זורקת אותו החוצה, זה ליתר ביטחון)
              await signOut();
              onClose();

            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error", 
                "Could not delete account. Please contact support.",
                [{ text: "Contact Support", onPress: () => Linking.openURL(`mailto:fixra.partners@gmail.com?subject=Account Deletion Error - ID: ${user?.id}`) }]
              );
            }
          }
        }
      ]
    );
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.content}>
            
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="chevron-down" size={28} color="#aaaaaa" />
                <Text style={styles.closeBtnText}>Back to Profile</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.screenTitle}>Settings</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              
              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Preferences</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={() => {
                  if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowLangMenu(true);
                }}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="globe-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>{t.profileLang}</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Text style={styles.currentLangText}>{currentLangObj.icon} {currentLangObj.label}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <View style={[styles.settingRow, { marginTop: 10 }]}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="phone-portrait-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Haptic Feedback</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Switch
                      trackColor={{ false: '#333', true: '#00e5ff' }}
                      thumbColor={'#ffffff'}
                      ios_backgroundColor="#333"
                      onValueChange={toggleHaptics}
                      value={hapticsEnabled}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Support & Feedback</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={handleRateUs}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="star-outline" size={22} color="#ffca28" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Rate FIXRA</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { marginTop: 10 }]} onPress={handleContactUs}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="mail-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Contact Support</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { marginTop: 10 }]} onPress={() => setShowTermsModal(true)}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="document-text-outline" size={22} color="#aaaaaa" style={{ marginRight: 10 }} />
                    <Text style={styles.settingRowText}>Terms & Privacy</Text>
                  </View>
                  <View style={styles.settingRowRight}>
                    <Ionicons name="chevron-forward" size={20} color="#555" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.cardWrapper}>
                <Text style={styles.sectionTitle}>Account Management</Text>
                
                <TouchableOpacity style={styles.settingRow} onPress={handleClearHistory}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="trash-bin-outline" size={22} color="#ffaa00" style={{ marginRight: 10 }} />
                    <Text style={[styles.settingRowText, { color: '#ffaa00' }]}>Clear Chat History</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { marginTop: 10, borderColor: 'rgba(255, 68, 68, 0.2)' }]} onPress={handleDeleteAccount}>
                  <View style={styles.settingRowLeft}>
                    <Ionicons name="warning-outline" size={22} color="#ff4444" style={{ marginRight: 10 }} />
                    <Text style={[styles.settingRowText, { color: '#ff4444', fontWeight: 'bold' }]}>Delete Account</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.logoutButton, { marginTop: 20 }]} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={20} color="#ff4444" style={styles.btnIcon} />
                  <Text style={styles.logoutButtonText}>{t.profileLogout}</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>

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

        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20, paddingBottom: 0 },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingRight: 15 },
  closeBtnText: { color: '#aaaaaa', fontSize: 16, marginLeft: 5, fontWeight: '500' },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 30, letterSpacing: 1 },
  cardWrapper: { width: '100%', marginBottom: 25 },
  sectionTitle: { color: '#aaaaaa', fontSize: 13, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingRowText: { color: '#ffffff', fontSize: 16, fontWeight: '500' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center' },
  currentLangText: { color: '#aaaaaa', fontSize: 16, marginRight: 8 },
  logoutButton: { flexDirection: 'row', backgroundColor: 'rgba(255, 68, 68, 0.05)', paddingVertical: 18, borderRadius: 20, width: '100%', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.2)' },
  logoutButtonText: { color: '#ff4444', fontSize: 16, fontWeight: 'bold' },
  btnIcon: { marginRight: 8 },
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
  boldText: { color: '#ffffff', fontWeight: 'bold', fontSize: 17 }
});