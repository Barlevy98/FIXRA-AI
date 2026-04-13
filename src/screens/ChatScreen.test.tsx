import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatScreen from './ChatScreen';

// ---------------------------------------------------------
// 1. זיופים (Mocks) - מנטרלים את כל המערכות החיצוניות
// ---------------------------------------------------------

// מזייפים את ה-API של ה-AI כדי שלא נשלח באמת בקשות שעולות כסף
import { fetchGameWalkthrough } from '../services/aiService';
jest.mock('../services/aiService', () => ({
  fetchGameWalkthrough: jest.fn(() => Promise.resolve({
    message: 'This is a mock AI answer',
    isError: false,
    category: 'General'
  }))
}));

// מזייפים את נתוני המשתמש וההרשאות
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(() => Promise.resolve('mock-token')) }),
  useUser: () => ({ user: { id: 'user_123', firstName: 'Bar' } })
}));

jest.mock('../context/PaywallContext', () => ({
  usePaywall: () => ({
    hasReachedLimit: false,
    incrementMessageCount: jest.fn(),
    chatLanguage: 'en',
    currentPlan: 'free'
  })
}));

// מזייפים את התרגום כדי שנדע בדיוק איזה טקסט לחפש
jest.mock('../utils/translations', () => ({
  getTranslation: () => ({
    greeting: (name: string) => `Hello ${name}!`,
    placeholder: 'Type your message...',
    loading: 'Loading...'
  })
}));

// מזייפים את שאר הספריות של הטלפון
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// 🌟 הנה התיקון: זיוף מלא ומושלם של כל פונקציות המסד נתונים!
jest.mock('../utils/db', () => ({
  getUserChatSessions: jest.fn(() => Promise.resolve([])),
  saveChatSession: jest.fn(() => Promise.resolve(true)),
  getUserTosStatus: jest.fn(() => Promise.resolve(true)),
  getUserTutorialStatus: jest.fn(() => Promise.resolve(true)),
  markTutorialAsSeen: jest.fn(() => Promise.resolve(true)),
  saveBookmark: jest.fn(() => Promise.resolve(true)),
  getUserBookmarks: jest.fn(() => Promise.resolve([]))
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' }
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('expo-video-thumbnails', () => ({}));
jest.mock('expo-file-system/legacy', () => ({}));

// מזייפים את המודלים כדי שלא יפריעו לרינדור המסך ולא יזרקו שגיאות אנימציה
jest.mock('../components/PaywallModal', () => 'PaywallModal');
jest.mock('../components/ProfileModal', () => 'ProfileModal');
jest.mock('../components/TutorialModal', () => 'TutorialModal');
jest.mock('../components/TermsModal', () => 'TermsModal');
jest.mock('./SettingsScreen', () => 'SettingsScreen');
jest.mock('./FavoritesScreen', () => 'FavoritesScreen');
jest.mock('../components/TypingIndicator', () => 'TypingIndicator');
jest.mock('../components/CommunityModal', () => 'CommunityModal');


// --- משתיק אזהרות רעש של React ---
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    // אם זו אזהרת act של טיימרים ברקע - פשוט תתעלם ממנה
    if (/was not wrapped in act/.test(args[0])) {
      return; 
    }
    // אם זו שגיאה אמיתית - תדפיס אותה כרגיל
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  // מחזירים את המצב לקדמותו בסוף הבדיקות
  console.error = originalError;
});

// ---------------------------------------------------------
// 2. תסריטי הבדיקה האמיתיים!
// ---------------------------------------------------------
describe('QA: ChatScreen Component', () => {

  // טסט 1: האם המסך עולה בלי לקרוס ומציג את הודעת הפתיחה?
  it('Should render the screen and display the greeting message', async () => {
    const { getByText } = render(<ChatScreen />);
    
    await waitFor(() => {
      // בודקים שרואים את הברכה עם השם שזייפנו למעלה ('Bar')
      expect(getByText('Hello Bar!')).toBeTruthy();
    });
  });

  // טסט 2: האם ההקלדה עובדת והסטייט מתעדכן?
  it('Should update the input field when user types a message', async () => {
    const { getByPlaceholderText } = render(<ChatScreen />);
    
    // מוצאים את שדה הטקסט לפי הפלייסחולדר שזייפנו
    const inputField = getByPlaceholderText('Type your message...');

    // מדמים אצבע שמקלידה משהו
    fireEvent.changeText(inputField, 'How to beat the final boss?');

    // בודקים שהטקסט באמת נשמר בתוך השדה
    expect(inputField.props.value).toBe('How to beat the final boss?');
  });

  // טסט 3: הדבר האמיתי - האם שלחנו את המידע הנכון לשרת כשלחצנו Send?
  it('Should send the exact typed message to the AI service', async () => {
    const { getByPlaceholderText, getByTestId } = render(<ChatScreen />);
    
    // 1. מקלידים טקסט
    const inputField = getByPlaceholderText('Type your message...');
    fireEvent.changeText(inputField, 'Where is the secret sword?');

    // 2. מוצאים את כפתור השליחה (לפי ה-testID שהוספנו) ולוחצים עליו
    const sendButton = getByTestId('send-button');
    fireEvent.press(sendButton);

    // 3. הבדיקה הקריטית: האם הפונקציה fetchGameWalkthrough הופעלה,
    // והאם המשתנה הראשון שעבר אליה הוא אכן הטקסט שהקלדנו!
    await waitFor(() => {
      expect(fetchGameWalkthrough).toHaveBeenCalledWith(
        'Where is the secret sword?', 
        null,  // אין תמונה
        'en',  // שפה
        expect.any(Array), // היסטוריית שיחה (מערך)
        'free' // סוג מנוי
      );
    });
  });

});