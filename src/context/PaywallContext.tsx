import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getUserSubscriptionData, updateSubscriptionData, updateUserLanguage } from '../utils/db';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

const DAILY_FREE_LIMIT = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type PaywallContextType = {
  dailyCount: number;
  messageCount: number;
  maxMessages: number;
  incrementMessageCount: () => Promise<void>;
  hasReachedLimit: boolean;
  isPro: boolean;
  currentPlan: string; 
  purchasePackage: (plan: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM') => Promise<void>;
  chatLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  resetToFree: () => Promise<void>;
  hasUsedTrial: boolean;
  isTrialActive: boolean; 
  startPremiumTrial: () => Promise<boolean>;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth(); 
  
  const [dailyCount, setDailyCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages, setMaxMessages] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free'); 
  const [chatLanguage, setChatLanguage] = useState('English'); 

  const [hasUsedTrial, setHasUsedTrial] = useState(false); 
  const [isTrialActive, setIsTrialActive] = useState(false); 

  useEffect(() => {
    AsyncStorage.getItem('@app_language').then(savedLang => {
      if (savedLang) setChatLanguage(savedLang);
    });
    
    if (user) {
      Purchases.logIn(user.id); 
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const data = await getUserSubscriptionData(token, user.id);
      const now = Date.now();

      if (data) {
        let currentCount = data.message_count || 0;
        let lastReset = data.last_reset || now;
        let currentDailyCount = data.daily_message_count || 0;
        let lastDailyReset = data.last_daily_reset || now;
        let plan = data.current_plan || 'Free';
        
        let maxMsg = plan === 'Free' ? 0 : (data.max_messages || 0);

        let updates: any = {};
        let needsUpdate = false;

        const isMonthlyPlan = plan === 'PREMIUM' || plan === 'PRO_monthly';

        if (now - lastReset >= THIRTY_DAYS_MS && isMonthlyPlan) {
          currentCount = 0;
          lastReset = now;
          updates.message_count = 0;
          updates.last_reset = now;
          needsUpdate = true;
        }

        if (now - lastDailyReset >= ONE_DAY_MS) {
          currentDailyCount = 0;
          lastDailyReset = now;
          updates.daily_message_count = 0;
          updates.last_daily_reset = now;
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateSubscriptionData(token, user.id, updates);
        }

        setDailyCount(currentDailyCount);
        setMessageCount(currentCount);
        setMaxMessages(maxMsg);
        setIsPro(data.is_pro || false);
        setCurrentPlan(plan);
        setHasUsedTrial(data.has_used_premium_trial || false);

      } else {
        await updateSubscriptionData(token, user.id, {
          daily_message_count: 0,
          last_daily_reset: now,
          message_count: 0,
          max_messages: 0,
          current_plan: 'Free',
          is_pro: false,
          last_reset: now,
          has_used_premium_trial: false 
        });
        setDailyCount(0);
        setMessageCount(0);
        setMaxMessages(0);
        setIsPro(false);
        setCurrentPlan('Free');
        setHasUsedTrial(false);
      }
    } catch (e) {
      console.error('Error loading user data from DB:', e);
    }
  };

  const startPremiumTrial = async (): Promise<boolean> => {
    if (!user?.id || hasUsedTrial) return false; 
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return false;

      await updateSubscriptionData(token, user.id, {
        has_used_premium_trial: true
      });

      setHasUsedTrial(true);
      setIsTrialActive(true); 
      return true;
    } catch (error) {
      console.error('Error starting trial:', error);
      return false;
    }
  };

  const incrementMessageCount = async () => {
    if (!user?.id) return;

    if (isTrialActive) {
      setIsTrialActive(false);
      return; 
    }

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const data = await getUserSubscriptionData(token, user.id);
      const now = Date.now();
      
      let currentCount = data?.message_count || 0;
      let lastReset = data?.last_reset || now;
      let currentDailyCount = data?.daily_message_count || 0;
      let lastDailyReset = data?.last_daily_reset || now;

      let updates: any = {};
      const isMonthlyPlan = currentPlan === 'PREMIUM' || currentPlan === 'PRO_monthly';

      if (now - lastDailyReset >= ONE_DAY_MS) {
        currentDailyCount = 0;
        lastDailyReset = now;
      }
      if (now - lastReset >= THIRTY_DAYS_MS && isMonthlyPlan) {
        currentCount = 0;
        lastReset = now;
      }

      if (currentDailyCount < DAILY_FREE_LIMIT) {
        currentDailyCount += 1;
        updates.daily_message_count = currentDailyCount;
        updates.last_daily_reset = lastDailyReset;
      } else {
        currentCount += 1;
        updates.message_count = currentCount;
        updates.last_reset = lastReset;

        // 🌟 הנה התיקון שביקשת! החזרה אוטומטית ל-Free ברגע שנגמרות ההודעות בחד-פעמי 🌟
        if (currentPlan === 'PRO_onetime' && currentCount >= (data?.max_messages || 50)) {
          updates.current_plan = 'Free';
          updates.is_pro = false;
          updates.max_messages = 0;
          updates.message_count = 0; // נאפס לו כדי שיראה "נקי" בתור חינמי

          setCurrentPlan('Free');
          setIsPro(false);
          setMaxMessages(0);
          currentCount = 0; 
        }
      }

      setDailyCount(currentDailyCount);
      setMessageCount(currentCount);

      await updateSubscriptionData(token, user.id, updates);
    } catch (e) { console.error('Error saving message count to DB:', e); }
  };

  const purchasePackage = async (plan: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM') => {
    if (!user?.id) return;
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        let selectedPackage: PurchasesPackage | null = null;

        if (plan === 'PRO_monthly') selectedPackage = offerings.current.monthly;
        if (plan === 'PRO_onetime') selectedPackage = offerings.current.annual; 
        if (plan === 'PREMIUM') selectedPackage = offerings.current.lifetime;

        if (selectedPackage) {
          const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
          
          if (typeof customerInfo.entitlements.active['Fixra AI Pro'] !== "undefined") {
            const token = await getToken({ template: 'supabase' });
            if (!token) return;

            const now = Date.now();
            let updates: any = {};

            if (plan === 'PREMIUM') {
              setMaxMessages(1000);
              setMessageCount(0);
              setIsPro(true);
              updates = { is_pro: true, current_plan: 'PREMIUM', max_messages: 1000, message_count: 0, last_reset: now };
            } else if (plan === 'PRO_monthly') {
              setMaxMessages(50);
              setMessageCount(0);
              setIsPro(false);
              updates = { max_messages: 50, message_count: 0, last_reset: now, current_plan: 'PRO_monthly', is_pro: false };
            } else if (plan === 'PRO_onetime') {
              setMaxMessages(50);
              setMessageCount(0);
              setIsPro(false);
              updates = { max_messages: 50, message_count: 0, last_reset: now, current_plan: 'PRO_onetime', is_pro: false };
            }

            await updateSubscriptionData(token, user.id, updates);
            await loadUserData(); 
            alert(`Purchase successful! Welcome to ${plan}`);
          }
        }
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error("Purchase failed", e);
        alert("Purchase error: " + e.message);
      }
    }
  };

  const changeLanguage = async (lang: string) => {
    try {
      setChatLanguage(lang);
      await AsyncStorage.setItem('@app_language', lang);
      
      if (user?.id) {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          await updateUserLanguage(token, user.id, lang);
        }
      }
    } catch (e) { 
      console.error('Error saving language:', e); 
    }
  };

  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account (and resetting Trial)...');
    const now = Date.now();
    setIsPro(false);
    setCurrentPlan('Free');
    setMaxMessages(0);
    setMessageCount(0);
    setDailyCount(0);
    setHasUsedTrial(false); 
    setIsTrialActive(false);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
          await updateSubscriptionData(token, user.id, {
              current_plan: 'Free',
              is_pro: false,
              max_messages: 0,
              message_count: 0,
              daily_message_count: 0,
              last_daily_reset: now,
              has_used_premium_trial: false
          });
       }
    }
  };

  const hasReachedLimit = (dailyCount >= DAILY_FREE_LIMIT) && (messageCount >= maxMessages) && !isTrialActive;

  return (
    <PaywallContext.Provider value={{ 
      dailyCount, messageCount, maxMessages, incrementMessageCount, 
      hasReachedLimit, isPro, currentPlan, purchasePackage,
      chatLanguage, changeLanguage, resetToFree,
      hasUsedTrial, isTrialActive, startPremiumTrial
    }}>
      {children}
    </PaywallContext.Provider>
  );
};

export const usePaywall = () => {
  const context = useContext(PaywallContext);
  if (!context) throw new Error('usePaywall must be used within a PaywallProvider');
  return context;
};