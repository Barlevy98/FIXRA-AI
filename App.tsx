import React, { useEffect } from 'react'; // 1. הוספנו את useEffect
import { Platform } from 'react-native'; // לייבוא זיהוי מערכת ההפעלה
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import Purchases from 'react-native-purchases'; // 2. ייבוא של RevenueCat

import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import { tokenCache } from './src/utils/tokenCache';
import { PaywallProvider } from './src/context/PaywallContext';
import TermsModal from './src/components/TermsModal'; 

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
// שליפת המפתח של RevenueCat מה-.env
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env");
}

export default function App() {

  // 3. הגדרת RevenueCat ברגע שהאפליקציה נדלקת
  useEffect(() => {
    const setupPurchases = async () => {
      if (REVENUECAT_API_KEY) {
        // אנחנו מגדירים את המפתח. ה-configure יודע לחבר אותנו לשרת
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        console.log("🚀 RevenueCat configured successfully");
      } else {
        console.warn("⚠️ RevenueCat API Key is missing in .env");
      }
    };

    setupPurchases();
  }, []);

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <StatusBar style="light" />
        
        <SignedIn>
          <PaywallProvider>
            <TermsModal />
            <ChatScreen />
          </PaywallProvider>
        </SignedIn>
        
        <SignedOut>
          <LoginScreen />
        </SignedOut>
        
      </ClerkProvider>
    </SafeAreaProvider>
  );
}