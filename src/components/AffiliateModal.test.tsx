import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AffiliateModal from './AffiliateModal'; 

// --- Mocks ---
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(), userId: 'test_user_123' }),
  useUser: () => ({ user: { id: 'test_user_123', fullName: 'Test User' } }) 
}));

jest.mock('expo-haptics', () => ({ 
  impactAsync: jest.fn(), 
  notificationAsync: jest.fn() 
}));

jest.mock('expo-clipboard', () => ({ 
  setStringAsync: jest.fn() 
}));

jest.mock('../utils/db', () => ({
  getUserAffiliateData: jest.fn(() => Promise.resolve(null))
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}));

describe('QA: AffiliateModal Component', () => {
  it('Should render "Creator Program" title when mode is creator', async () => {
    const { getByText } = render(<AffiliateModal visible={true} onClose={() => {}} mode="creator" />);
    await waitFor(() => {
      expect(getByText('Creator Program')).toBeTruthy();
    });
  });

  it('Should render "Invite & Earn" title when mode is invite', async () => {
    const { getByText } = render(<AffiliateModal visible={true} onClose={() => {}} mode="invite" />);
    // התיקון: השם של החלון הוא Invite & Earn!
    await waitFor(() => {
      expect(getByText('Invite & Earn')).toBeTruthy();
    });
  });
});