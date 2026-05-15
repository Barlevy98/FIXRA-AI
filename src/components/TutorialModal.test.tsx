import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TutorialModal from './TutorialModal';

// --- Mocks ---
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Light: 'light' } 
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons'
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient'
}));

// --- תסריטי הבדיקה ---
describe('QA: TutorialModal Component', () => {

  it('Should show the tutorial content when visible is true', () => {
    const { getByText } = render(
      <TutorialModal visible={true} onClose={() => {}} />
    );
    // התיקון: אנחנו בודקים את הטקסטים שמופיעים בשקף *הראשון*
    expect(getByText('Welcome to FIXRA AI')).toBeTruthy();
    expect(getByText('Your elite gaming assistant is ready.')).toBeTruthy();
  });

  it('Should trigger onClose function when the Skip button is pressed', () => {
    const mockOnCloseFn = jest.fn();
    const { getByText } = render(
      <TutorialModal visible={true} onClose={mockOnCloseFn} />
    );

    const skipButton = getByText('Skip');
    fireEvent.press(skipButton);

    expect(mockOnCloseFn).toHaveBeenCalledTimes(1);
  });

});