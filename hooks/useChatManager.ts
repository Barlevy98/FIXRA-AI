import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { MessageType, ChatSession } from '../src/types';
import { fetchGameWalkthrough } from '../src/services/aiService';
import { saveChatSession, getUserChatSessions, deleteChatSession } from '../src/utils/db';

export function useChatManager(
  user: any,
  getToken: any,
  chatLanguage: string,
  currentPlan: string,
  t: any,
  greetingText: string
) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['General']);

  const SESSIONS_KEY = `@fixra_sessions_${user?.id || 'guest'}`;

  const groupedSessions = sessions.reduce((acc, session) => {
    const cat = session.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === 'bot') {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const isGeneral = !currentSession || currentSession.category === 'General';
      
      const expectedText = isGeneral 
        ? greetingText 
        : (t.gameWelcome ? t.gameWelcome(currentSession.category) : greetingText);

      if (messages[0].text !== expectedText) {
        const updatedMessages = [{ ...messages[0], text: expectedText }];
        setMessages(updatedMessages);
        if (currentSessionId && currentSession) {
          setSessions(prev => {
            const updated = prev.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages } : s);
            AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)).catch(()=>{});
            return updated;
          });
        }
      }
    }
  }, [greetingText, messages, currentSessionId, sessions, t]);

  const loadSessions = async () => {
    try {
      let loadedFromServer = false;
      let loadedSessions: ChatSession[] = [];
      
      if (user?.id) {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          const serverSessions = await getUserChatSessions(token, user.id);
          if (serverSessions) {
            loadedSessions = serverSessions.map(s => ({
              id: s.id,
              title: s.title,
              category: s.category || 'General',
              messages: s.messages,
              updatedAt: s.updated_at
            }));
            loadedFromServer = true;
          }
        }
      }
      if (!loadedFromServer) {
        const saved = await AsyncStorage.getItem(SESSIONS_KEY);
        if (saved) {
          loadedSessions = JSON.parse(saved).map((s: ChatSession) => ({ ...s, category: s.category || 'General' }));
        }
      }
      setSessions(loadedSessions);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(loadedSessions));
      
      if (loadedSessions.length === 0) {
        createNewSession();
      } else {
        const mostRecent = loadedSessions[0];
        setCurrentSessionId(mostRecent.id);
        setMessages(mostRecent.messages);
      }
    } catch (e) {
      console.error('Load sessions error', e);
      createNewSession();
    }
  };

  const saveSessionsToStorage = async (updatedSessions: ChatSession[]) => {
    try {
      setSessions(updatedSessions);
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch (e) { console.error('Save sessions error', e); }
  };

  const createNewSession = (onCreated?: () => void, gameName?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newId = Date.now().toString();
    
    let initialText = greetingText;
    let finalCategory = 'General';
    let initialTitle = t.newChatName || 'New Chat';

    if (gameName) {
       initialText = t.gameWelcome ? t.gameWelcome(gameName) : `Welcome to your ${gameName} chat room!`;
       finalCategory = gameName;
       initialTitle = t.gameChatTitle ? t.gameChatTitle(gameName) : `New ${gameName} Chat`;
    }

    const initialMessage: MessageType = { id: '1', text: initialText, sender: 'bot' };
    setCurrentSessionId(newId);
    setMessages([initialMessage]);
    
    if (!expandedFolders.includes(finalCategory)) {
      setExpandedFolders(prev => [...prev, finalCategory]);
    }

    if (gameName) {
      const newSession: ChatSession = {
        id: newId,
        title: initialTitle,
        category: finalCategory,
        messages: [initialMessage],
        updatedAt: Date.now()
      };
      setSessions(prev => {
        const updated = [newSession, ...prev];
        AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)).catch(()=>{});
        return updated;
      });
    }

    if (onCreated) onCreated();
  };

  const switchSession = (sessionId: string, onSwitched?: () => void) => {
    Haptics.selectionAsync();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      if (onSwitched) onSwitched();
    }
  };

  const deleteSession = (sessionId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t.deleteAlert, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      { 
        text: t.delete, 
        style: 'destructive', 
        onPress: async () => { 
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          saveSessionsToStorage(updatedSessions);
          if (currentSessionId === sessionId) createNewSession();

          if (user?.id) {
            try {
              const token = await getToken({ template: 'supabase' });
              if (token) {
                await deleteChatSession(token, sessionId);
              }
            } catch (error) {
              console.error('Error deleting from server:', error);
            }
          }
        }
      }
    ]);
  };

  const updateCurrentSession = (newMessages: MessageType[], newCategory?: string) => {
    setMessages(newMessages);
    if (!currentSessionId) return;

    let updatedSessions = [...sessions];
    let sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
    let newTitle = t.newChatName || 'New Chat';
    let finalCategory = 'General';
    const userMessages = newMessages.filter(m => m.sender === 'user');

    if (sessionIndex >= 0) {
      const s = updatedSessions[sessionIndex];
      newTitle = s.title;
      finalCategory = s.category;
      
      if (userMessages.length === 1 && (s.title === (t.newChatName || 'New Chat') || s.title.startsWith('Chat from') || s.title.startsWith('שיחה מ-') || s.title.startsWith('New ') || s.title.startsWith("צ'אט "))) {
        const firstUserMsg = userMessages[0];
        if (firstUserMsg.text) {
          const words = firstUserMsg.text.trim().split(/\s+/);
          newTitle = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
        } else if (firstUserMsg.mediaType === 'image') {
          newTitle = t.imageSearch || '📷 Image Search';
        } else if (firstUserMsg.mediaType === 'video') {
          newTitle = t.videoSearch || '🎥 Video Search';
        }
      }
      if (newCategory && newCategory !== 'Unknown' && newCategory !== 'General') {
        if (finalCategory === 'General' || !finalCategory) finalCategory = newCategory;
      }
    } else {
      if (userMessages.length > 0) {
        const firstUserMsg = userMessages[0];
        if (firstUserMsg.text) {
          const words = firstUserMsg.text.trim().split(/\s+/);
          newTitle = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
        } else if (firstUserMsg.mediaType === 'image') {
          newTitle = t.imageSearch || '📷 Image Search';
        } else if (firstUserMsg.mediaType === 'video') {
          newTitle = t.videoSearch || '🎥 Video Search';
        }
      }
      if (newCategory && newCategory !== 'Unknown') finalCategory = newCategory;
    }

    const updatedSession = {
      id: currentSessionId,
      title: newTitle,
      category: finalCategory,
      messages: newMessages,
      updatedAt: Date.now()
    };

    if (sessionIndex >= 0) {
      updatedSessions[sessionIndex] = updatedSession;
    } else {
      if (userMessages.length > 0) {
        updatedSessions.unshift(updatedSession);
      } else {
        return; 
      }
    }

    updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    saveSessionsToStorage(updatedSessions);

    if (finalCategory && !expandedFolders.includes(finalCategory)) {
        setExpandedFolders(prev => [...prev, finalCategory]);
    }

    if (user?.id && userMessages.length > 0) {
      getToken({ template: 'supabase' }).then((token: string | null) => {
        if (token) saveChatSession(token, updatedSession.id, user.id, updatedSession.title, updatedSession.messages, updatedSession.category);
      });
    }
  };

  const toggleFolder = (category: string) => {
    Haptics.selectionAsync(); 
    setExpandedFolders(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const sendMessage = async (userText: string, currentMedia: any) => {
    const newUserMsg: MessageType = { 
      id: Date.now().toString(), 
      text: userText !== '' ? userText : undefined, 
      media: currentMedia?.type === 'video' ? currentMedia.thumbnailUri : currentMedia?.uri, 
      mediaType: currentMedia?.type, 
      sender: 'user' 
    };
    
    let updatedMsgs = [...messages, newUserMsg];
    updateCurrentSession(updatedMsgs);

    const loadingId = (Date.now() + 1).toString();
    updatedMsgs = [...updatedMsgs, { id: loadingId, sender: 'bot', isLoading: true }];
    updateCurrentSession(updatedMsgs);

    // 🌟 הנה השינוי! אנחנו שולפים את ה-category מהחדר הנוכחי ושולחים ל-AI 🌟
    const currentSession = sessions.find(s => s.id === currentSessionId);
    const categoryToPass = currentSession?.category || 'General';

    const response = await fetchGameWalkthrough(userText, currentMedia, chatLanguage, messages, currentPlan, categoryToPass);
    
    updatedMsgs = updatedMsgs.map(msg => msg.id === loadingId ? { id: loadingId, text: response.message, walkthroughData: response.walkthroughData, sender: 'bot' } : msg);
    updateCurrentSession(updatedMsgs, response.category);

    return !response.isError;
  };

  const handleRating = (messageId: string, rating: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedMsgs = messages.map(msg => 
      msg.id === messageId ? { ...msg, rating: msg.rating === rating ? undefined : rating } : msg
    );
    updateCurrentSession(updatedMsgs);
  };

  return {
    messages,
    groupedSessions,
    expandedFolders,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    toggleFolder,
    sendMessage,
    handleRating
  };
}