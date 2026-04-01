import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <LinearGradient colors={['#0a0026', '#050012', '#000000']} style={styles.modalContent}>
          <SafeAreaView style={{ flex: 1 }}>
            
            {/* Header with Skip */}
            <View style={styles.header}>
              <Text style={styles.headerBrand}>FIXRA <Text style={styles.headerAI}>AI</Text></Text>
              <TouchableOpacity onPress={onClose} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
              <View style={styles.content}>
                <Text style={styles.title}>How it Works</Text>
                <Text style={styles.subtitle}>Master any level in 4 simple steps</Text>

                <View style={styles.stepsWrapper}>
                  {/* קו אנכי מחבר */}
                  <View style={styles.verticalLine} />

                  {/* Step 1 */}
                  <TutorialStep 
                    icon="camera-outline" 
                    color="#00e5ff" 
                    title="Capture & Upload" 
                    desc="Take a screenshot or record a quick video where you're stuck."
                  />

                  {/* Step 2 - הצעד החדש של הטקסט */}
                  <TutorialStep 
                    icon="chatbubbles-outline" 
                    color="#bf5af2" 
                    title="Chat & Ask" 
                    desc="Not sure what to do? Just type a question. Our AI speaks 'Gamer'."
                  />

                  {/* Step 3 */}
                  <TutorialStep 
                    icon="sparkles-outline" 
                    color="#ff00cc" 
                    title="AI Magic" 
                    desc="We analyze your game data, location, and enemies in milliseconds."
                  />

                  {/* Step 4 */}
                  <TutorialStep 
                    icon="trophy-outline" 
                    color="#6366f1" 
                    title="Claim Victory" 
                    desc="Get precise guides, secret maps, and YouTube walkthroughs."
                    isLast
                  />
                </View>
              </View>
            </ScrollView>

            {/* Action Button */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.startBtn} onPress={onClose} activeOpacity={0.8}>
                <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.startBtnGradient}>
                  <Text style={styles.startBtnText}>Get Started</Text>
                  <Ionicons name="rocket-outline" size={20} color="#fff" style={{ marginLeft: 10 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

// קומפוננטת עזר פנימית לשלבים
function TutorialStep({ icon, color, title, desc, isLast = false }: any) {
  return (
    <View style={styles.stepContainer}>
      <View style={[styles.iconWrapper, { borderColor: color }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={styles.stepTextContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', height: '85%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  scrollPadding: { paddingBottom: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingBottom: 10 },
  headerBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  headerAI: { color: '#00e5ff' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  skipBtnText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  title: { fontSize: 34, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginTop: 10 },
  subtitle: { fontSize: 16, color: '#aaa', textAlign: 'center', marginBottom: 40, marginTop: 8 },
  
  stepsWrapper: { width: '100%', paddingLeft: 10 },
  verticalLine: { position: 'absolute', left: 35, top: 30, bottom: 60, width: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
  
  stepContainer: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 35, width: '100%' },
  iconWrapper: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#16161a', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, zIndex: 2 },
  stepTextContent: { flex: 1, marginLeft: 20, paddingTop: 2 },
  stepTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  stepDesc: { color: '#888', fontSize: 14, lineHeight: 20 },

  footer: { padding: 20, paddingTop: 0 },
  startBtn: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});