import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { MessageType, ChatSession } from '../src/types';
import { fetchGameWalkthrough } from '../src/services/aiService';
import { saveChatSession, getUserChatSessions, deleteChatSession } from '../src/utils/db';

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

const deriveTitle = (userMessages: MessageType[], currentTitle: string, t: any): string => {
  let newTitle = currentTitle;
  if (userMessages.length === 1 && (currentTitle === (t.newChatName || 'New Chat') || currentTitle.startsWith('Chat from') || currentTitle.startsWith('שיחה מ-') || currentTitle.startsWith('New ') || currentTitle.startsWith("צ'אט "))) {
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
  return newTitle;
};

const deriveCategory = (currentCategory: string, newCategory?: string): string => {
  if (newCategory && newCategory !== 'Unknown' && newCategory !== 'General') {
    if (currentCategory === 'General' || !currentCategory) return newCategory;
  }
  return currentCategory || 'General';
};

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
  
  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const requestCounterRef = useRef(0);

  const sessionsRef = useRef(sessions);
  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const SESSIONS_KEY = `@fixra_sessions_${user?.id || 'guest'}`;
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const saveSessionsToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      const cleanSessionsForStorage = updatedSessions.map(session => ({
        ...session,
        messages: session.messages.filter(m => !m.isLoading)
      }));
      AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(cleanSessionsForStorage)).catch(console.error);
    }, 800); 
  };

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
    if (messages.length === 1 && messages[0].sender === 'bot' && !messages[0].isLoading) {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      const isGeneral = !currentSession || currentSession.category === 'General';
      const expectedText = isGeneral ? greetingText : (t.gameWelcome ? t.gameWelcome(currentSession.category) : greetingText);

      if (messages[0].text !== expectedText) {
        const updatedMessages: MessageType[] = [{ ...messages[0], text: expectedText }];
        setMessages(updatedMessages);
        if (currentSessionId && currentSession) {
          const updated = sessionsRef.current.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages } : s);
          saveSessionsToStorage(updated);
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
              id: s.id, title: s.title, category: s.category || 'General', messages: s.messages, updatedAt: s.updated_at
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
      if (loadedSessions.length === 0) {
        // Only clear ID and messages, don't auto-create
        setCurrentSessionId(null);
        setMessages([]);
      } else {
        const mostRecent = loadedSessions[0];
        setCurrentSessionId(mostRecent.id);
        setMessages(mostRecent.messages);
      }
    } catch (e) {
      console.error('Load sessions error', e);
      setCurrentSessionId(null);
      setMessages([]);
    }
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
    if (!expandedFolders.includes(finalCategory)) setExpandedFolders(prev => [...prev, finalCategory]);

    const newSession: ChatSession = { id: newId, title: initialTitle, category: finalCategory, messages: [initialMessage], updatedAt: Date.now() };
    const updated = [newSession, ...sessionsRef.current];
    saveSessionsToStorage(updated);
    if (onCreated) onCreated();
  };

  const switchSession = (sessionId: string, onSwitched?: () => void) => {
    if (isGeneratingRef.current) return; 
    Haptics.selectionAsync();
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      if (onSwitched) onSwitched();
    }
  };

  const deleteSession = (sessionId: string) => {
    if (isGeneratingRef.current && sessionId === currentSessionId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(t.deleteAlert, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: async () => { 
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const updatedSessions = sessionsRef.current.filter(s => s.id !== sessionId);
          saveSessionsToStorage(updatedSessions);
          
          if (currentSessionId === sessionId) {
             if (updatedSessions.length > 0) {
               // If there are other sessions, switch to the most recent one
               const mostRecent = updatedSessions[0];
               setCurrentSessionId(mostRecent.id);
               setMessages(mostRecent.messages);
             } else {
               // If no sessions left, just clear the screen (don't auto-create)
               setCurrentSessionId(null);
               setMessages([]);
             }
          }

          if (user?.id) {
            try {
              const token = await getToken({ template: 'supabase' });
              if (token) await deleteChatSession(token, sessionId);
            } catch (error) { console.error('Error deleting from server:', error); }
          }
        }
      }
    ]);
  };

  const updateCurrentSession = (newMessages: MessageType[], newCategory?: string) => {
    setMessages(newMessages);
    if (!currentSessionId) return;
    let updatedSessions = [...sessionsRef.current];
    let sessionIndex = updatedSessions.findIndex(s => s.id === currentSessionId);
    const userMessages = newMessages.filter(m => m.sender === 'user');
    
    let currentTitle = sessionIndex >= 0 ? updatedSessions[sessionIndex].title : (t.newChatName || 'New Chat');
    let currentCat = sessionIndex >= 0 ? updatedSessions[sessionIndex].category : 'General';
    let newTitle = deriveTitle(userMessages, currentTitle, t);
    let finalCategory = deriveCategory(currentCat, newCategory);

    const updatedSession = { id: currentSessionId, title: newTitle, category: finalCategory, messages: newMessages, updatedAt: Date.now() };
    if (sessionIndex >= 0) updatedSessions[sessionIndex] = updatedSession;
    else if (userMessages.length > 0) updatedSessions.unshift(updatedSession);
    updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
    saveSessionsToStorage(updatedSessions);
    
    if (finalCategory && !expandedFolders.includes(finalCategory)) setExpandedFolders(prev => [...prev, finalCategory]);
    if (user?.id && userMessages.length > 0) {
      getToken({ template: 'supabase' }).then((token: string | null) => {
        if (token) saveChatSession(token, updatedSession.id, user.id, updatedSession.title, updatedSession.messages, updatedSession.category);
      });
    }
  };

  const toggleFolder = (category: string) => {
    Haptics.selectionAsync(); 
    setExpandedFolders(prev => prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]);
  };

  const sendMessage = async (userText: string, currentMedia: any) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const currentSignal = abortControllerRef.current.signal;

    if (isGeneratingRef.current) return false;
    isGeneratingRef.current = true;
    setIsGenerating(true);

    requestCounterRef.current += 1;
    const currentRequestId = requestCounterRef.current;

    try {
      const currentSession = sessionsRef.current.find(s => s.id === currentSessionId);
      const categoryToPass = currentSession?.category || 'General';

      const newUserMsg: MessageType = { id: Date.now().toString(), text: userText !== '' ? userText : undefined, media: currentMedia?.type === 'video' ? currentMedia.thumbnailUri : currentMedia?.uri, mediaType: currentMedia?.type, sender: 'user' };
      let updatedMsgs: MessageType[] = [...messages, newUserMsg];
      updateCurrentSession(updatedMsgs);

      const loadingId = (Date.now() + 1).toString();
      const msgsWithLoading: MessageType[] = [...updatedMsgs, { id: loadingId, sender: 'bot' as const, isLoading: true }];
      updateCurrentSession(msgsWithLoading);

      let response: any;
      
      for (let i = 0; i < 3; i++) {
        if (currentSignal.aborted) throw new Error("AbortError");
        
        response = await fetchGameWalkthrough(userText, currentMedia, chatLanguage, updatedMsgs, currentPlan, categoryToPass, currentSignal);
        
        if (!response.isError) break; 
        
        if (response.errorType === 'abort') throw new Error("AbortError");
        if (response.errorType === 'fatal') break;

        if (i < 2 && !currentSignal.aborted) {
          const waitTime = 500 * Math.pow(2, i); 
          console.log(`AI attempt ${i + 1} failed (Retryable). Backing off for ${waitTime}ms...`);
          await delay(waitTime);
        }
      }

      if (currentSignal.aborted || currentRequestId !== requestCounterRef.current) return false;
      
      if (!response || response.isError) {
        const finalMsgs = msgsWithLoading.map(msg => msg.id === loadingId ? { id: loadingId, text: response?.message || "An error occurred. Please try again.", sender: 'bot' as const, isError: true } : msg);
        updateCurrentSession(finalMsgs, response?.category || categoryToPass);
        return false;
      }
      
      const finalMsgs = msgsWithLoading.map(msg => msg.id === loadingId ? { id: loadingId, text: response.message, walkthroughData: response.walkthroughData, sender: 'bot' as const } : msg);
      updateCurrentSession(finalMsgs, response.category);
      return true;
      
    } catch (error: any) {
      if (error.message === "AbortError" || error.name === "AbortError") return false;
      console.error("Critical Chat Error:", error);
      return false;
    } finally {
      if (currentRequestId === requestCounterRef.current) {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
    }
  };

  const handleRating = (messageId: string, rating: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedMsgs = messages.map(msg => msg.id === messageId ? { ...msg, rating: msg.rating === rating ? undefined : rating } : msg);
    updateCurrentSession(updatedMsgs);
  };

  return {
    messages, groupedSessions, expandedFolders, currentSessionId, isGenerating,
    createNewSession, switchSession, deleteSession, toggleFolder, sendMessage, handleRating
  };
}