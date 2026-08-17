import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getUserSubscriptionData, updateSubscriptionData, updateUserLanguage } from '../utils/db';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type PaywallContextType = {
  cycleUsedMessages: number;
  lifetimeMessages: number;
  cycleLimit: number;
  cycleStartDate: number;
  hasReachedLimit: boolean;
  isPro: boolean;
  currentPlan: string; 
  effectivePlan: string; 
  purchasePackage: (plan: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM') => Promise<void>;
  chatLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  resetToFree: () => Promise<void>;
  refreshSubscription: () => Promise<void>; 
  incrementLocalCounter: () => void;
  isFallbackMode: boolean;
  fallbackUsedMessages: number;
  grantRewardMessage: () => Promise<void>; 
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth(); 
  
  const [cycleUsedMessages, setCycleUsedMessages] = useState(0);
  const [lifetimeMessages, setLifetimeMessages] = useState(0);
  const [cycleLimit, setCycleLimit] = useState(1); 
  const [cycleStartDate, setCycleStartDate] = useState(Date.now());
  
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free'); 
  const [chatLanguage, setChatLanguage] = useState('English'); 

  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [fallbackUsedMessages, setFallbackUsedMessages] = useState(0);
  const [fallbackStartDate, setFallbackStartDate] = useState(Date.now());

  useEffect(() => {
    AsyncStorage.getItem('@app_language').then(savedLang => {
      if (savedLang) setChatLanguage(savedLang);
    });
    
    const initRevenueCatLogin = async () => {
      if (user?.id) {
        try {
          await Purchases.logIn(user.id);
          loadUserData();
        } catch (error) {
          console.error("Error logging into RevenueCat:", error);
          loadUserData();
        }
      }
    };

    initRevenueCatLogin();
  }, [user]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const data = await getUserSubscriptionData(token, user.id);
      const now = Date.now();

      if (data) {
        let usedCount = data.cycle_used_messages || 0;
        let lifetime = data.lifetime_messages || 0;
        let limit = data.cycle_limit || 1; 
        let startDate = data.cycle_start_date || now;
        let plan = data.current_plan || 'Free';
        
        let fbUsed = data.fallback_used_messages || 0;
        let fbStart = data.fallback_start_date || now;
        let fallbackActive = false;

        let updates: any = {};
        let needsUpdate = false;

        const isOneTime = plan === 'PRO_onetime';

        if (isOneTime && usedCount >= limit) {
          plan = 'Free';
          limit = 1;
          usedCount = 0;
          startDate = now;
          updates.current_plan = 'Free';
          updates.is_pro = false;
          updates.cycle_limit = 1;
          updates.cycle_used_messages = 0;
          updates.cycle_start_date = now;
          needsUpdate = true;
        }

        if (plan === 'PRO_monthly' && usedCount >= limit) {
          fallbackActive = true;
          if (now - fbStart >= ONE_DAY_MS) {
            fbUsed = 0;
            fbStart = now;
            updates.fallback_used_messages = 0;
            updates.fallback_start_date = now;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await updateSubscriptionData(token, user.id, updates);
        }

        setCycleUsedMessages(usedCount);
        setLifetimeMessages(lifetime);
        setCycleLimit(limit);
        setCycleStartDate(startDate);
        setIsPro(data.is_pro || plan !== 'Free');
        setCurrentPlan(plan);
        
        setIsFallbackMode(fallbackActive);
        setFallbackUsedMessages(fbUsed);
        setFallbackStartDate(fbStart);

      } else {
        await updateSubscriptionData(token, user.id, {
          cycle_used_messages: 0,
          lifetime_messages: 0,
          cycle_limit: 1, 
          cycle_start_date: now,
          current_plan: 'Free',
          is_pro: false,
          has_used_premium_trial: false,
          fallback_used_messages: 0,
          fallback_start_date: now
        });
        setCycleUsedMessages(0);
        setLifetimeMessages(0);
        setCycleLimit(1);
        setCycleStartDate(now);
        setIsPro(false);
        setCurrentPlan('Free');
        setIsFallbackMode(false);
        setFallbackUsedMessages(0);
        setFallbackStartDate(now);
      }
    } catch (e) {
      console.error('Error loading user data from DB:', e);
    }
  };

  const refreshSubscription = async () => {
    await loadUserData();
  };

  const incrementLocalCounter = () => {
    if (isFallbackMode) {
      setFallbackUsedMessages(prev => prev + 1);
    } else {
      setCycleUsedMessages(prev => prev + 1);
    }
    setLifetimeMessages(prev => prev + 1);
  };

  // 🌟 התיקון לספירת הפרסומות: שימוש ב-Callback מדויק למניעת דריסה
  const grantRewardMessage = async () => {
    setCycleLimit(prevLimit => {
      const newLimit = prevLimit + 1;
      
      if (user?.id) {
        getToken({ template: 'supabase' }).then(token => {
          if (token) {
            updateSubscriptionData(token, user.id, { cycle_limit: newLimit });
          }
        }).catch(e => console.error("Error saving rewarded limit:", e));
      }
      
      return newLimit;
    });
  };

  const purchasePackage = async (plan: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM') => {
    if (!user?.id) return;
    try {
      const offerings = await Purchases.getOfferings();
      
      if (offerings.current !== null) {
        let selectedPackage: PurchasesPackage | null = null;
        const availablePackages = offerings.current.availablePackages;

        if (plan === 'PRO_monthly') {
          selectedPackage = availablePackages.find(p => p.identifier === '$rc_monthly') || null;
        } else if (plan === 'PRO_onetime') {
          selectedPackage = availablePackages.find(p => p.identifier === '$rc_lifetime') || null;
        } else if (plan === 'PREMIUM') {
          selectedPackage = availablePackages.find(p => p.identifier === 'premium_monthly') || null;
        }

        if (selectedPackage) {
          const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
          
          if (typeof customerInfo.entitlements.active['Fixra AI Pro'] !== "undefined") {
            const token = await getToken({ template: 'supabase' });
            if (!token) return;

            const now = Date.now();
            let updates: any = {};

            if (plan === 'PREMIUM') {
              updates = { is_pro: true, current_plan: 'PREMIUM', cycle_limit: 500, cycle_used_messages: 0, cycle_start_date: now };
            } else if (plan === 'PRO_monthly') {
              updates = { is_pro: true, current_plan: 'PRO_monthly', cycle_limit: 50, cycle_used_messages: 0, cycle_start_date: now };
            } else if (plan === 'PRO_onetime') {
              updates = { is_pro: true, current_plan: 'PRO_onetime', cycle_limit: 50, cycle_used_messages: 0, cycle_start_date: now };
            }

            updates.fallback_used_messages = 0;
            updates.fallback_start_date = now;

            await updateSubscriptionData(token, user.id, updates);
            await loadUserData(); 
            alert(`Purchase successful! Welcome to ${plan}`);
          }
        } else {
           console.log(`Package configuration not found for: ${plan}`);
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
        if (token) await updateUserLanguage(token, user.id, lang);
      }
    } catch (e) { console.error('Error saving language:', e); }
  };

  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account...');
    const now = Date.now();
    setIsPro(false);
    setCurrentPlan('Free');
    setCycleLimit(1);
    setCycleUsedMessages(0);
    setCycleStartDate(now);
    setIsFallbackMode(false);
    setFallbackUsedMessages(0);
    setFallbackStartDate(now);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
          await updateSubscriptionData(token, user.id, {
              current_plan: 'Free',
              is_pro: false,
              cycle_limit: 1,
              cycle_used_messages: 0,
              cycle_start_date: now,
              has_used_premium_trial: false,
              fallback_used_messages: 0,
              fallback_start_date: now
          });
       }
    }
  };

  let calculatedHasReachedLimit = false;
  if (currentPlan === 'PRO_monthly' && isFallbackMode) {
    calculatedHasReachedLimit = fallbackUsedMessages >= 2;
  } else {
    calculatedHasReachedLimit = cycleUsedMessages >= cycleLimit;
  }

  // 🌟 לוגיקת המעבר (המשפך) החדשה והפשוטה
  let effectivePlan = currentPlan;
  if (currentPlan === 'Free') {
    if (cycleLimit === 2) effectivePlan = 'PRO_monthly';
    else if (cycleLimit >= 3) effectivePlan = 'PREMIUM';
  }

  return (
    <PaywallContext.Provider value={{ 
      cycleUsedMessages, lifetimeMessages, cycleLimit, cycleStartDate,
      hasReachedLimit: calculatedHasReachedLimit, isPro, currentPlan, effectivePlan, purchasePackage,
      chatLanguage, changeLanguage, resetToFree,
      refreshSubscription, incrementLocalCounter,
      isFallbackMode, fallbackUsedMessages,
      grantRewardMessage
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