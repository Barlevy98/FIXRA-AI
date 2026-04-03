import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { getUserSubscriptionData, updateSubscriptionData } from '../utils/db';

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
  mockPurchaseSuccess: (plan: string) => Promise<void>;
  resetToFree: () => Promise<void>;
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

  useEffect(() => {
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
        let currentDailyCount = data.daily_message_count || 0;
        let lastDailyReset = data.last_daily_reset || now;
        let plan = data.current_plan || 'Free';
        
        let maxMsg = plan === 'Free' ? 0 : (data.max_messages || 0);

        let updates: any = {};
        let needsUpdate = false;

        // בודק אם זו חבילה חודשית שדורשת איפוס של 30 יום
        const isMonthlyPlan = plan === 'PREMIUM' || plan === 'PRO_monthly';

        // איפוס חודשי לחבילות מינוי (מתעלם מחד-פעמי)
        if (now - lastReset >= THIRTY_DAYS_MS && isMonthlyPlan) {
          currentCount = 0;
          lastReset = now;
          updates.message_count = 0;
          updates.last_reset = now;
          needsUpdate = true;
        }

        // איפוס יומי ל-3 הודעות החינמיות
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

      } else {
        // משתמש חדש לגמרי
        await updateSubscriptionData(token, user.id, {
          daily_message_count: 0,
          last_daily_reset: now,
          message_count: 0,
          max_messages: 0,
          current_plan: 'Free',
          is_pro: false,
          last_reset: now
        });
        setDailyCount(0);
        setMessageCount(0);
        setMaxMessages(0);
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
      
      let currentCount = data?.message_count || 0;
      let lastReset = data?.last_reset || now;
      let currentDailyCount = data?.daily_message_count || 0;
      let lastDailyReset = data?.last_daily_reset || now;

      let updates: any = {};
      const isMonthlyPlan = currentPlan === 'PREMIUM' || currentPlan === 'PRO_monthly';

      // מוודאים איפוסים במקרה שהמשתמש פתח לשלוח הודעה אחרי שעבר זמן
      if (now - lastDailyReset >= ONE_DAY_MS) {
        currentDailyCount = 0;
        lastDailyReset = now;
      }
      if (now - lastReset >= THIRTY_DAYS_MS && isMonthlyPlan) {
        currentCount = 0;
        lastReset = now;
      }

      // קודם לוקחים מהיומי, אם נגמר - לוקחים מהחודשי/חד-פעמי
      if (currentDailyCount < DAILY_FREE_LIMIT) {
        currentDailyCount += 1;
        updates.daily_message_count = currentDailyCount;
        updates.last_daily_reset = lastDailyReset;
      } else {
        currentCount += 1;
        updates.message_count = currentCount;
        updates.last_reset = lastReset;
      }

      setDailyCount(currentDailyCount);
      setMessageCount(currentCount);

      await updateSubscriptionData(token, user.id, updates);
    } catch (e) { console.error('Error saving message count to DB:', e); }
  };

  // רכישת חבילה ועדכון השרת
  const purchasePackage = async (plan: 'PRO_monthly' | 'PRO_onetime' | 'PREMIUM') => {
    if (!user?.id) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const now = Date.now();
      let updates: any = {};

      if (plan === 'PREMIUM') {
        setMaxMessages(1000); // תקרת הזכוכית הסודית שלנו
        setMessageCount(0);
        setIsPro(true);
        updates = { 
          is_pro: true, 
          current_plan: 'PREMIUM',
          max_messages: 1000,
          message_count: 0,
          last_reset: now
        };
      } else if (plan === 'PRO_monthly') {
        setMaxMessages(50);
        setMessageCount(0);
        setIsPro(false); // הם לא פרימיום, הם פרו
        updates = {
          max_messages: 50,
          message_count: 0,
          last_reset: now,
          current_plan: 'PRO_monthly',
          is_pro: false
        };
      } else if (plan === 'PRO_onetime') {
        setMaxMessages(50);
        setMessageCount(0);
        setIsPro(false);
        updates = {
          max_messages: 50,
          message_count: 0,
          last_reset: now,
          current_plan: 'PRO_onetime',
          is_pro: false
        };
      }

      await updateSubscriptionData(token, user.id, updates);
      await loadUserData(); // רענון הסטייט מיד אחרי הקנייה
    } catch (e) { console.error('Error purchasing package:', e); }
  };

  const changeLanguage = async (lang: string) => {
    try {
      setChatLanguage(lang);
      await AsyncStorage.setItem('@app_language', lang);
    } catch (e) { console.error('Error saving language:', e); }
  };

  const mockPurchaseSuccess = async (plan: string) => {
    alert(`Dev Mode: Unlocking ${plan}...`);
    setCurrentPlan(plan);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
           await updateSubscriptionData(token, user.id, { current_plan: plan });
       }
    }

    if (plan === 'PREMIUM') {
      await purchasePackage('PREMIUM');
    } else if (plan === 'PRO_monthly') {
      await purchasePackage('PRO_monthly');
    } else if (plan === 'PRO_onetime') {
      await purchasePackage('PRO_onetime');
    }
  };

  // איפוס לחינמי לבדיקות נוחות
  const resetToFree = async () => {
    alert('Dev Mode: Resetting to Free Account...');
    const now = Date.now();
    setIsPro(false);
    setCurrentPlan('Free');
    setMaxMessages(0);
    setMessageCount(0);
    setDailyCount(0);
    
    if (user?.id) {
       const token = await getToken({ template: 'supabase' });
       if (token) {
          await updateSubscriptionData(token, user.id, {
              current_plan: 'Free',
              is_pro: false,
              max_messages: 0,
              message_count: 0,
              daily_message_count: 0,
              last_daily_reset: now
          });
       }
    }
  };

  // בדיקת חסימה חכמה: חוסם את כולם אם הגיעו למקסימום שלהם (גם את הפרימיום, רק שהמקסימום שלהם הוא 1,000)
  const hasReachedLimit = (dailyCount >= DAILY_FREE_LIMIT) && (messageCount >= maxMessages);

  return (
    <PaywallContext.Provider value={{ 
      dailyCount, messageCount, maxMessages, incrementMessageCount, 
      hasReachedLimit, isPro, currentPlan, purchasePackage,
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