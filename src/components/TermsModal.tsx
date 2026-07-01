import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getUserTosStatus, markTosAsAccepted } from '../utils/db'; 

export default function TermsModal() {
  const { user } = useUser();
  const { getToken } = useAuth(); 
  const [isVisible, setIsVisible] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const checkTermsAccepted = async () => {
      if (user?.id) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            const hasAccepted = await getUserTosStatus(token, user.id);
            // אם הוא לא אישר בעבר בשרת, נציג לו את המודל
            if (!hasAccepted) {
              setIsVisible(true);
            }
          }
        } catch (error) {
          console.error('Error checking TOS:', error);
        }
      }
    };

    checkTermsAccepted();
  }, [user]);

  const handleAccept = async () => {
    if (!isChecked || !user?.id) return;

    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        // שומרים בשרת (Supabase) שהמשתמש הזה אישר את התנאים
        await markTosAsAccepted(token, user.id);
        setIsVisible(false); // סוגרים את המודל ונותנים לו להיכנס לאפליקציה
      }
    } catch (error) {
      console.error('Error saving TOS:', error);
    }
  };

  if (!isVisible) return null;

  return (
    <Modal animationType="slide" transparent={false} visible={isVisible}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <SafeAreaView style={styles.container}>
          
          <View style={styles.header}>
            <Ionicons name="shield-checkmark" size={50} color="#00e5ff" style={styles.icon} />
            <Text style={styles.title}>Welcome to FIXRA</Text>
            <Text style={styles.subtitle}>Before you start your journey, please review our terms.</Text>
          </View>

          <View style={styles.termsBox}>
            <ScrollView showsVerticalScrollIndicator={true} style={styles.scrollView}>
              <Text style={styles.termsText}>
                <Text style={styles.boldText}>1. Acceptance of Terms</Text>{'\n'}
                By accessing and using FIXRA, you accept and agree to be bound by the standard Apple Terms of Use (EULA) and our Privacy Policy.{'\n\n'}
                
                <Text style={styles.boldText}>2. Use of AI Features</Text>{'\n'}
                Our AI provides gaming hints and walkthroughs. While we strive for accuracy, FIXRA is not responsible for any progression loss or incorrect game guidance.{'\n\n'}
                
                <Text style={styles.boldText}>3. Privacy & Data</Text>{'\n'}
                We process your chat history and uploaded media solely to provide you with the best gaming solutions. We do not share your personal data with third parties.{'\n\n'}
                
                <Text style={styles.boldText}>4. Subscriptions & Standard EULA</Text>{'\n'}
                Purchases made through FIXRA PRO are billed securely. Our application utilizes the standard Apple End User License Agreement (EULA).{'\n\n'}
                
                <Text style={styles.boldText}>5. User Conduct</Text>{'\n'}
                You agree not to use the service for any unlawful purpose or to upload explicit or harmful content to the AI system.
              </Text>
            </ScrollView>
          </View>

          <View style={styles.footer}>
            
            <View style={styles.legalLinksContainer}>
              <TouchableOpacity onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}>
                <Text style={styles.legalLink}>Apple Terms of Use (EULA)</Text>
              </TouchableOpacity>
              <Text style={styles.legalDivider}> | </Text>
              <TouchableOpacity onPress={() => Linking.openURL('https://quirky-match-61c.notion.site/FIXRA-Terms-of-Service-Privacy-Policy-34745f65405f80d2b137c2f4ddd7ae2e')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.checkboxContainer} 
              activeOpacity={0.8} 
              onPress={() => setIsChecked(!isChecked)}
            >
              <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                {isChecked && <Ionicons name="checkmark" size={16} color="#0a0026" />}
              </View>
              <Text style={styles.checkboxText}>I have read and agree to the Apple Standard EULA & Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8} 
              style={[styles.acceptBtnWrapper, !isChecked && styles.acceptBtnDisabled]}
              onPress={handleAccept}
              disabled={!isChecked}
            >
              <LinearGradient 
                colors={isChecked ? ['#00e5ff', '#007acc'] : ['#333333', '#333333']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
                style={styles.acceptBtn}
              >
                <Text style={[styles.acceptBtnText, !isChecked && {color: '#888'}]}>Agree & Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1, padding: 20, justifyContent: 'space-between' },
  
  header: { alignItems: 'center', marginTop: Platform.OS === 'ios' ? 40 : 20, marginBottom: 20 },
  icon: { marginBottom: 15 },
  title: { fontSize: 28, fontWeight: '900', color: '#ffffff', textAlign: 'center', letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', marginTop: 10, paddingHorizontal: 20 },

  termsBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 20, marginBottom: 20 },
  scrollView: { flex: 1 },
  termsText: { color: '#cccccc', fontSize: 14, lineHeight: 22 },
  boldText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

  footer: { paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  
  legalLinksContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  legalLink: { color: '#00e5ff', fontSize: 12, textDecorationLine: 'underline' },
  legalDivider: { color: '#aaaaaa', fontSize: 12, marginHorizontal: 8 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, paddingRight: 20 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#00e5ff', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  checkboxActive: { backgroundColor: '#00e5ff' },
  checkboxText: { color: '#ffffff', fontSize: 14, flex: 1, lineHeight: 20 },

  acceptBtnWrapper: { width: '100%', borderRadius: 30, overflow: 'hidden' },
  acceptBtnDisabled: { opacity: 0.5 },
  acceptBtn: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  acceptBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});