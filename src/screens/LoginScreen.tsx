import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOAuth } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  
  const [lang, setLang] = useState('English'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AsyncStorage.getItem('@app_language').then(saved => {
      if (saved) setLang(saved);
    });
  }, []);

  const changeLang = async (newLang: string) => {
    setLang(newLang);
    await AsyncStorage.setItem('@app_language', newLang);
    toggleMenu(); 
  };

  const toggleMenu = () => {
    const toValue = isMenuOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setIsMenuOpen(!isMenuOpen);
  };

  const translations = {
    English: { title: "FIXRA AI", sub: "Stuck? Fixra it ", login: "Sign in with Google" },
    Russian: { title: "FIXRA AI", sub: "Застрял? Fixra it ", login: "Войти через Google" },
    Arabic: { title: "FIXRA AI", sub: "عالق؟ Fixra it ", login: "تسجيل الدخول بحساب Google" },
    Hebrew: { title: "FIXRA AI", sub: "נתקעת? Fixra it ", login: "התחבר עם Google" }
  };

  const t = translations[lang as keyof typeof translations] || translations.English;

  const handleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('OAuth error', err);
    }
  };

  const getAnimatedStyle = (index: number) => {
    return {
      opacity: animation,
      transform: [
        {
          translateX: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, (index + 1) * 60], 
          }),
        },
      ],
    };
  };

  return (
    <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
      <SafeAreaView style={styles.container}>
        
        <View style={styles.floatingMenuContainer}>
          
          <Animated.View style={[styles.floatingBtn, getAnimatedStyle(0)]}>
            <TouchableOpacity onPress={() => changeLang('English')}><Text style={styles.globeText}>🇺🇸</Text></TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.floatingBtn, getAnimatedStyle(1)]}>
            <TouchableOpacity onPress={() => changeLang('Hebrew')}><Text style={styles.globeText}>🇮🇱</Text></TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.floatingBtn, getAnimatedStyle(2)]}>
            <TouchableOpacity onPress={() => changeLang('Russian')}><Text style={styles.globeText}>🇷🇺</Text></TouchableOpacity>
          </Animated.View>
          <Animated.View style={[styles.floatingBtn, getAnimatedStyle(3)]}>
            <TouchableOpacity onPress={() => changeLang('Arabic')}><Text style={styles.globeText}>🇦🇪</Text></TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={[styles.floatingBtn, styles.mainMenuBtn]} onPress={toggleMenu}>
            <Text style={styles.globeText}>{isMenuOpen ? '❌' : '🌐'}</Text>
          </TouchableOpacity>
          
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="game-controller" size={60} color="#00e5ff" />
          </View>
          
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.sub}</Text>

          <TouchableOpacity activeOpacity={0.8} style={styles.loginButton} onPress={handleSignIn}>
            <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.loginButtonGradient}>
              <Ionicons name="logo-google" size={24} color="#ffffff" />
              <Text style={styles.loginButtonText}>{t.login}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  
  floatingMenuContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100 },
  
  // עיצוב Glassmorphism לתפריט השפות
  floatingBtn: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', position: 'absolute', top: 0, left: 0 },
  mainMenuBtn: { backgroundColor: 'rgba(10, 0, 38, 0.8)', borderColor: '#8a2be2' },
  globeText: { fontSize: 24 },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  
  iconContainer: { marginBottom: 15, shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  
  // עיצוב כותרת זוהרת (Glow Effect)
  title: { fontSize: 48, fontWeight: '900', color: '#ffffff', marginBottom: 5, letterSpacing: 2, textShadowColor: '#00e5ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  subtitle: { fontSize: 18, color: '#aaaaaa', marginBottom: 50, textAlign: 'center', letterSpacing: 1 },
  
  // כפתור התחברות יוקרתי (מתאים לחלונית התשלומים)
  loginButton: { width: '100%', borderRadius: 30, overflow: 'hidden', shadowColor: '#8a2be2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  loginButtonGradient: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginLeft: 12, letterSpacing: 1 }
});