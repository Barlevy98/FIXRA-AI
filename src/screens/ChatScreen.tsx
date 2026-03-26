import React, { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Animated, Dimensions, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails'; 
import * as FileSystem from 'expo-file-system'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { MessageType, ChatSession } from '../types';
import { fetchGameWalkthrough } from '../services/aiService';
import { usePaywall } from '../context/PaywallContext';
import PaywallModal from '../components/PaywallModal';
import ProfileModal from '../components/ProfileModal';
import { getTranslation } from '../utils/translations';
import { saveChatSession, getUserChatSessions } from '../utils/db'; 

const PREVIEW_HEIGHT = 80;
const screenWidth = Dimensions.get('window').width;

export default function ChatScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const { incrementMessageCount, hasReachedLimit, chatLanguage } = usePaywall();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [selectedMedia, setSelectedMedia] = useState<{uri: string, type: 'image' | 'video', base64?: string, thumbnailUri?: string} | null>(null);
  
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isAttachMenuVisible, setIsAttachMenuVisible] = useState(false);
  
  const [expandedFolders, setExpandedFolders] = useState<string[]>(['General']);
  
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const SESSIONS_KEY = `@fixra_sessions_${user?.id || 'guest'}`;

  const t = getTranslation(chatLanguage);
  const greetingText = t.greeting(user?.firstName || '');

  const groupedSessions = sessions.reduce((acc, session) => {
    const cat = session.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const toggleFolder = (category: string) => {
    setExpandedFolders(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === 'bot' && messages[0].text !== greetingText) {
      const updatedMessages = [{ ...messages[0], text: greetingText }];
      setMessages(updatedMessages);
      if (currentSessionId) {
        setSessions(prev => {
          const updated = prev.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages } : s);
          AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(updated)).catch(()=>{});
          return updated;
        });
      }
    }
  }, [greetingText, messages, currentSessionId]);

  useEffect(() => { 
    if (user) loadSessions(); 
  }, [user]);

  const loadSessions = async () => {
    try {
      let loadedFromServer = false;

      if (user?.id) {
        const token = await getToken({ template: 'supabase' });
        
        if (token) {
          const serverSessions = await getUserChatSessions(token, user.id);
          
          if (serverSessions && serverSessions.length > 0) {
            const formattedSessions: ChatSession[] = serverSessions.map(s => ({
              id: s.id,
              title: s.title,
              category: s.category || 'General',
              messages: s.messages,
              updatedAt: s.updated_at
            }));

            setSessions(formattedSessions);
            setCurrentSessionId(formattedSessions[0].id);
            setMessages(formattedSessions[0].messages);

            await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(formattedSessions));
            loadedFromServer = true;
          }
        }
      }

      if (!loadedFromServer) {
        const saved = await AsyncStorage.getItem(SESSIONS_KEY);
        if (saved) {
          const parsedSessions: ChatSession[] = JSON.parse(saved);
          const upgradedSessions = parsedSessions.map(s => ({ ...s, category: s.category || 'General' }));
          setSessions(upgradedSessions);
          if (upgradedSessions.length > 0) {
            setCurrentSessionId(upgradedSessions[0].id);
            setMessages(upgradedSessions[0].messages);
          } else {
            createNewSession();
          }
        } else {
          createNewSession();
        }
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

  const createNewSession = () => {
    const newId = Date.now().toString();
    const initialMessage: MessageType = { id: '1', text: greetingText, sender: 'bot' };
    
    const newSession: ChatSession = { id: newId, title: t.newChatName, category: 'General', messages: [initialMessage], updatedAt: Date.now() };
    const updatedSessions = [newSession, ...sessions];
    
    setCurrentSessionId(newId);
    setMessages([initialMessage]);
    saveSessionsToStorage(updatedSessions);
    if (!expandedFolders.includes('General')) {
        setExpandedFolders(prev => [...prev, 'General']);
    }
    if (isMenuOpen) toggleMenu();
  };

  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      toggleMenu();
    }
  };

  const deleteSession = (sessionId: string) => {
    Alert.alert(t.deleteAlert, t.deleteConfirm, [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => {
          const updatedSessions = sessions.filter(s => s.id !== sessionId);
          saveSessionsToStorage(updatedSessions);
          if (currentSessionId === sessionId) {
            if (updatedSessions.length > 0) {
              setCurrentSessionId(updatedSessions[0].id);
              setMessages(updatedSessions[0].messages);
            } else { createNewSession(); }
          }
        }
      }
    ]);
  };

  const updateCurrentSession = (newMessages: MessageType[], newCategory?: string) => {
    setMessages(newMessages);
    if (currentSessionId) {
      const updatedSessions = sessions.map(s => {
        if (s.id === currentSessionId) {
          let newTitle = s.title;
          const userMessages = newMessages.filter(m => m.sender === 'user');
          if (userMessages.length === 1 && (s.title === t.newChatName || s.title.startsWith('Chat from') || s.title.startsWith('שיחה מ-'))) {
            const firstUserMsg = userMessages[0];
            if (firstUserMsg.text) {
              const words = firstUserMsg.text.trim().split(/\s+/);
              newTitle = words.slice(0, 4).join(' ') + (words.length > 4 ? '...' : '');
            } else if (firstUserMsg.mediaType === 'image') {
              newTitle = '📷 Image Search';
            } else if (firstUserMsg.mediaType === 'video') {
              newTitle = '🎥 Video Search';
            }
          }
          
          const updatedSession = { ...s, messages: newMessages, updatedAt: Date.now(), title: newTitle, category: newCategory || s.category };
          
          if (user?.id) {
            getToken({ template: 'supabase' }).then(token => {
              if (token) {
                saveChatSession(token, updatedSession.id, user.id, updatedSession.title, updatedSession.messages, updatedSession.category);
              }
            });
          }

          return updatedSession;
        }
        return s;
      });
      updatedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      saveSessionsToStorage(updatedSessions);
      
      if (newCategory && !expandedFolders.includes(newCategory)) {
          setExpandedFolders(prev => [...prev, newCategory]);
      }
    }
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      Animated.timing(slideAnim, { toValue: screenWidth, duration: 300, useNativeDriver: true }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, { toValue: screenWidth * 0.3, duration: 300, useNativeDriver: true }).start();
    }
  };

  const processVideoThumbnail = async (videoUri: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 2000 });
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }); 
      return { thumbnailUri: uri, base64 };
    } catch (e) {
      console.warn("Thumbnail generation error:", e);
      return null;
    }
  };

  const openCamera = async () => {
    setIsAttachMenuVisible(false);
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if(!p.granted) {
      Alert.alert("Permission needed", "Please allow camera access.");
      return;
    }
    let r = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.5, base64: true });
    if(!r.canceled) {
      const asset = r.assets[0];
      if (asset.type === 'video') {
        const videoData = await processVideoThumbnail(asset.uri);
        if (videoData) {
          setSelectedMedia({ uri: asset.uri, type: 'video', base64: videoData.base64, thumbnailUri: videoData.thumbnailUri });
        }
      } else {
        setSelectedMedia({ uri: asset.uri, type: 'image', base64: asset.base64 || undefined });
      }
    }
  };

  const openGallery = async () => {
    setIsAttachMenuVisible(false);
    let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsEditing: true, quality: 0.5, base64: true });
    if(!r.canceled) {
      const asset = r.assets[0];
      if (asset.type === 'video') {
        const videoData = await processVideoThumbnail(asset.uri);
        if (videoData) {
          setSelectedMedia({ uri: asset.uri, type: 'video', base64: videoData.base64, thumbnailUri: videoData.thumbnailUri });
        } else {
          Alert.alert("Error", "Could not process this video.");
        }
      } else {
        setSelectedMedia({ uri: asset.uri, type: 'image', base64: asset.base64 || undefined });
      }
    }
  };

  const closeMenus = () => {
    if (isAttachMenuVisible) setIsAttachMenuVisible(false);
    Keyboard.dismiss();
  };

  const sendMessage = async () => {
    if (inputText.trim() === '' && !selectedMedia) return;
    if (hasReachedLimit) { setIsPaywallVisible(true); return; }

    const userText = inputText.trim();
    const currentMedia = selectedMedia;
    const newUserMsg: MessageType = { 
      id: Date.now().toString(), 
      text: userText !== '' ? userText : undefined, 
      media: currentMedia?.type === 'video' ? currentMedia.thumbnailUri : currentMedia?.uri, 
      mediaType: currentMedia?.type, 
      sender: 'user' 
    };
    
    let updatedMsgs = [...messages, newUserMsg];
    updateCurrentSession(updatedMsgs);
    
    setInputText('');
    setSelectedMedia(null);
    setIsAttachMenuVisible(false);
    incrementMessageCount();

    const loadingId = (Date.now() + 1).toString();
    updatedMsgs = [...updatedMsgs, { id: loadingId, sender: 'bot', isLoading: true }];
    updateCurrentSession(updatedMsgs);

    const response = await fetchGameWalkthrough(userText, currentMedia, chatLanguage, messages);
    
    updatedMsgs = updatedMsgs.map(msg => msg.id === loadingId ? { id: loadingId, text: response.message, walkthroughData: response.walkthroughData, sender: 'bot' } : msg);
    
    updateCurrentSession(updatedMsgs, response.category);
  };

  const handleRating = (messageId: string, rating: 'up' | 'down') => {
    const updatedMsgs = messages.map(msg => 
      msg.id === messageId ? { ...msg, rating: msg.rating === rating ? undefined : rating } : msg
    );
    updateCurrentSession(updatedMsgs);
  };

  const renderBubbleContent = (msg: MessageType) => (
    <>
      {msg.media && (
        <View style={styles.messageMediaWrapper}>
          <Image source={{ uri: msg.media }} style={styles.messageImage} />
          {msg.mediaType === 'video' && (
            <View style={styles.playIconOverlayMessage}>
              <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
            </View>
          )}
        </View>
      )}
      
      {msg.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#00e5ff" />
          <Text style={styles.loadingText}>{t.loading}</Text> 
        </View>
      ) : (
        <>
          {msg.text && <Text style={styles.messageText}>{msg.text}</Text>}
          
          {msg.walkthroughData && (
            <View style={styles.solutionsWrapper}>
              <Text style={styles.solutionsHeader}>Solutions:</Text>
              
              {msg.walkthroughData.youtube && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${msg.walkthroughData!.youtube!.videoId}`)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.youtube.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.youtube.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#ff0000'}]}>📺 YouTube</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {msg.walkthroughData.wiki && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(msg.walkthroughData!.wiki!.url)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.wiki.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.wiki.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#00e5ff'}]}>📚 Fandom Wiki</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {msg.walkthroughData.ign && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(msg.walkthroughData!.ign!.url)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.ign.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.ign.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#bf1313'}]}>🕹️ IGN Guide</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
      )}
    </>
  );

  return (
    <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
      <SafeAreaView style={styles.container}>
        {isMenuOpen && <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />}
        
        <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
          <View style={styles.menuContent}>
            <TouchableOpacity activeOpacity={0.8} onPress={createNewSession}>
              <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.newChatBtn}>
                <Text style={styles.newChatBtnText}>{t.newChat}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={styles.menuSectionTitle}>{t.historyTitle}</Text>
            
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {Object.entries(groupedSessions).map(([category, catSessions]) => (
                <View key={category} style={styles.folderContainer}>
                  <TouchableOpacity style={styles.folderHeader} onPress={() => toggleFolder(category)}>
                    <Text style={styles.folderHeaderText}>📁 {category}</Text>
                    <Text style={styles.folderIcon}>{expandedFolders.includes(category) ? '▼' : '▶'}</Text>
                  </TouchableOpacity>
                  {expandedFolders.includes(category) && catSessions.map(session => (
                    <View key={session.id} style={[styles.historyItemWrapper, currentSessionId === session.id && styles.activeHistoryItem]}>
                      <TouchableOpacity style={styles.historyItemBtn} onPress={() => switchSession(session.id)}>
                        <Text style={[styles.historyItemText, currentSessionId === session.id && {color: '#00e5ff', fontWeight: 'bold'}]} numberOfLines={1}>{session.title}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSession(session.id)}>
                        <Text style={styles.deleteBtnText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user?.imageUrl && (
              <TouchableOpacity onPress={() => setIsProfileVisible(true)} style={styles.avatarWrapper}>
                <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.title}>FIXRA AI</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.hamburgerBtn} onPress={toggleMenu}>
              <Ionicons name="menu" size={32} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flex: 1 }}>
            
            {/* התיקון: הורדנו את ה-TouchableWithoutFeedback! */}
            {/* והוספנו onScrollBeginDrag ל-ScrollView כדי לסגור תפריטים מתי שמתחילים לגלול */}
            <ScrollView 
              style={styles.chatArea} 
              contentContainerStyle={{ padding: 15, paddingBottom: 20 }} 
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={closeMenus}
            >
              {messages.map((msg) => (
                <View key={msg.id} style={[styles.messageBubbleWrapper, msg.sender === 'user' ? styles.userBubbleWrapper : styles.botBubbleWrapper]}>
                  
                  {msg.sender === 'user' ? (
                    <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.messageBubble, styles.userBubble]}>
                      {renderBubbleContent(msg)}
                    </LinearGradient>
                  ) : (
                    <View style={[styles.messageBubble, styles.botBubble]}>
                      {renderBubbleContent(msg)}
                    </View>
                  )}
                  
                  {msg.sender === 'bot' && !msg.isLoading && (
                    <View style={styles.ratingContainer}>
                      <TouchableOpacity 
                        onPress={() => handleRating(msg.id, 'up')} 
                        style={[styles.ratingBtn, msg.rating === 'up' && styles.ratingBtnActiveUp]}
                      >
                        <Ionicons name={msg.rating === 'up' ? "thumbs-up" : "thumbs-up-outline"} size={16} color={msg.rating === 'up' ? "#00e5ff" : "#888"} />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        onPress={() => handleRating(msg.id, 'down')} 
                        style={[styles.ratingBtn, msg.rating === 'down' && styles.ratingBtnActiveDown]}
                      >
                        <Ionicons name={msg.rating === 'down' ? "thumbs-down" : "thumbs-down-outline"} size={16} color={msg.rating === 'down' ? "#ff00cc" : "#888"} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>

            {hasReachedLimit ? (
              <View style={styles.paywallBlockedField}>
                <Text style={styles.paywallText}>{t.limitReached}</Text>
                <TouchableOpacity activeOpacity={0.8} style={{width: '100%'}} onPress={() => setIsPaywallVisible(true)}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.paywallButton}>
                    <Text style={styles.paywallButtonText}>{t.upgradeNow}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                
                {isAttachMenuVisible && (
                  <View style={styles.floatingAttachMenu}>
                    <TouchableOpacity style={styles.attachMenuItem} onPress={openCamera}>
                      <Ionicons name="camera-outline" size={24} color="#00e5ff" style={styles.attachMenuIcon} />
                      <Text style={styles.attachMenuText}>{t.camera}</Text>
                    </TouchableOpacity>
                    <View style={styles.attachMenuDivider} />
                    <TouchableOpacity style={styles.attachMenuItem} onPress={openGallery}>
                      <Ionicons name="image-outline" size={24} color="#00e5ff" style={styles.attachMenuIcon} />
                      <Text style={styles.attachMenuText}>{t.gallery}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.inputUnifiedField}>
                  <TouchableOpacity onPress={() => setIsAttachMenuVisible(!isAttachMenuVisible)} style={styles.attachButton}>
                    <Text style={styles.attachButtonText}>+</Text>
                  </TouchableOpacity>
                  <View style={styles.inputContentContainer}>
                    {selectedMedia && (
                      <View style={styles.fieldPreviewContainer}>
                        <Image source={{ uri: selectedMedia.type === 'video' ? selectedMedia.thumbnailUri : selectedMedia.uri }} style={styles.fieldPreviewImage} />
                        {selectedMedia.type === 'video' && (
                          <View style={styles.playIconOverlayInput}>
                            <Ionicons name="play-circle" size={28} color="rgba(255,255,255,0.9)" />
                          </View>
                        )}
                        <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setSelectedMedia(null)}>
                          <Ionicons name="close" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <TextInput 
                      style={[styles.input, selectedMedia ? { paddingTop: PREVIEW_HEIGHT + 10 } : null]} 
                      placeholder={t.placeholder} 
                      placeholderTextColor="#aaaaaa" 
                      value={inputText} 
                      onChangeText={setInputText} 
                      onFocus={() => setIsAttachMenuVisible(false)}
                      multiline 
                    />
                  </View>
                  <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                    <Ionicons name="send" size={22} color="#00e5ff" style={{ paddingBottom: Platform.OS === 'ios' ? 12 : 14 }} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.disclaimerText}>{t.disclaimer}</Text>

              </View>
            )}
          </View>
        </KeyboardAvoidingView>

        <PaywallModal visible={isPaywallVisible} onClose={() => setIsPaywallVisible(false)} />
        <ProfileModal visible={isProfileVisible} onClose={() => setIsProfileVisible(false)} onOpenPaywall={() => setIsPaywallVisible(true)} />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50 },
  
  sideMenu: { position: 'absolute', top: 0, bottom: 0, width: screenWidth * 0.75, backgroundColor: 'rgba(10, 0, 38, 0.95)', zIndex: 100, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', padding: 20 },
  menuContent: { marginTop: 60, flex: 1 },
  newChatBtn: { padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 25 },
  newChatBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  menuSectionTitle: { color: '#00e5ff', fontSize: 13, fontWeight: 'bold', marginBottom: 15, textAlign: 'left', letterSpacing: 1 },
  historyList: { flex: 1, marginBottom: 20 },
  folderContainer: { marginBottom: 10 },
  folderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  folderHeaderText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  folderIcon: { color: '#00e5ff', fontSize: 14 },
  historyItemWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, paddingLeft: 10 },
  activeHistoryItem: { backgroundColor: 'rgba(0, 229, 255, 0.1)', borderRadius: 10, paddingHorizontal: 10, borderBottomWidth: 0 },
  historyItemBtn: { flex: 1, paddingVertical: 10 },
  historyItemText: { color: '#cccccc', fontSize: 15, textAlign: 'left' },
  deleteBtn: { padding: 10, opacity: 0.6 },
  deleteBtnText: { fontSize: 14 },
  
  header: { padding: 15, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', zIndex: 10 },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  avatarWrapper: { borderWidth: 2, borderColor: '#8a2be2', borderRadius: 20, overflow: 'hidden' },
  avatar: { width: 36, height: 36, resizeMode: 'cover' },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff', flex: 1, textAlign: 'center', letterSpacing: 2, textShadowColor: '#00e5ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  hamburgerBtn: { padding: 5 },
  hamburgerText: { fontSize: 28, color: '#ffffff' },
  keyboardView: { flex: 1 },
  chatArea: { flex: 1 },
  
  messageBubbleWrapper: { maxWidth: '85%', marginBottom: 15 },
  userBubbleWrapper: { alignSelf: 'flex-end' },
  botBubbleWrapper: { alignSelf: 'flex-start' },
  messageBubble: { padding: 15, borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 5 },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  messageText: { color: '#ffffff', fontSize: 16, marginTop: 5, textAlign: 'left', lineHeight: 22 },
  messageImage: { width: 220, height: 160, borderRadius: 10, resizeMode: 'cover' },
  messageMediaWrapper: { width: 220, height: 160, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 10 },
  playIconOverlayMessage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', padding: 5 },
  loadingText: { color: '#00e5ff', marginLeft: 10, fontSize: 14, flex: 1, fontWeight: '600' },
  solutionsWrapper: { marginTop: 15 },
  solutionsHeader: { color: '#aaaaaa', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  stableCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stableRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stableLeftIcon: { width: 100, height: '100%', resizeMode: 'cover' },
  stableTextContainer: { flex: 1, paddingHorizontal: 15, justifyContent: 'center' },
  solutionTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 6, lineHeight: 20 },
  solutionSubtitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  inputWrapper: { padding: 10, backgroundColor: 'transparent', position: 'relative' },
  inputUnifiedField: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', zIndex: 1 },
  inputContentContainer: { flex: 1, position: 'relative', marginHorizontal: 10 },
  attachButton: { paddingBottom: Platform.OS === 'ios' ? 7 : 10 },
  attachButtonText: { color: '#aaaaaa', fontSize: 30, fontWeight: '300' },
  sendButton: { paddingBottom: 0 },
  input: { color: '#ffffff', fontSize: 16, maxHeight: 180, textAlign: 'left', paddingTop: Platform.OS === 'ios' ? 15 : 12, paddingBottom: Platform.OS === 'ios' ? 15 : 12 },
  fieldPreviewContainer: { position: 'absolute', top: 10, right: 0, zIndex: 10, backgroundColor: '#1e1e1e', borderRadius: 10, padding: 2 },
  fieldPreviewImage: { width: 80, height: PREVIEW_HEIGHT, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  playIconOverlayInput: { position: 'absolute', top: 2, left: 2, right: 2, bottom: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8 },
  removeMediaBtn: { backgroundColor: '#ff00cc', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', position: 'absolute', left: -10, top: -10, zIndex: 11 },
  
  paywallBlockedField: { padding: 20, backgroundColor: 'rgba(10, 0, 38, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  paywallText: { color: '#aaaaaa', fontSize: 16, marginBottom: 15, textAlign: 'center' },
  paywallButton: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  paywallButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  
  floatingAttachMenu: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 70 : 65,
    left: 15,
    backgroundColor: 'rgba(10, 0, 38, 0.95)',
    borderRadius: 20,
    padding: 10,
    width: 160,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  attachMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  attachMenuIcon: {
    marginRight: 12,
  },
  attachMenuText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  attachMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 10,
  },

  ratingContainer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 8, gap: 10, marginLeft: 5 },
  ratingBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  ratingBtnActiveUp: { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
  ratingBtnActiveDown: { backgroundColor: 'rgba(255, 0, 204, 0.15)', borderColor: '#ff00cc' },

  disclaimerText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 10, letterSpacing: 0.5 }
});