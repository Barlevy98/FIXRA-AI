import React from 'react';
import { render } from '@testing-library/react-native';
import MessageBubble from './MessageBubble';

// 🌟 Mocking Clerk
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(() => Promise.resolve('fake-token')) }),
  useUser: () => ({ user: { id: 'test_user_123' } }),
}));

// 🌟 Mocking Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));

// 🌟 Mocking Expo Vector Icons (זה מה שפותר את הקריסה!)
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// 🌟 Mocking Linear Gradient (מונע קריסות של עיצוב טקסטורות בטסטים)
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// 🌟 Mocking DB function
jest.mock('../utils/db', () => ({
  reportMessageToCloud: jest.fn(() => Promise.resolve(true)),
}));

describe('MessageBubble Component', () => {
  it('renders user message correctly', () => {
    const mockUserMsg = { id: '1', text: 'How do I beat the boss?', sender: 'user' as const, isLoading: false };
    const { getByText } = render(
      <MessageBubble msg={mockUserMsg} isBookmarked={false} onRate={jest.fn()} onBookmark={jest.fn()} />
    );
    expect(getByText('How do I beat the boss?')).toBeTruthy();
  });

  it('renders bot message correctly', () => {
    const mockBotMsg = { id: '2', text: 'You need to use fire magic.', sender: 'bot' as const, isLoading: false };
    const { getByText } = render(
      <MessageBubble msg={mockBotMsg} isBookmarked={false} onRate={jest.fn()} onBookmark={jest.fn()} />
    );
    expect(getByText('You need to use fire magic.')).toBeTruthy();
  });
});