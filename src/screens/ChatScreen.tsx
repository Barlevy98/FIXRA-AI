import React, { useEffect, useState, useRef } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails'; 
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Haptics from 'expo-haptics'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { MessageType } from '../types';
import { usePaywall } from '../context/PaywallContext';
import PaywallModal from '../components/PaywallModal';
import ProfileModal from '../components/ProfileModal';
import TutorialModal from '../components/TutorialModal';
import TermsModal from '../components/TermsModal'; 
import FavoritesScreen from './FavoritesScreen';
import SettingsScreen from './SettingsScreen';
import CommunityModal from '../components/CommunityModal'; 
import { getTranslation } from '../utils/translations';
import { getUserTutorialStatus, markTutorialAsSeen, getUserTosStatus, saveBookmark, getUserBookmarks } from '../utils/db';
import MessageBubble from '../components/MessageBubble';
import ChatInputArea from '../components/ChatInputArea';
import ChatSideMenu from '../components/ChatSideMenu';
// 🌟 ה-Hook החדש שלנו!
import { useChatManager } from '../../hooks/useChatManager';

const screenWidth = Dimensions.get('window').width;

const AnimatedMessageItem = ({ isUser, children }: { isUser: boolean, children: React.ReactNode }) => {
  const slideAnim = useRef(new Animated.Value(20)).current; 
  const fadeAnim = useRef(new Animated.Value(0)).current; 

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.messageBubbleWrapper, 
      isUser ? styles.userBubbleWrapper : styles.botBubbleWrapper,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      {children}
    </Animated.View>
  );
};

export default function ChatScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { incrementMessageCount, hasReachedLimit, chatLanguage, currentPlan } = usePaywall();
  
  const t = getTranslation(chatLanguage);
  const greetingText = t.greeting(user?.firstName || '');

  // 🌟 קוראים לכל המוח של הצ'אט בשורה אחת!
  const chatManager = useChatManager(user, getToken, chatLanguage, currentPlan, t, greetingText);

  const [inputText, setInputText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{uri: string, type: 'image' | 'video', base64?: string | string[], thumbnailUri?: string} | null>(null);
  
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<string[]>([]);
  const [bookmarkedTexts, setBookmarkedTexts] = useState<string[]>([]);
  
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isFavoritesVisible, setIsFavoritesVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isCommunityVisible, setIsCommunityVisible] = useState(false); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAttachMenuVisible, setIsAttachMenuVisible] = useState(false);
  
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [hasCheckedTutorial, setHasCheckedTutorial] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const syncBookmarks = async () => {
      if (user?.id) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            const bookmarks = await getUserBookmarks(token, user.id);
            if (bookmarks) {
              const ids = bookmarks.map((b: any) => b.message_data?.originalId).filter(Boolean);
              const texts = bookmarks.map((b: any) => b.message_data?.text).filter(Boolean);
              setBookmarkedMessageIds(ids);
              setBookmarkedTexts(texts);
            }
          }
        } catch (e) {}
      }
    };
    syncBookmarks();
  }, [user?.id]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const checkFlow = async () => {
      if (user?.id && !hasCheckedTutorial) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            const hasAcceptedTos = await getUserTosStatus(token, user.id);
            if (hasAcceptedTos) {
              const hasSeenTut = await getUserTutorialStatus(token, user.id);
              if (!hasSeenTut) {
                setIsTutorialVisible(true);
              }
              setHasCheckedTutorial(true);
              if (intervalId) clearInterval(intervalId);
            }
          }
        } catch (e) {}
      }
    };
    checkFlow();
    intervalId = setInterval(checkFlow, 1500);
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [user, hasCheckedTutorial]);

  const handleCloseTutorial = async (): Promise<void> => {
    setIsTutorialVisible(false);
    if (user?.id) {
      try {
        const token = await getToken({ template: 'supabase' });
        if (token) await markTutorialAsSeen(token, user.id);
      } catch(e) {}
    }
  };

  const handleBookmarkMessage = async (msg: MessageType) => {
    if (!user?.id) return;
    const isAlreadySaved = bookmarkedMessageIds.includes(msg.id) || (msg.text && bookmarkedTexts.includes(msg.text));
    if (isAlreadySaved) {
      Alert.alert("Already Saved", "This solution is already in your favorites.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) return;

      const currentSession = Object.values(chatManager.groupedSessions).flat().find(s => s.id === chatManager.currentSessionId);
      const bookmarkTitle = currentSession ? currentSession.title : 'Saved Solution';

      const messageDataToSave = { originalId: msg.id, text: msg.text, walkthroughData: msg.walkthroughData };
      const success = await saveBookmark(token, user.id, bookmarkTitle, messageDataToSave);
      
      if (success) {
        setBookmarkedMessageIds(prev => [...prev, msg.id]);
        if (msg.text) setBookmarkedTexts(prev => [...prev, msg.text!]); 
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Could not save to favorites.");
      }
    } catch (e) {}
  };

  const toggleMenu = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isMenuOpen) {
      Animated.timing(slideAnim, { toValue: screenWidth, duration: 300, useNativeDriver: true }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      Animated.timing(slideAnim, { toValue: screenWidth * 0.3, duration: 300, useNativeDriver: true }).start();
    }
  };

  const processVideoFrames = async (videoUri: string, duration?: number | null) => {
    try {
      const framesToExtract = 5; 
      const base64Frames: string[] = [];
      let firstThumbnailUri = '';
      const safeDuration = (duration && duration > 0) ? duration : 5000; 
      const step = Math.floor(safeDuration / framesToExtract);

      for (let i = 0; i < framesToExtract; i++) {
        const time = Math.min(i * step, safeDuration - 100); 
        try {
          const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time });
          const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
          base64Frames.push(base64);
          if (i === 0) firstThumbnailUri = uri; 
        } catch (e) {}
      }
      if (base64Frames.length === 0) return null;
      return { thumbnailUri: firstThumbnailUri, base64Array: base64Frames };
    } catch (e) {
      return null;
    }
  };

  const openCamera = async () => {
    setIsAttachMenuVisible(false);
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if(!p.granted) { Alert.alert("Permission needed", "Please allow camera access."); return; }
    let r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.5, base64: true });
    if(!r.canceled) {
      const asset = r.assets[0];
      if (asset.type === 'video') {
        const videoData = await processVideoFrames(asset.uri, asset.duration);
        if (videoData) setSelectedMedia({ uri: asset.uri, type: 'video', base64: videoData.base64Array, thumbnailUri: videoData.thumbnailUri });
      } else {
        setSelectedMedia({ uri: asset.uri, type: 'image', base64: asset.base64 || undefined });
      }
    }
  };

  const openGallery = async () => {
    setIsAttachMenuVisible(false);
    let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsEditing: true, quality: 0.5, base64: true });
    if(!r.canceled) {
      const asset = r.assets[0];
      if (asset.type === 'video') {
        const videoData = await processVideoFrames(asset.uri, asset.duration);
        if (videoData) setSelectedMedia({ uri: asset.uri, type: 'video', base64: videoData.base64Array, thumbnailUri: videoData.thumbnailUri });
      } else {
        setSelectedMedia({ uri: asset.uri, type: 'image', base64: asset.base64 || undefined });
      }
    }
  };

  const closeMenus = () => {
    if (isAttachMenuVisible) setIsAttachMenuVisible(false);
    Keyboard.dismiss();
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '' && !selectedMedia) return;
    
    if (hasReachedLimit) { 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setIsPaywallVisible(true); 
      return; 
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 

    const userText = inputText.trim();
    const currentMedia = selectedMedia;
    
    setInputText('');
    setSelectedMedia(null);
    setIsAttachMenuVisible(false);

    const success = await chatManager.sendMessage(userText, currentMedia);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); 
      incrementMessageCount();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); 
    }
  };

  return (
    <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
      <SafeAreaView style={styles.container}>
        {isMenuOpen && <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />}
        
        <ChatSideMenu 
          slideAnim={slideAnim}
          onNewChat={() => chatManager.createNewSession(toggleMenu)}
          onOpenTutorial={() => { toggleMenu(); setIsTutorialVisible(true); }}
          onOpenFavorites={() => { toggleMenu(); setIsFavoritesVisible(true); }}
          onOpenCommunity={() => { toggleMenu(); setIsCommunityVisible(true); }}
          onOpenPaywall={() => { toggleMenu(); setIsPaywallVisible(true); }}
          groupedSessions={chatManager.groupedSessions}
          expandedFolders={chatManager.expandedFolders}
          onToggleFolder={chatManager.toggleFolder}
          currentSessionId={chatManager.currentSessionId}
          onSwitchSession={(id) => chatManager.switchSession(id, toggleMenu)}
          onDeleteSession={chatManager.deleteSession}
          newChatText={t.newChat}
          historyTitleText={t.historyTitle}
        />

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {user?.imageUrl && (
              <TouchableOpacity onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsProfileVisible(true); }} style={styles.avatarWrapper}>
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
            
            <ScrollView 
              ref={scrollViewRef}
              style={styles.chatArea} 
              contentContainerStyle={{ padding: 15, paddingBottom: 20 }} 
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={closeMenus}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
            >
              {chatManager.messages.map((msg) => {
                const isBookmarked = bookmarkedMessageIds.includes(msg.id) || (!!msg.text && bookmarkedTexts.includes(msg.text));
                
                return (
                  <AnimatedMessageItem key={msg.id} isUser={msg.sender === 'user'}>
                    <MessageBubble 
                      msg={msg} 
                      isBookmarked={isBookmarked} 
                      onRate={chatManager.handleRating} 
                      onBookmark={handleBookmarkMessage} 
                    />
                  </AnimatedMessageItem>
                );
              })}
            </ScrollView>

            {hasReachedLimit ? (
              <View style={styles.paywallBlockedField}>
                <Text style={styles.paywallText}>{t.limitReached}</Text>
                <TouchableOpacity activeOpacity={0.8} style={{width: '100%'}} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsPaywallVisible(true); }}>
                  <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.paywallButton}>
                    <Text style={styles.paywallButtonText}>{t.upgradeNow}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <ChatInputArea 
                inputText={inputText}
                setInputText={setInputText}
                selectedMedia={selectedMedia}
                setSelectedMedia={setSelectedMedia}
                isAttachMenuVisible={isAttachMenuVisible}
                setIsAttachMenuVisible={setIsAttachMenuVisible}
                onSendMessage={handleSendMessage}
                onOpenCamera={openCamera}
                onOpenGallery={openGallery}
                placeholder={t.placeholder}
                cameraText={t.camera}
                galleryText={t.gallery}
                disclaimerText={t.disclaimer}
              />
            )}
          </View>
        </KeyboardAvoidingView>

        <PaywallModal visible={isPaywallVisible} onClose={() => setIsPaywallVisible(false)} />
        <ProfileModal visible={isProfileVisible} onClose={() => setIsProfileVisible(false)} onOpenPaywall={() => setIsPaywallVisible(true)} />
        <SettingsScreen visible={isSettingsVisible} onClose={() => setIsSettingsVisible(false)} />
        <FavoritesScreen visible={isFavoritesVisible} onClose={() => setIsFavoritesVisible(false)} />
        <CommunityModal visible={isCommunityVisible} onClose={() => setIsCommunityVisible(false)} />
        <TutorialModal visible={isTutorialVisible} onClose={() => { handleCloseTutorial(); }} />
        <TermsModal />
        
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50 },
  header: { padding: 15, backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', zIndex: 10 },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  avatarWrapper: { borderWidth: 2, borderColor: '#8a2be2', borderRadius: 20, overflow: 'hidden' },
  avatar: { width: 36, height: 36, resizeMode: 'cover' },
  title: { fontSize: 22, fontWeight: '900', color: '#ffffff', flex: 1, textAlign: 'center', letterSpacing: 2, textShadowColor: '#00e5ff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  hamburgerBtn: { padding: 5 },
  keyboardView: { flex: 1 },
  chatArea: { flex: 1 },
  messageBubbleWrapper: { maxWidth: '85%', marginBottom: 15 },
  userBubbleWrapper: { alignSelf: 'flex-end' },
  botBubbleWrapper: { alignSelf: 'flex-start' },
  paywallBlockedField: { padding: 20, backgroundColor: 'rgba(10, 0, 38, 0.9)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  paywallText: { color: '#aaaaaa', fontSize: 16, marginBottom: 15, textAlign: 'center' },
  paywallButton: { paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  paywallButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }
});