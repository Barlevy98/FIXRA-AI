import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image, Platform } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePaywall } from '../context/PaywallContext';
import { getTranslation } from '../utils/translations'; 

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
  const { signOut } = useAuth();
  
  // הוספנו את המשיכה של currentPlan
  const { isPro, currentPlan, chatLanguage, changeLanguage, resetToFree } = usePaywall();
  
  const [showLangMenu, setShowLangMenu] = useState(false);

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

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <SafeAreaView style={styles.container}>
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

            {/* --- אזור הסטטוס הפרימיום החדש --- */}
            <View style={styles.cardWrapper}>
              <Text style={styles.sectionTitle}>{t.profileStatus}</Text>
              
              {isPro ? (
                <View style={[styles.glassCard, styles.glassCardPro]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="diamond" size={24} color="#00e5ff" />
                    <Text style={styles.proTitle}>FIXRA PRO</Text>
                  </View>
                  <Text style={styles.statsTextPro}>Active Plan</Text>
                  <Text style={styles.statsSubText}>Unlimited Access</Text>
                </View>
              ) : (
                <View style={styles.glassCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="cube-outline" size={24} color="#aaaaaa" />
                    <Text style={styles.freeTitle}>CURRENT PLAN</Text>
                  </View>
                  {/* השם מתעדכן דינאמית לפי הסטייט */}
                  <Text style={styles.statsTextPro}>
                    {currentPlan === 'Free' ? 'Free Plan' : `${currentPlan} Plan`}
                  </Text>
                  <Text style={styles.statsText}>
                    {currentPlan === 'Free' ? 'Limited Features' : 'Enhanced Features'}
                  </Text>
                </View>
              )}
            </View>

            {/* --- אזור ההגדרות (שפה) --- */}
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
            </View>

            {/* כפתור החנות */}
            {!isPro && (
              <TouchableOpacity style={styles.storeButton} onPress={() => { onClose(); onOpenPaywall(); }}>
                <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.storeButtonGradient}>
                  <Ionicons name="cart-outline" size={20} color="#ffffff" style={styles.btnIcon} />
                  <Text style={styles.storeButtonText}>{t.profileStore}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <View style={styles.spacer} />

            {/* כפתור יציאה */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#ff4444" style={styles.btnIcon} />
              <Text style={styles.logoutButtonText}>{t.profileLogout}</Text>
            </TouchableOpacity>

            {/* כפתור איפוס שמוצג רק בסביבת פיתוח */}
            {__DEV__ && (
              <TouchableOpacity onPress={resetToFree} style={{ marginTop: 10, padding: 10 }}>
                <Text style={{ color: '#555', textAlign: 'center', fontWeight: 'bold' }}>[Dev: Reset to Free Plan]</Text>
              </TouchableOpacity>
            )}

          </View>

          {/* --- חלון בחירת השפה הקופץ --- */}
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

        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  
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
  
  glassCard: { padding: 20, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  glassCardPro: { borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)', borderWidth: 1.5 },
  
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
  langOptionTextActive: { color: '#ff00cc', fontWeight: 'bold' } 
});