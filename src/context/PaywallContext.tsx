import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';

const INITIAL_FREE_LIMIT = 3;

type PaywallContextType = {
  messageCount: number;
  maxMessages: number;
  incrementMessageCount: () => Promise<void>;
  hasReachedLimit: boolean;
  isPro: boolean;
  currentPlan: string; // הוספנו את החבילה הנוכחית לטייפ
  purchasePackage: (plan: '20' | '50' | 'unlimited') => Promise<void>;
  chatLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  mockPurchaseSuccess: (plan: string) => Promise<void>;
  resetToFree: () => Promise<void>;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages, setMaxMessages] = useState(INITIAL_FREE_LIMIT);
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free'); // ברירת המחדל היא Free
  const [chatLanguage, setChatLanguage] = useState('English'); 

  useEffect(() => {
    AsyncStorage.getItem('@app_language').then(savedLang => {
      if (savedLang) setChatLanguage(savedLang);
    });
    if (user) loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      // טעינת החבילה הנוכחית מהזיכרון
      const savedPlan = await AsyncStorage.getItem(`@plan_${user?.id}`);
      if (savedPlan) setCurrentPlan(savedPlan);

      const proStatus = await AsyncStorage.getItem(`@is_pro_${user?.id}`);
      if (proStatus === 'true') setIsPro(true);

      const maxMsg = await AsyncStorage.getItem(`@max_msg_${user?.id}`);
      if (maxMsg) setMaxMessages(parseInt(maxMsg, 10));

      const lastResetStr = await AsyncStorage.getItem(`@last_reset_${user?.id}`);
      const countStr = await AsyncStorage.getItem(`@msg_count_${user?.id}`);
      const now = Date.now();

      if (lastResetStr) {
        const lastReset = parseInt(lastResetStr, 10);
        if (now - lastReset >= 24 * 60 * 60 * 1000) {
          setMessageCount(0);
          await AsyncStorage.setItem(`@msg_count_${user?.id}`, '0');
          await AsyncStorage.setItem(`@last_reset_${user?.id}`, now.toString());
        } else {
          if (countStr) setMessageCount(parseInt(countStr, 10));
        }
      } else {
        await AsyncStorage.setItem(`@last_reset_${user?.id}`, now.toString());
        if (countStr) setMessageCount(parseInt(countStr, 10));
      }
    } catch (e) {
      console.error('Error loading user data:', e);
    }
  };

  const incrementMessageCount = async () => {
    try {
      const now = Date.now();
      const lastResetStr = await AsyncStorage.getItem(`@last_reset_${user?.id}`);
      let lastReset = lastResetStr ? parseInt(lastResetStr, 10) : now;

      if (now - lastReset >= 24 * 60 * 60 * 1000) {
        setMessageCount(1);
        await AsyncStorage.setItem(`@msg_count_${user?.id}`, '1');
        await AsyncStorage.setItem(`@last_reset_${user?.id}`, now.toString());
      } else {
        const newCount = messageCount + 1;
        setMessageCount(newCount);
        await AsyncStorage.setItem(`@msg_count_${user?.id}`, newCount.toString());
      }
    } catch (e) { console.error('Error saving message count:', e); }
  };

  const purchasePackage = async (plan: '20' | '50' | 'unlimited') => {
    try {
      if (plan === 'unlimited') {
        setIsPro(true);
        await AsyncStorage.setItem(`@is_pro_${user?.id}`, 'true');
      } else {
        const addedMessages = plan === '20' ? 20 : 50;
        const newMax = maxMessages + addedMessages;
        setMaxMessages(newMax);
        await AsyncStorage.setItem(`@max_msg_${user?.id}`, newMax.toString());
      }
    } catch (e) { console.error('Error purchasing package:', e); }
  };

  const changeLanguage = async (lang: string) => {
    try {
      setChatLanguage(lang);
      await AsyncStorage.setItem('@app_language', lang);
    } catch (e) { console.error('Error saving language:', e); }
  };

  // פונקציית הפיתוח עודכנה לשמור גם את שם החבילה
  const mockPurchaseSuccess = async (plan: string) => {
    alert(`Dev Mode: Unlocking ${plan}...`);
    setCurrentPlan(plan);
    await AsyncStorage.setItem(`@plan_${user?.id}`, plan);

    if (plan === 'PRO') {
      await purchasePackage('unlimited');
    } else if (plan === 'Basic') {
      await purchasePackage('20');
    } else if (plan === 'Advanced') {
      await purchasePackage('50');
    }
  };

  // איפוס גם של החבילה השמורה
  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account...');
    setIsPro(false);
    setCurrentPlan('Free');
    setMaxMessages(INITIAL_FREE_LIMIT);
    setMessageCount(0);
    await AsyncStorage.setItem(`@plan_${user?.id}`, 'Free');
    await AsyncStorage.setItem(`@is_pro_${user?.id}`, 'false');
    await AsyncStorage.setItem(`@max_msg_${user?.id}`, INITIAL_FREE_LIMIT.toString());
    await AsyncStorage.setItem(`@msg_count_${user?.id}`, '0');
  };

  return (
    <PaywallContext.Provider value={{ 
      messageCount, maxMessages, incrementMessageCount, 
      hasReachedLimit: !isPro && messageCount >= maxMessages, 
      isPro, currentPlan, purchasePackage,
      chatLanguage, changeLanguage,
      mockPurchaseSuccess, resetToFree 
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