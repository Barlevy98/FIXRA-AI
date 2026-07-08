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

const REVENUECAT_APPLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY || '';
const REVENUECAT_ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env");
}

export default function App() {
  const [isRcReady, setIsRcReady] = useState(false);

  useEffect(() => {
    const setupPurchases = async () => {
      try {
        // בודקים איזו פלטפורמה רצה ומשתמשים במפתח המתאים
        if (Platform.OS === 'ios' && REVENUECAT_APPLE_KEY) {
          await Purchases.configure({ apiKey: REVENUECAT_APPLE_KEY });
          console.log("🚀 RevenueCat configured successfully for iOS");
        } else if (Platform.OS === 'android' && REVENUECAT_ANDROID_KEY) {
          await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
          console.log("🚀 RevenueCat configured successfully for Android");
        } else {
          console.warn(`⚠️ RevenueCat API Key is missing for platform: ${Platform.OS}`);
        }
      } catch (e) {
        console.error("Failed to configure RevenueCat:", e);
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