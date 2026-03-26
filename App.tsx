import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import { tokenCache } from './src/utils/tokenCache';
import { PaywallProvider } from './src/context/PaywallContext';

// מושכים את המפתח המאובטח מקובץ ה-.env
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

// בדיקת בטיחות: מוודא שהמפתח אכן נמצא לפני שהאפליקציה עולה
if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env");
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <StatusBar style="light" />
      
      {/* אם המשתמש מחובר - תראה לו את הצ'אט, ועטוף אותו במונה ההודעות */}
      <SignedIn>
        <PaywallProvider>
          <ChatScreen />
        </PaywallProvider>
      </SignedIn>
      
      {/* אם המשתמש מנותק - תראה לו את מסך ההתחברות */}
      <SignedOut>
        <LoginScreen />
      </SignedOut>
      
    </ClerkProvider>
  );
}