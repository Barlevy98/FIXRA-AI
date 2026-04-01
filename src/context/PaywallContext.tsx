import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getUserSubscriptionData, updateSubscriptionData } from '../utils/db'; // הייבוא החדש שלנו

const INITIAL_FREE_LIMIT = 3;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type PaywallContextType = {
  messageCount: number;
  maxMessages: number;
  incrementMessageCount: () => Promise<void>;
  hasReachedLimit: boolean;
  isPro: boolean;
  currentPlan: string; 
  purchasePackage: (plan: '20' | '50' | 'unlimited') => Promise<void>;
  chatLanguage: string;
  changeLanguage: (lang: string) => Promise<void>;
  mockPurchaseSuccess: (plan: string) => Promise<void>;
  resetToFree: () => Promise<void>;
};

const PaywallContext = createContext<PaywallContextType | undefined>(undefined);

export const PaywallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useUser();
  const { getToken } = useAuth(); // הבאנו את הטוקן של Clerk
  
  const [messageCount, setMessageCount] = useState(0);
  const [maxMessages, setMaxMessages] = useState(INITIAL_FREE_LIMIT);
  const [isPro, setIsPro] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>('Free'); 
  const [chatLanguage, setChatLanguage] = useState('English'); 

  useEffect(() => {
    // שפה עדיין שומרים מקומית כי זה תלוי במכשיר
    AsyncStorage.getItem('@app_language').then(savedLang => {
      if (savedLang) setChatLanguage(savedLang);
    });
    
    if (user) loadUserData();
  }, [user]);

  // טעינת נתונים ישירות מ-Supabase
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

        // אם עברו 30 יום מהאיפוס האחרון - נאפס גם בסטייט וגם בשרת
        if (now - lastReset >= THIRTY_DAYS_MS) {
          currentCount = 0;
          lastReset = now;
          await updateSubscriptionData(token, user.id, {
            message_count: 0,
            last_reset: now
          });
        }

        setMessageCount(currentCount);
        setMaxMessages(data.max_messages ?? INITIAL_FREE_LIMIT);
        setIsPro(data.is_pro || false);
        setCurrentPlan(data.current_plan || 'Free');

      } else {
        // אם המשתמש פותח את האפליקציה פעם ראשונה ואין לו שורה בטבלה
        await updateSubscriptionData(token, user.id, {
          message_count: 0,
          max_messages: INITIAL_FREE_LIMIT,
          current_plan: 'Free',
          is_pro: false,
          last_reset: now
        });
        setMessageCount(0);
        setMaxMessages(INITIAL_FREE_LIMIT);
        setIsPro(false);
        setCurrentPlan('Free');
      }
    } catch (e) {
      console.error('Error loading user data from DB:', e);
    }
  };

  // העלאת המונה וסנכרון מול השרת
  const incrementMessageCount = async () => {
    if (!user?.id) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const data = await getUserSubscriptionData(token, user.id);
      const now = Date.now();
      let lastReset = data?.last_reset || now;
      let newCount = (data?.message_count || 0);

      // מוודאים שוב שעברו 30 יום לפני שמעלים
      if (now - lastReset >= THIRTY_DAYS_MS) {
        newCount = 1;
        lastReset = now;
      } else {
        newCount += 1;
      }

      setMessageCount(newCount);
      // מעדכנים בענן
      await updateSubscriptionData(token, user.id, {
        message_count: newCount,
        last_reset: lastReset
      });
    } catch (e) { console.error('Error saving message count to DB:', e); }
  };

  // רכישת חבילה ועדכון השרת
  const purchasePackage = async (plan: '20' | '50' | 'unlimited') => {
    if (!user?.id) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const now = Date.now();
      let updates: any = {};

      if (plan === 'unlimited') {
        setIsPro(true);
        updates = { is_pro: true };
      } else {
        const newMax = plan === '20' ? 20 : 50;
        setMaxMessages(newMax);
        setMessageCount(0);
        
        updates = {
          max_messages: newMax,
          message_count: 0,
          last_reset: now
        };
      }

      await updateSubscriptionData(token, user.id, updates);
    } catch (e) { console.error('Error purchasing package:', e); }
  };

  const changeLanguage = async (lang: string) => {
    try {
      setChatLanguage(lang);
      await AsyncStorage.setItem('@app_language', lang);
    } catch (e) { console.error('Error saving language:', e); }
  };

  // פונקציית דמה לרכישות שמדמה רכישה דרך השרת
  const mockPurchaseSuccess = async (plan: string) => {
    alert(`Dev Mode: Unlocking ${plan}...`);
    setCurrentPlan(plan);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
           await updateSubscriptionData(token, user.id, { current_plan: plan });
       }
    }

    if (plan === 'PRO') {
      await purchasePackage('unlimited');
    } else if (plan === 'Basic') {
      await purchasePackage('20');
    } else if (plan === 'Advanced') {
      await purchasePackage('50');
    }
  };

  // איפוס לחינמי שמסנכרן בחזרה לשרת
  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account...');
    setIsPro(false);
    setCurrentPlan('Free');
    setMaxMessages(INITIAL_FREE_LIMIT);
    setMessageCount(0);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
          await updateSubscriptionData(token, user.id, {
              current_plan: 'Free',
              is_pro: false,
              max_messages: INITIAL_FREE_LIMIT,
              message_count: 0
          });
       }
    }
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