import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context'; // <--- הייבוא החדש שהוספנו
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import { tokenCache } from './src/utils/tokenCache';
import { PaywallProvider } from './src/context/PaywallContext';
// 1. ייבאנו את קומפוננטת תנאי השימוש שיצרנו
import TermsModal from './src/components/TermsModal'; 

// מושכים את המפתח המאובטח מקובץ ה-.env
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// בדיקת בטיחות: מוודא שהמפתח אכן נמצא לפני שהאפליקציה עולה
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env");
}

export default function App() {
  return (
    // עטפנו את כל האפליקציה ב-SafeAreaProvider כדי שהמסכים לא יקפצו למעלה
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <StatusBar style="light" />
        
        {/* אם המשתמש מחובר - תראה לו את הצ'אט, ועטוף אותו במונה ההודעות */}
        <SignedIn>
          <PaywallProvider>
            {/* 2. הוספנו את מודל תנאי השימוש כאן. הוא יקפוץ מעל הצ'אט אם המשתמש עוד לא אישר */}
            <TermsModal />
            <ChatScreen />
          </PaywallProvider>
        </SignedIn>
        
        {/* אם המשתמש מנותק - תראה לו את מסך ההתחברות */}
        <SignedOut>
          <LoginScreen />
        </SignedOut>
        
      </ClerkProvider>
    </SafeAreaProvider>
  );
}