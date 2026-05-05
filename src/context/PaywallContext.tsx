import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getUserSubscriptionData, updateSubscriptionData, updateUserLanguage } from '../utils/db';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type PaywallContextType = {
  cycleUsedMessages: number;
  lifetimeMessages: number;
  cycleLimit: number;
  cycleStartDate: number;
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
  refreshSubscription: () => Promise<void>; 
  incrementLocalCounter: () => void;
  // 🌟 סטייטים חדשים עבור מצב הגיבוי (Fallback)
  isFallbackMode: boolean;
  fallbackUsedMessages: number;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth(); 
  
  const [cycleUsedMessages, setCycleUsedMessages] = useState(0);
  const [lifetimeMessages, setLifetimeMessages] = useState(0);
  const [cycleLimit, setCycleLimit] = useState(3);
  const [cycleStartDate, setCycleStartDate] = useState(Date.now());
  
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free'); 
  const [chatLanguage, setChatLanguage] = useState('English'); 

  const [hasUsedTrial, setHasUsedTrial] = useState(false); 
  const [isTrialActive, setIsTrialActive] = useState(false); 

  // 🌟 סטייטים למצב Fallback
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [fallbackUsedMessages, setFallbackUsedMessages] = useState(0);
  const [fallbackStartDate, setFallbackStartDate] = useState(Date.now());

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
        let usedCount = data.cycle_used_messages || 0;
        let lifetime = data.lifetime_messages || 0;
        let limit = data.cycle_limit || 3;
        let startDate = data.cycle_start_date || now;
        let plan = data.current_plan || 'Free';
        
        // נתוני Fallback מהדאטה-בייס
        let fbUsed = data.fallback_used_messages || 0;
        let fbStart = data.fallback_start_date || now;
        let fallbackActive = false;

        let updates: any = {};
        let needsUpdate = false;

        const isMonthly = plan === 'PREMIUM' || plan === 'PRO_monthly';
        const isOneTime = plan === 'PRO_onetime';
        const cycleMs = isMonthly ? THIRTY_DAYS_MS : ONE_DAY_MS;

        // איפוס חבילה רגילה (חודשית או יומית)
        if (!isOneTime && (now - startDate >= cycleMs)) {
          usedCount = 0;
          startDate = now;
          updates.cycle_used_messages = 0;
          updates.cycle_start_date = now;
          needsUpdate = true;
          
          // אם התאפס החודש, מבטלים את מצב הגיבוי
          fbUsed = 0;
          fbStart = now;
          updates.fallback_used_messages = 0;
          updates.fallback_start_date = now;
        }

        // המרת PRO_onetime ל-Free כשנגמרת המכסה
        if (isOneTime && usedCount >= limit) {
          plan = 'Free';
          limit = 3;
          usedCount = 0;
          startDate = now;
          updates.current_plan = 'Free';
          updates.is_pro = false;
          updates.cycle_limit = 3;
          updates.cycle_used_messages = 0;
          updates.cycle_start_date = now;
          needsUpdate = true;
        }

        // 🌟 הפעלת ואיפוס מצב גיבוי (Fallback) רק עבור PRO_monthly שנגמרה להם המכסה
        if (plan === 'PRO_monthly' && usedCount >= limit) {
          fallbackActive = true;
          // אם עברו 24 שעות מהאיפוס האחרון של הגיבוי היומי
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
        setHasUsedTrial(data.has_used_premium_trial || false);
        
        // עדכון סטייטים של ה-Fallback
        setIsFallbackMode(fallbackActive);
        setFallbackUsedMessages(fbUsed);
        setFallbackStartDate(fbStart);

      } else {
        await updateSubscriptionData(token, user.id, {
          cycle_used_messages: 0,
          lifetime_messages: 0,
          cycle_limit: 3,
          cycle_start_date: now,
          current_plan: 'Free',
          is_pro: false,
          has_used_premium_trial: false,
          fallback_used_messages: 0,
          fallback_start_date: now
        });
        setCycleUsedMessages(0);
        setLifetimeMessages(0);
        setCycleLimit(3);
        setCycleStartDate(now);
        setIsPro(false);
        setCurrentPlan('Free');
        setHasUsedTrial(false);
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
    // 🌟 אם אנחנו במצב גיבוי, נקדם את מונה הגיבוי. אם לא, את המונה הרגיל.
    if (isFallbackMode) {
      setFallbackUsedMessages(prev => prev + 1);
    } else {
      setCycleUsedMessages(prev => prev + 1);
    }
    setLifetimeMessages(prev => prev + 1);
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
              updates = { is_pro: true, current_plan: 'PREMIUM', cycle_limit: 500, cycle_used_messages: 0, cycle_start_date: now };
            } else if (plan === 'PRO_monthly') {
              updates = { is_pro: true, current_plan: 'PRO_monthly', cycle_limit: 50, cycle_used_messages: 0, cycle_start_date: now };
            } else if (plan === 'PRO_onetime') {
              updates = { is_pro: true, current_plan: 'PRO_onetime', cycle_limit: 50, cycle_used_messages: 0, cycle_start_date: now };
            }

            // איפוס גם למשתני ה-Fallback בעת רכישה
            updates.fallback_used_messages = 0;
            updates.fallback_start_date = now;

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
        if (token) await updateUserLanguage(token, user.id, lang);
      }
    } catch (e) { console.error('Error saving language:', e); }
  };

  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account...');
    const now = Date.now();
    setIsPro(false);
    setCurrentPlan('Free');
    setCycleLimit(3);
    setCycleUsedMessages(0);
    setCycleStartDate(now);
    setHasUsedTrial(false); 
    setIsTrialActive(false);
    setIsFallbackMode(false);
    setFallbackUsedMessages(0);
    setFallbackStartDate(now);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
          await updateSubscriptionData(token, user.id, {
              current_plan: 'Free',
              is_pro: false,
              cycle_limit: 3,
              cycle_used_messages: 0,
              cycle_start_date: now,
              has_used_premium_trial: false,
              fallback_used_messages: 0,
              fallback_start_date: now
          });
       }
    }
  };

  // 🌟 הגדרה חכמה של hasReachedLimit
  let calculatedHasReachedLimit = false;
  if (!isTrialActive) {
    if (currentPlan === 'PRO_monthly' && isFallbackMode) {
      // אם הוא בגיבוי, הוא נחסם רק אחרי 2 הודעות
      calculatedHasReachedLimit = fallbackUsedMessages >= 2;
    } else {
      // אחרת, הבדיקה הרגילה
      calculatedHasReachedLimit = cycleUsedMessages >= cycleLimit;
    }
  }

  return (
    <PaywallContext.Provider value={{ 
      cycleUsedMessages, lifetimeMessages, cycleLimit, cycleStartDate,
      hasReachedLimit: calculatedHasReachedLimit, isPro, currentPlan, purchasePackage,
      chatLanguage, changeLanguage, resetToFree,
      hasUsedTrial, isTrialActive, startPremiumTrial, refreshSubscription,
      incrementLocalCounter,
      isFallbackMode, fallbackUsedMessages
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