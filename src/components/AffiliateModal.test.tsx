import React from 'react';
// הוספנו את waitFor
import { render, waitFor } from '@testing-library/react-native';
import AffiliateModal from './AffiliateModal'; 

// --- Mocks ---
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(), userId: 'test_user_123' })
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

// --- תסריטי הבדיקה ---
describe('QA: AffiliateModal Component', () => {
  
  // שמנו async לפני הפונקציה
  it('Should render "Creator Program" title when mode is creator', async () => {
    const { getByText } = render(
      <AffiliateModal visible={true} onClose={() => {}} mode="creator" />
    );
    
    // אמרנו ל-Jest לחכות בסבלנות עד שהטקסט יופיע וכל הסטייטים יירגעו
    await waitFor(() => {
      expect(getByText('Creator Program')).toBeTruthy();
    });
  });

  it('Should render "Invite Friends" title when mode is invite', async () => {
    const { getByText } = render(
      <AffiliateModal visible={true} onClose={() => {}} mode="invite" />
    );
    
    await waitFor(() => {
      expect(getByText('Invite Friends')).toBeTruthy();
    });
  });

});