import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from './SettingsScreen';

// --- Mocks (זיופים של סביבת האפליקציה) ---

const mockSignOut = jest.fn(() => Promise.resolve());
const mockGetToken = jest.fn(() => Promise.resolve('mock-token'));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ signOut: mockSignOut, getToken: mockGetToken }),
  useUser: () => ({ user: { id: 'user_123', firstName: 'Bar' } })
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockChangeLanguage = jest.fn();
jest.mock('../context/PaywallContext', () => ({
  usePaywall: () => ({
    chatLanguage: 'English',
    changeLanguage: mockChangeLanguage,
  })
}));

jest.mock('../utils/translations', () => ({
  getTranslation: () => ({
    profileLang: 'Language',
    profileLogout: 'Log Out',
  })
}));

jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error', Warning: 'warning' }
}));

jest.mock('../utils/db', () => ({
  getUserHapticsPreference: jest.fn(() => Promise.resolve(true)),
  updateUserHapticsPreference: jest.fn(() => Promise.resolve(true))
}));

// --- משתיק אזהרות act של טיימרים ודאטה-בייס ברקע ---
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (/was not wrapped in act/.test(args[0])) return; 
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// --- תסריטי הבדיקה ---
describe('QA: SettingsScreen Component', () => {

  it('Should render all settings sections correctly', async () => {
    const { getByText } = render(<SettingsScreen visible={true} onClose={() => {}} />);
    
    // מוודאים שכל האזורים החדשים מופיעים במסך (מחכים שהכל ייטען)
    await waitFor(() => {
      expect(getByText('Preferences')).toBeTruthy();
      expect(getByText('Support & Feedback')).toBeTruthy(); // 🌟 תוקן לשם החדש!
      expect(getByText('Account Management')).toBeTruthy(); 
    });
  });

  it('Should open language menu and trigger language change to Supabase', async () => {
    const { getByText } = render(<SettingsScreen visible={true} onClose={() => {}} />);

    await waitFor(() => {
      const langButton = getByText('Language');
      fireEvent.press(langButton);
    });

    const hebrewOption = getByText('עברית');
    fireEvent.press(hebrewOption);

    expect(mockChangeLanguage).toHaveBeenCalledWith('Hebrew');
  });

  it('Should trigger sign out when logout button is pressed', async () => {
    const { getByText } = render(<SettingsScreen visible={true} onClose={() => {}} />);

    await waitFor(() => {
      const logoutBtn = getByText('Log Out');
      fireEvent.press(logoutBtn);
    });

    expect(mockSignOut).toHaveBeenCalled();
  });

});