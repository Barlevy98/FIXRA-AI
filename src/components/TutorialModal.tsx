import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface TutorialModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export default function TutorialModal({ visible, onClose }: TutorialModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      title: "Welcome to FIXRA AI",
      subtitle: "Your elite gaming assistant is ready.",
      icon: "game-controller-outline",
      color: "#ff00cc",
      desc: "Stuck on a boss? Can't find a hidden item? We analyze your gameplay in real-time and provide the exact solution."
    },
    {
      title: "Step 1: Select Your Game",
      subtitle: "Context is everything.",
      icon: "library-outline",
      color: "#00e5ff",
      desc: "Before chatting, ALWAYS select your game from the library. This focuses the AI's logic and guarantees 100% accurate guides and YouTube videos."
    },
    {
      title: "Step 2: Show, Don't Tell",
      subtitle: "Text, Images, or Video.",
      icon: "scan-circle-outline",
      color: "#bf5af2",
      desc: "Type your question, or even better—upload a screenshot or a video clip of where you are stuck. Let the AI see what you see."
    }
  ];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <LinearGradient colors={['#0a0026', '#050012', '#000000']} style={styles.modalContent}>
          <SafeAreaView style={{ flex: 1 }}>
            
            <View style={styles.header}>
              <Text style={styles.headerBrand}>FIXRA <Text style={styles.headerAI}>AI</Text></Text>
              <TouchableOpacity onPress={handleClose} style={styles.skipBtn}>
                <Text style={styles.skipBtnText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <View style={styles.slideContainer}>
                <View style={[styles.iconWrapper, { shadowColor: slides[currentSlide].color }]}>
                  <Ionicons name={slides[currentSlide].icon as keyof typeof Ionicons.glyphMap} size={80} color={slides[currentSlide].color} />
                </View>
                <Text style={styles.title}>{slides[currentSlide].title}</Text>
                <Text style={styles.subtitle}>{slides[currentSlide].subtitle}</Text>
                <Text style={styles.desc}>{slides[currentSlide].desc}</Text>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.pagination}>
                {slides.map((_, index) => (
                  <View key={index} style={[styles.dot, currentSlide === index && styles.activeDot]} />
                ))}
              </View>

              <TouchableOpacity style={styles.startBtn} onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.startBtnGradient}>
                  <Text style={styles.startBtnText}>{currentSlide === slides.length - 1 ? "Let's Play" : "Next"}</Text>
                  <Ionicons name={currentSlide === slides.length - 1 ? "rocket-outline" : "arrow-forward"} size={20} color="#fff" style={{ marginLeft: 10 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '92%', height: '85%', borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, paddingBottom: 10 },
  headerBrand: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  headerAI: { color: '#00e5ff' },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12 },
  skipBtnText: { color: '#888', fontSize: 13, fontWeight: 'bold' },
  
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  slideContainer: { alignItems: 'center', width: '100%' },
  iconWrapper: { marginBottom: 30, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 10 },
  title: { fontSize: 28, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 18, color: '#00e5ff', textAlign: 'center', marginBottom: 20, fontWeight: 'bold' },
  desc: { fontSize: 16, color: '#aaa', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  
  footer: { padding: 20, paddingTop: 0, alignItems: 'center' },
  pagination: { flexDirection: 'row', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 5 },
  activeDot: { backgroundColor: '#00e5ff', width: 20 },
  
  startBtn: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  startBtnGradient: { flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center' },
  startBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
});