/// <reference types="jest" />
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatScreen from './ChatScreen';

// ---------------------------------------------------------
// 1. טיפול בטיימרים באמצעות פייק-טיימרים של Jest
// ---------------------------------------------------------
beforeAll(() => {
  jest.useFakeTimers();
});
afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------
// 2. זיוף לוגיקת הצ'אט (useChatManager)
// ---------------------------------------------------------
const mockSendMessage = jest.fn(() => Promise.resolve(true));

jest.mock('../../hooks/useChatManager', () => ({
  __esModule: true,
  useChatManager: () => ({
    messages: [{ id: 'greeting', text: 'Hello Bar!', sender: 'bot' }],
    groupedSessions: {},
    expandedFolders: {},
    currentSessionId: 'session_1',
    sendMessage: mockSendMessage,
    createNewSession: jest.fn(),
    switchSession: jest.fn(),
    deleteSession: jest.fn(),
    toggleFolder: jest.fn(),
    handleRating: jest.fn()
  })
}));

// ---------------------------------------------------------
// 3. זיופים (Mocks) לספריות צד שלישי
// ---------------------------------------------------------
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    __esModule: true,
    LinearGradient: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    __esModule: true,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children }: any) => React.createElement(React.Fragment, null, children)
  };
});

// 🌟 תיקון AdMob: מחזירים פונקציה ריקה (jest.fn) עבור Unsubscribe כדי למנוע את הקריסה
jest.mock('react-native-google-mobile-ads', () => ({
  RewardedAd: {
    createForAdRequest: jest.fn(() => ({
      addAdEventListener: jest.fn(() => jest.fn()), 
      load: jest.fn(),
      show: jest.fn(),
    })),
  },
  RewardedAdEventType: {
    LOADED: 'loaded',
    EARNED_REWARD: 'earned_reward',
  },
  AdEventType: {
    CLOSED: 'closed',
  },
  TestIds: {
    REWARDED: 'test-id',
  },
}));

jest.mock('../components/MessageBubble', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ msg }: any) => React.createElement(View, null, React.createElement(Text, null, msg.text))
  };
});

jest.mock('../components/ChatInputArea', () => {
  const React = require('react');
  const { TextInput, View, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ inputText, setInputText, onSendMessage, placeholder }: any) => 
      React.createElement(View, null, [
        React.createElement(TextInput, { 
          key: 'input', 
          placeholder: placeholder, 
          value: inputText, 
          onChangeText: setInputText 
        }),
        React.createElement(TouchableOpacity, { 
          key: 'btn', 
          testID: 'send-button', 
          onPress: onSendMessage 
        })
      ])
  };
});

jest.mock('../components/ChatSideMenu', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/GameLibraryModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/PaywallModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/ProfileModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/TutorialModal', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/TermsModal', () => ({ __esModule: true, default: () => null }));
jest.mock('./SettingsScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('./FavoritesScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/CommunityModal', () => ({ __esModule: true, default: () => null }));

// ---------------------------------------------------------
// 4. סביבה, משתמש ותרגומים
// ---------------------------------------------------------
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(() => Promise.resolve('mock-token')), isLoaded: true }),
  useUser: () => ({ user: { id: 'user_123', firstName: 'Bar' }, isLoaded: true })
}));

jest.mock('../context/PaywallContext', () => ({
  usePaywall: () => ({
    hasReachedLimit: false,
    incrementMessageCount: jest.fn(),
    chatLanguage: 'en',
    currentPlan: 'free',
    hasUsedTrial: false,
    isTrialActive: false,
    startPremiumTrial: jest.fn(),
    grantRewardMessage: jest.fn()
  })
}));

jest.mock('../utils/translations', () => ({
  getTranslation: () => ({
    greeting: (name: string) => `Hello ${name}!`,
    placeholder: 'Type your message...',
    lockedPlaceholder: () => 'Locked...',
    limitAlertTitle: 'Limit Reached',
    limitReached: (plan: string) => `Limit reached for ${plan}`,
    upgradeNow: 'Upgrade',
    cancel: 'Cancel',
    trialPopupTitle: 'Trial',
    trialPopupSubtitle: 'Sub',
    trialPopupBtn: 'Start',
    trialPopupClose: 'Close'
  })
}));

jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../utils/db', () => ({
  getUserTosStatus: jest.fn(() => Promise.resolve(true)),
  getUserTutorialStatus: jest.fn(() => Promise.resolve(true)),
  markTutorialAsSeen: jest.fn(() => Promise.resolve(true)),
  saveBookmark: jest.fn(() => Promise.resolve(true)),
  getUserBookmarks: jest.fn(() => Promise.resolve([])),
  getUserChatSessions: jest.fn(() => Promise.resolve([])),
  saveChatSession: jest.fn(() => Promise.resolve(true)),
  syncUserFullName: jest.fn(() => Promise.resolve(true))
}));

// ---------------------------------------------------------
// 5. הבדיקות 
// ---------------------------------------------------------
describe('QA: ChatScreen Component', () => {

  it('Should render the screen and display the greeting message', async () => {
    const { findByText } = render(<ChatScreen />);
    expect(await findByText('Hello Bar!')).toBeTruthy();
  });

  it('Should update the input field when user types a message', async () => {
    const { findByPlaceholderText } = render(<ChatScreen />);
    
    const inputField = await findByPlaceholderText('Type your message...');
    
    fireEvent.changeText(inputField, 'How to beat the final boss?');
    expect(inputField.props.value).toBe('How to beat the final boss?');
  });

  it('Should send the exact typed message to the Chat Manager', async () => {
    const { findByPlaceholderText, findByTestId } = render(<ChatScreen />);
    
    const inputField = await findByPlaceholderText('Type your message...');
    fireEvent.changeText(inputField, 'Where is the secret sword?');

    const sendButton = await findByTestId('send-button');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Where is the secret sword?', null);
    });
  });

});