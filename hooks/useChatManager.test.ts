import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useChatManager } from './useChatManager';
import { Alert } from 'react-native';
import * as aiService from '../src/services/aiService';
import * as db from '../src/utils/db';
import * as Haptics from 'expo-haptics';

// --- זיופים (Mocks) ---
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native', () => {
  const rn = jest.requireActual('react-native');
  rn.Alert.alert = jest.fn();
  return rn;
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning', Success: 'success' }
}));

jest.mock('../src/services/aiService', () => ({
  fetchGameWalkthrough: jest.fn(),
}));

jest.mock('../src/utils/db', () => ({
  saveChatSession: jest.fn(),
  getUserChatSessions: jest.fn(),
  deleteChatSession: jest.fn(),
}));

jest.mock('../src/context/PaywallContext', () => ({
  usePaywall: () => ({ incrementLocalCounter: jest.fn() })
}));

describe('useChatManager', () => {
  const mockUser = { id: 'user123' };
  const mockGetToken = jest.fn().mockResolvedValue('fake-token');
  const mockT = { 
    newChatName: 'New Chat', 
    deleteAlert: 'Delete', 
    deleteConfirm: 'Are you sure?', 
    cancel: 'Cancel',
    gameWelcome: (game: string) => `Welcome to ${game}`
  };
  const greetingText = 'Hello, how can I help you?';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Initializes correctly and creates a default session when asked', async () => {
    (db.getUserChatSessions as jest.Mock).mockResolvedValue([]);
    
    const { result } = renderHook(() => 
      useChatManager(mockUser, mockGetToken, 'English', 'Free', mockT, greetingText)
    );

    // התיקון: אנחנו מחכים שהצ'אט יטען מהדאטה-בייס, ואז יוצרים שיחה יזומה
    await waitFor(() => {
      expect(db.getUserChatSessions).toHaveBeenCalled();
    });

    act(() => {
      result.current.createNewSession();
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBe(1);
    });

    expect(result.current.messages[0].text).toBe(greetingText);
    expect(result.current.currentSessionId).not.toBeNull();
  });

  it('2. Sends a message, shows loading state, and updates with AI response', async () => {
    (db.getUserChatSessions as jest.Mock).mockResolvedValue([]);
    (aiService.fetchGameWalkthrough as jest.Mock).mockResolvedValue({
      message: 'Here is the guide for GTA V',
      category: 'General',
      isError: false
    });

    const { result } = renderHook(() => 
      useChatManager(mockUser, mockGetToken, 'English', 'Free', mockT, greetingText)
    );

    await waitFor(() => expect(db.getUserChatSessions).toHaveBeenCalled());

    act(() => { result.current.createNewSession(); });

    await waitFor(() => {
      expect(result.current.currentSessionId).not.toBeNull();
    });

    await act(async () => {
      await result.current.sendMessage('How to beat the final boss?', null);
    });

    expect(result.current.messages.length).toBe(3); 
    expect(result.current.messages[1].text).toBe('How to beat the final boss?');
    expect(result.current.messages[2].text).toBe('Here is the guide for GTA V');
  });

  it('3. Triggers delete alert and calls delete API when confirmed', async () => {
    (db.getUserChatSessions as jest.Mock).mockResolvedValue([]);
    
    const { result } = renderHook(() => 
      useChatManager(mockUser, mockGetToken, 'English', 'Free', mockT, greetingText)
    );

    await waitFor(() => expect(db.getUserChatSessions).toHaveBeenCalled());

    act(() => { result.current.createNewSession(); });

    await waitFor(() => {
      expect(result.current.currentSessionId).not.toBeNull();
    });

    const sessionIdToDelete = result.current.currentSessionId!;

    act(() => {
      result.current.deleteSession(sessionIdToDelete);
    });

    expect(Alert.alert).toHaveBeenCalled();

    const alertArgs = (Alert.alert as jest.Mock).mock.calls[0];
    const deleteButton = alertArgs[2].find((btn: any) => btn.style === 'destructive');
    
    await act(async () => {
      await deleteButton.onPress();
    });

    expect(db.deleteChatSession).toHaveBeenCalledWith('fake-token', sessionIdToDelete);
  });

  it('4. Switches between sessions correctly', async () => {
    const fakeSessions = [
      { id: 'session1', title: 'Session 1', category: 'General', messages: [{ id: '1', text: 'Msg 1', sender: 'user' }], updatedAt: Date.now() },
      { id: 'session2', title: 'Session 2', category: 'General', messages: [{ id: '2', text: 'Msg 2', sender: 'user' }], updatedAt: Date.now() }
    ];
    (db.getUserChatSessions as jest.Mock).mockResolvedValue(fakeSessions);

    const { result } = renderHook(() => 
      useChatManager(mockUser, mockGetToken, 'English', 'Free', mockT, greetingText)
    );

    await waitFor(() => {
      expect(result.current.groupedSessions['General']).toBeDefined();
    });

    act(() => {
      result.current.switchSession('session2');
    });

    expect(result.current.currentSessionId).toBe('session2');
    expect(result.current.messages[0].text).toBe('Msg 2');
  });
});