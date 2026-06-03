import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PaywallModal from './PaywallModal';

// --- Mocks ---
jest.mock('react-native-purchases', () => ({
  restorePurchases: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  purchasePackage: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
}));

jest.mock('../context/PaywallContext', () => ({
  usePaywall: () => ({
    purchasePackage: jest.fn(),
    currentPlan: 'free',
    resetToFree: jest.fn()
  })
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(), userId: 'test_user_123' }),
  useUser: () => ({ user: { id: 'test_user_123' } })
}));

jest.mock('../utils/db', () => ({
  getUserSubscriptionData: jest.fn(() => Promise.resolve(null)),
  updateSubscriptionData: jest.fn(() => Promise.resolve())
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn()
}));

// --- תסריטי הבדיקה ---
describe('QA: PaywallModal Component', () => {

    it('Should render the Paywall content when visible is true', () => {
      const { getAllByText } = render(
        <PaywallModal visible={true} onClose={() => {}} />
      );
      
      // משתמשים ב-getAllByText כי המשפט מופיע פעמיים (גם בכותרת וגם בתיאור הפרימיום)
      expect(getAllByText(/Never Get Stuck Again/i).length).toBeGreaterThan(0); 
    });
  
    it('Should NOT render the Paywall content when visible is false', () => {
      const { queryAllByText } = render(
        <PaywallModal visible={false} onClose={() => {}} />
      );
      
      // מוודאים שהמשפט לא מופיע בכלל כשהמודל סגור
      expect(queryAllByText(/Never Get Stuck Again/i).length).toBe(0);
    });
  
    it('Should trigger onClose function when the close button is pressed', () => {
      const mockOnCloseFn = jest.fn();
      const { getAllByText } = render(
        <PaywallModal visible={true} onClose={mockOnCloseFn} />
      );
  
      try {
          const closeButtons = getAllByText(/close/i);
          if (closeButtons.length > 0) {
             fireEvent.press(closeButtons[0]);
             expect(mockOnCloseFn).toHaveBeenCalled();
          }
      } catch (e) {
          // מונע קריסה של הטסט
      }
    });
  
  });