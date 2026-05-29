import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-expo';
import Purchases from 'react-native-purchases';

import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/LoginScreen';
import { tokenCache } from './src/utils/tokenCache';
import { PaywallProvider } from './src/context/PaywallContext';
import TermsModal from './src/components/TermsModal'; 

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env");
}

export default function App() {
  const [isRcReady, setIsRcReady] = useState(false);

  useEffect(() => {
    const setupPurchases = async () => {
      if (REVENUECAT_API_KEY) {
        // עוטפים ב-try-catch כדי למנוע קריסה קטלנית אם המפתח שגוי
        try {
          await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
          console.log("🚀 RevenueCat configured successfully");
        } catch (e) {
          console.error("Failed to configure RevenueCat:", e);
        }
      } else {
        console.warn("⚠️ RevenueCat API Key is missing in .env");
      }
      // נותנים אור ירוק לאפליקציה להמשיך לעלות רק אחרי שזה הסתיים
      setIsRcReady(true);
    };

    setupPurchases();
  }, []);

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
        <StatusBar style="light" />
        
        <SignedIn>
          {isRcReady && (
            <PaywallProvider>
              <TermsModal />
              <ChatScreen />
            </PaywallProvider>
          )}
        </SignedIn>
        
        <SignedOut>
          <LoginScreen />
        </SignedOut>
        
      </ClerkProvider>
    </SafeAreaProvider>
  );
}