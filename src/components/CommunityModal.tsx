import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface CommunityModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CommunityModal({ visible, onClose }: CommunityModalProps) {
  
  // פונקציה חכמה שפותחת לינקים (עם רטט קטן לפני)
  const openLink = (url: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(url);
  };

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={['#1a0033', '#0a0026']} style={styles.gradient}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={26} color="#aaaaaa" />
            </TouchableOpacity>

            <View style={styles.iconWrapper}>
              <Ionicons name="planet" size={50} color="#00e5ff" />
            </View>

            <Text style={styles.title}>Join the FIXRA Squad</Text>
            <Text style={styles.subtitle}>
              Connect with thousands of gamers, share tips, report bugs, and get exclusive pro updates!
            </Text>

            {/* כפתור הדיסקורד */}
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#5865F2' }]} onPress={() => openLink('https://discord.com')}>
              <Ionicons name="logo-discord" size={24} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.socialBtnText}>Join our Discord Server</Text>
            </TouchableOpacity>

            {/* כפתור X / טוויטר */}
            <TouchableOpacity style={[styles.socialBtn, { backgroundColor: '#000000', borderWidth: 1, borderColor: '#333' }]} onPress={() => openLink('https://twitter.com')}>
              <Ionicons name="logo-twitter" size={24} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.socialBtnText}>Follow us on X</Text>
            </TouchableOpacity>

          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.3)' },
  gradient: { padding: 30, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 15, right: 15, padding: 5, zIndex: 10 },
  
  iconWrapper: { 
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: 'rgba(0, 229, 255, 0.1)', 
    justifyContent: 'center', alignItems: 'center', 
    marginBottom: 20, borderWidth: 2, borderColor: '#00e5ff',
    shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 15
  },
  
  title: { fontSize: 26, fontWeight: '900', color: '#ffffff', marginBottom: 12, textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', marginBottom: 35, lineHeight: 22 },
  
  socialBtn: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 18, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnIcon: { marginRight: 12 },
  socialBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});