import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, TextInput, KeyboardAvoidingView, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { startOAuthFlow: startGoogleFlow } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startAppleFlow } = useOAuth({ strategy: 'oauth_apple' });
  
  const { signIn, setActive: setActiveSignIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: isSignUpLoaded } = useSignUp();
  
  const [lang, setLang] = useState('English'); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // סטייטים למסך ההתחברות הראשי (Login)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // 🌟 סטייטים למסך ההרשמה (Registration Modal)
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);

  // סטייטים למסך אימות קוד (OTP Modal)
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  
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
    English: { 
      title: "FIXRA AI", sub: "Stuck? Fixra it", login: "Continue with Google", loginApple: "Continue with Apple", email: "Email Address", pass: "Password", signIn: "Sign In", or: "OR", createAccount: "Create free account", 
      verifyTitle: "Verify Email", verifySub: "Enter the code sent to your email", codePlaceholder: "Verification Code", verifyBtn: "Verify & Login", back: "Back",
      regTitle: "Create Account", regBtn: "Sign Up", passRules: "Password must be at least 8 characters long."
    },
    Russian: { 
      title: "FIXRA AI", sub: "Застрял? Fixra it", login: "Продолжить с Google", loginApple: "Продолжить с Apple", email: "Электронная почта", pass: "Пароль", signIn: "Войти", or: "ИЛИ", createAccount: "Создать аккаунт", 
      verifyTitle: "Подтвердить Email", verifySub: "Введите код из письма", codePlaceholder: "Код подтверждения", verifyBtn: "Подтвердить", back: "Назад",
      regTitle: "Регистрация", regBtn: "Зарегистрироваться", passRules: "Пароль должен содержать минимум 8 символов."
    },
    Arabic: { 
      title: "FIXRA AI", sub: "عالق؟ Fixra it", login: "المتابعة باستخدام Google", loginApple: "المتابعة باستخدام Apple", email: "البريد الإلكتروني", pass: "كلمة المرور", signIn: "تسجيل الدخول", or: "أو", createAccount: "إنشاء حساب مجاني", 
      verifyTitle: "تأكيد البريد", verifySub: "أدخل الرمز المرسل للإيميل", codePlaceholder: "رمز التأكيد", verifyBtn: "تأكيد", back: "رجوع",
      regTitle: "إنشاء حساب", regBtn: "تسجيل", passRules: "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل."
    },
    Hebrew: { 
      title: "FIXRA AI", sub: "נתקעת? Fixra it", login: "המשך עם Google", loginApple: "המשך עם Apple", email: "כתובת אימייל", pass: "סיסמה", signIn: "התחבר", or: "או", createAccount: "צור משתמש חדש", 
      verifyTitle: "אימות אימייל", verifySub: "הכנס את הקוד שנשלח למייל שלך", codePlaceholder: "קוד אימות", verifyBtn: "אמת והיכנס", back: "חזור",
      regTitle: "הרשמה", regBtn: "צור חשבון", passRules: "הסיסמה חייבת להכיל לפחות 8 תווים."
    }
  };

  const t = translations[lang as keyof typeof translations] || translations.English;

  const handleSignInGoogle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { createdSessionId, setActive } = await startGoogleFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Google OAuth error', err);
    }
  };

  const handleAppleLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const { createdSessionId, setActive } = await startAppleFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error('Apple OAuth error', err);
    }
  };

  const handleEmailLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSignInLoaded) return;
    
    // ניקוי רווחים נסתרים מההתחלה והסוף של האימייל
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      Alert.alert("Missing Fields", "Please enter both email and password.");
      return;
    }

    try {
      // שימוש באימייל הנקי
      const completeSignIn = await signIn.create({ 
        identifier: cleanEmail, 
        password 
      });
      
      if (completeSignIn.status === 'complete') {
        await setActiveSignIn({ session: completeSignIn.createdSessionId });
      }
    } catch (err: any) {
      console.error('Email login error', err.errors);
      
      // הודעה אחידה וברורה כמו שביקשת, בלי קשר לסוג השגיאה של Clerk
      Alert.alert("Login Failed", "Invalid email or password.");
    }
  };

  // 🌟 פתיחת חלונית ההרשמה
  const openRegisterModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRegEmail('');
    setRegPassword('');
    setShowRegisterModal(true);
  };

  // 🌟 שליחת טופס ההרשמה מתוך החלונית
  const submitRegistration = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isSignUpLoaded) return;
    if (!regEmail || !regPassword) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    try {
      await signUp.create({ emailAddress: regEmail, password: regPassword });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setShowRegisterModal(false); // סוגר את ההרשמה
      setPendingVerification(true); // פותח את האימות
    } catch (err: any) {
      Alert.alert("Registration Failed", err.errors[0]?.message || "Could not create account.");
    }
  };

  const handleVerifyPress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!isSignUpLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      if (completeSignUp.status === 'complete') {
        await setActiveSignUp({ session: completeSignUp.createdSessionId });
      }
    } catch (err: any) {
      Alert.alert("Verification Failed", err.errors[0]?.message || "Invalid code.");
    }
  };

  const getAnimatedStyle = (index: number) => {
    return {
      opacity: animation,
      transform: [
        { translateX: animation.interpolate({ inputRange: [0, 1], outputRange: [0, (index + 1) * 60] }) }
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

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            
            <View style={styles.iconContainer}>
              <Ionicons name="game-controller" size={60} color="#00e5ff" />
            </View>
            
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.sub}</Text>

            {/* שדות התחברות בלבד */}
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.email}
                placeholderTextColor="#aaaaaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder={t.pass}
                placeholderTextColor="#aaaaaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.passwordToggle}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#aaaaaa" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity activeOpacity={0.8} style={styles.emailLoginBtn} onPress={handleEmailLogin}>
              <Text style={styles.emailLoginBtnText}>{t.signIn}</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity activeOpacity={0.8} style={styles.loginButton} onPress={handleSignInGoogle}>
              <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.loginButtonGradient}>
                <Ionicons name="logo-google" size={22} color="#ffffff" />
                <Text style={styles.loginButtonText}>{t.login}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={[styles.loginButton, styles.appleButton]} onPress={handleAppleLogin}>
              <View style={styles.loginButtonGradient}>
                <Ionicons name="logo-apple" size={22} color="#ffffff" />
                <Text style={styles.loginButtonText}>{t.loginApple}</Text>
              </View>
            </TouchableOpacity>

            {/* 🌟 פותח את חלונית ההרשמה */}
            <TouchableOpacity onPress={openRegisterModal} style={styles.registerLink}>
              <Text style={styles.registerLinkText}>{t.createAccount}</Text>
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* 🌟 חלון הרשמה (Registration Modal) */}
        <Modal visible={showRegisterModal} animationType="slide" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                
                <Text style={styles.modalTitle}>{t.regTitle}</Text>

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t.email}
                    placeholderTextColor="#aaaaaa"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#888" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t.pass}
                    placeholderTextColor="#aaaaaa"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!regShowPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setRegShowPassword(!regShowPassword)} style={styles.passwordToggle}>
                    <Ionicons name={regShowPassword ? "eye-outline" : "eye-off-outline"} size={20} color="#aaaaaa" />
                  </TouchableOpacity>
                </View>
                
                {/* 🌟 חוקי הסיסמה */}
                <Text style={styles.passwordRulesText}>{t.passRules}</Text>

                <TouchableOpacity activeOpacity={0.8} style={styles.verifyBtn} onPress={submitRegistration}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.verifyBtnGradient}>
                    <Text style={styles.verifyBtnText}>{t.regBtn}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowRegisterModal(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>{t.back}</Text>
                </TouchableOpacity>
                
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* חלון אימות המייל (OTP Modal) */}
        <Modal visible={pendingVerification} animationType="fade" transparent={true}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="mail-open-outline" size={40} color="#00e5ff" />
                </View>
                <Text style={styles.modalTitle}>{t.verifyTitle}</Text>
                <Text style={styles.modalSubtitle}>{t.verifySub}</Text>

                <TextInput
                  style={styles.codeInput}
                  value={code}
                  placeholder={t.codePlaceholder}
                  placeholderTextColor="#888"
                  keyboardType="numeric"
                  onChangeText={setCode}
                  maxLength={6}
                />

                <TouchableOpacity activeOpacity={0.8} style={styles.verifyBtn} onPress={handleVerifyPress}>
                  <LinearGradient colors={['#00e5ff', '#0088ff']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.verifyBtnGradient}>
                    <Text style={styles.verifyBtnText}>{t.verifyBtn}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPendingVerification(false)} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>{t.back}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  floatingMenuContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100 },
  floatingBtn: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', position: 'absolute', top: 0, left: 0 },
  mainMenuBtn: { backgroundColor: 'rgba(10, 0, 38, 0.8)', borderColor: '#8a2be2' },
  globeText: { fontSize: 24 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingTop: 100, paddingBottom: 40 },
  iconContainer: { marginBottom: 15, shadowColor: '#00e5ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  title: { fontSize: 48, fontWeight: '900', color: '#ffffff', marginBottom: 5, letterSpacing: 2, textShadowColor: '#00e5ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
  subtitle: { fontSize: 18, color: '#aaaaaa', marginBottom: 35, textAlign: 'center', letterSpacing: 1 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, marginBottom: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '100%' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#ffffff', fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 18 : 14 },
  passwordToggle: { padding: 5 },
  emailLoginBtn: { width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  emailLoginBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#888', paddingHorizontal: 15, fontSize: 14, fontWeight: 'bold' },
  loginButton: { width: '100%', borderRadius: 30, overflow: 'hidden', shadowColor: '#8a2be2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5, marginBottom: 15 },
  loginButtonGradient: { flexDirection: 'row', paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  loginButtonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginLeft: 12, letterSpacing: 1 },
  appleButton: { backgroundColor: '#000000', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', shadowColor: '#ffffff' },
  registerLink: { marginTop: 15, padding: 10 },
  registerLinkText: { color: '#00e5ff', fontSize: 16, fontWeight: 'bold', textDecorationLine: 'underline' },

  // עיצוב חלונות קופצים (Modals)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#0a0026', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(138, 43, 226, 0.4)' },
  modalIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0, 229, 255, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', marginBottom: 20 },
  modalSubtitle: { fontSize: 15, color: '#aaaaaa', textAlign: 'center', marginBottom: 30 },
  passwordRulesText: { color: '#888', fontSize: 12, textAlign: 'left', width: '100%', marginBottom: 20, paddingHorizontal: 5 },
  codeInput: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, color: '#ffffff', fontSize: 24, paddingVertical: 18, textAlign: 'center', letterSpacing: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
  verifyBtn: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 15 },
  verifyBtnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  verifyBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  cancelBtn: { padding: 10 },
  cancelBtnText: { color: '#aaaaaa', fontSize: 16, fontWeight: 'bold' }
});