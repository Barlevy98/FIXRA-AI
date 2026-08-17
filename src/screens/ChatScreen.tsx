import React, { useEffect, useState, useRef } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated, Dimensions, Keyboard, Modal, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails'; 
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Haptics from 'expo-haptics'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; 
import { RewardedAd, RewardedAdEventType, AdEventType, TestIds } from 'react-native-google-mobile-ads';

import { MessageType } from '../types';
import { usePaywall } from '../context/PaywallContext';
import PaywallModal from '../components/PaywallModal';
import ProfileModal from '../components/ProfileModal';
import TutorialModal from '../components/TutorialModal';
import TermsModal from '../components/TermsModal'; 
import FavoritesScreen from './FavoritesScreen';
import SettingsScreen from './SettingsScreen';
import CommunityModal from '../components/CommunityModal'; 
import GameLibraryModal from '../components/GameLibraryModal'; 
import { getTranslation } from '../utils/translations';

import { getUserTutorialStatus, markTutorialAsSeen, getUserTosStatus, saveBookmark, getUserBookmarks, syncUserFullName } from '../utils/db'; 
import MessageBubble from '../components/MessageBubble';
import ChatInputArea from '../components/ChatInputArea';
import ChatSideMenu from '../components/ChatSideMenu';
import { useChatManager } from '../../hooks/useChatManager';

const adUnitId = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9244809721385064/7538115836';

const rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

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
  
  const { width: dynamicScreenWidth } = useWindowDimensions();
  const isTablet = dynamicScreenWidth >= 768 || (Platform.OS === 'ios' && (Platform as any).isPad);

  const { 
    hasReachedLimit, 
    chatLanguage, 
    currentPlan,
    effectivePlan,
    cycleLimit,
    grantRewardMessage 
  } = usePaywall();
  
  const t = getTranslation(chatLanguage);
  const greetingText = t.greeting(user?.firstName || '');

  const chatManager = useChatManager(user, getToken, chatLanguage, effectivePlan, t, greetingText);

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
  
  const [isGameLibraryVisible, setIsGameLibraryVisible] = useState(false);
  const [hasAutoOpenedLibrary, setHasAutoOpenedLibrary] = useState(false);

  const [isLimitModalVisible, setIsLimitModalVisible] = useState(false);
  const [isAdLoaded, setIsAdLoaded] = useState(false);

  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsubscribeLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setIsAdLoaded(true);
    });

    const unsubscribeEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        grantRewardMessage();
        setIsLimitModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setIsAdLoaded(false);
        rewardedAd.load();
      },
    );

    const unsubscribeClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      setIsAdLoaded(false);
      rewardedAd.load();
    });

    rewardedAd.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      slideAnim.setValue(dynamicScreenWidth);
    }
  }, [dynamicScreenWidth, isMenuOpen]);

  useEffect(() => {
    const syncName = async () => {
      if (user?.id && user?.fullName) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            await syncUserFullName(token, user.id, user.fullName);
          }
        } catch (e) {
          console.log("Error syncing user name:", e);
        }
      }
    };
    syncName();
  }, [user?.id, user?.fullName]);

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
    let intervalId: ReturnType<typeof setInterval>;
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

  useEffect(() => {
    if (hasCheckedTutorial && !isTutorialVisible && !hasAutoOpenedLibrary) {
      const allSessions = Object.values(chatManager.groupedSessions).flat();
      const isBrandNewUser = allSessions.length === 0 || (allSessions.length === 1 && allSessions[0].messages.length <= 1 && allSessions[0].category === 'General');
      
      if (isBrandNewUser) {
        setIsGameLibraryVisible(true);
      }
      setHasAutoOpenedLibrary(true);
    }
  }, [hasCheckedTutorial, isTutorialVisible, chatManager.groupedSessions, hasAutoOpenedLibrary]);

  const handleCloseTutorial = async (): Promise<void> => {
    setIsTutorialVisible(false);
    if (user?.id) {
      try {
        const token = await getToken({ template: 'supabase' });
        if (token) await markTutorialAsSeen(token, user.id);
        
        const allSessions = Object.values(chatManager.groupedSessions).flat();
        if (allSessions.length === 0 || (allSessions.length === 1 && allSessions[0].messages.length <= 1)) {
           setTimeout(() => setIsGameLibraryVisible(true), 500);
        }
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
      Animated.timing(slideAnim, { toValue: dynamicScreenWidth, duration: 300, useNativeDriver: true }).start(() => setIsMenuOpen(false));
    } else {
      setIsMenuOpen(true);
      const targetPosition = isTablet ? dynamicScreenWidth - 320 : dynamicScreenWidth * 0.3;
      Animated.timing(slideAnim, { toValue: targetPosition, duration: 300, useNativeDriver: true }).start();
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

  const enforceMediaTierLimit = () => {
    const isPro = effectivePlan?.startsWith('PRO') || effectivePlan === 'PREMIUM';
    if (!isPro && effectivePlan !== 'PREMIUM') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Upgrade Required", 
        "Image and video analysis are available for Pro and Premium users. Upgrade now to unlock visual AI!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => setIsPaywallVisible(true) }
        ]
      );
      return false;
    }
    return true;
  };

  const enforceVideoTierLimit = (assetType: string) => {
    if (assetType === 'video' && effectivePlan !== 'PREMIUM') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        "Premium Required", 
        "Video frame analysis is an exclusive Premium feature. Upgrade to unlock!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => setIsPaywallVisible(true) }
        ]
      );
      return false;
    }
    return true;
  };

  const openCamera = async () => {
    setIsAttachMenuVisible(false);
    if (!enforceMediaTierLimit()) return; 

    const p = await ImagePicker.requestCameraPermissionsAsync();
    if(!p.granted) { Alert.alert("Permission needed", "Please allow camera access."); return; }
    
    const mediaTypes = effectivePlan === 'PREMIUM' ? ['images', 'videos'] : ['images'];
    
    let r = await ImagePicker.launchCameraAsync({ mediaTypes: mediaTypes as any, allowsEditing: true, quality: 0.5, base64: true });
    
    if(!r.canceled) {
      const asset = r.assets[0];
      if (!enforceVideoTierLimit(asset.type || 'image')) return; 

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
    if (!enforceMediaTierLimit()) return; 

    const mediaTypes = effectivePlan === 'PREMIUM' ? ['images', 'videos'] : ['images'];

    let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: mediaTypes as any, allowsEditing: true, quality: 0.5, base64: true });
    
    if(!r.canceled) {
      const asset = r.assets[0];
      if (!enforceVideoTierLimit(asset.type || 'image')) return; 
      
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
      setIsLimitModalVisible(true);
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
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); 
    }
  };

  const handleSelectGame = (gameName: string) => {
    setIsGameLibraryVisible(false);
    chatManager.createNewSession(undefined, gameName); 
  };

  const handleTrapClick = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setIsLimitModalVisible(true);
  };

  const isFreePlan = currentPlan === 'Free';
  const canWatchAd = isFreePlan && cycleLimit < 3;
  const adButtonText = cycleLimit === 1 ? (t as any).watchAdForPro : (t as any).watchAdForPremium;

  return (
    <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
      <SafeAreaView style={styles.container}>
        {isMenuOpen && <TouchableOpacity style={styles.overlay} onPress={toggleMenu} activeOpacity={1} />}
        
        <ChatSideMenu 
          slideAnim={slideAnim}
          onNewChat={() => { toggleMenu(); setIsGameLibraryVisible(true); }}
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

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' && !isTablet ? 'padding' : undefined}
        >
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

            <View style={{ position: 'relative' }}>
              
              {/* 🌟 האייקון הצף והקבוע שמופיע כשיש זכאות לפרסומת ונגמרו ההודעות */}
              {canWatchAd && hasReachedLimit && (
                <TouchableOpacity 
                  style={styles.floatingAdBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isAdLoaded) {
                      rewardedAd.show();
                    } else {
                      Alert.alert('Loading', 'Ad is still loading. Please make sure you have internet connection and try again in a few seconds.');
                    }
                  }}
                >
                  <LinearGradient colors={['#00e5ff', '#007acc']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.floatingAdGradient}>
                    <Ionicons name="play-circle" size={20} color="#ffffff" />
                    <Text style={styles.floatingAdText}>{(t as any).adIconText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

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
                placeholder={hasReachedLimit ? t.lockedPlaceholder(currentPlan) : t.placeholder}
                cameraText={t.camera}
                galleryText={t.gallery}
                disclaimerText={t.disclaimer}
              />
              
              {hasReachedLimit && (
                <TouchableOpacity 
                  style={styles.paywallTrapOverlay} 
                  activeOpacity={1}
                  onPress={handleTrapClick}
                />
              )}
            </View>

          </View>
        </KeyboardAvoidingView>

        <Modal visible={isLimitModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.limitModalCard}>
              <View style={styles.limitIconWrapper}>
                 <Ionicons name="hourglass" size={38} color="#8a2be2" />
              </View>
              
              <Text style={styles.limitModalTitle}>{t.limitAlertTitle}</Text>
              <Text style={styles.limitModalSubtitle}>{t.limitReached(currentPlan)}</Text>
              
              {canWatchAd && (
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  style={[styles.trialPopupBtn, { marginBottom: 15, borderWidth: 1, borderColor: '#00e5ff', backgroundColor: 'rgba(0, 229, 255, 0.05)' }]}
                  onPress={() => {
                    if (isAdLoaded) {
                      rewardedAd.show();
                    } else {
                      Alert.alert('Loading', 'Ad is still loading. Please make sure you have internet connection and try again in a few seconds.');
                    }
                  }}
                >
                  <View style={[styles.trialPopupBtnGradient, { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }]}>
                    <Ionicons name="play-circle" size={22} color="#00e5ff" />
                    <Text style={[styles.trialPopupBtnText, { color: '#00e5ff' }]}>
                      {isAdLoaded ? adButtonText : "Loading Ad..."}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                activeOpacity={0.8} 
                style={styles.trialPopupBtn} 
                onPress={() => {
                  setIsLimitModalVisible(false);
                  setIsPaywallVisible(true);
                }}
              >
                <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.trialPopupBtnGradient}>
                  <Text style={styles.trialPopupBtnText}>
                    {isFreePlan && !canWatchAd ? (t as any).getMoreMessages : (t as any).upgradeNow}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.trialPopupCloseBtn} onPress={() => setIsLimitModalVisible(false)}>
                {/* 🌟 שינוי הטקסט של הביטול ל"אולי אחר כך" אם יש פרסומות */}
                <Text style={styles.limitCancelText}>{canWatchAd ? (t as any).maybeLater : t.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <GameLibraryModal visible={isGameLibraryVisible} onClose={() => setIsGameLibraryVisible(false)} onSelectGame={handleSelectGame} />
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
  paywallTrapOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'transparent' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  trialPopupBtn: { width: '100%', borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  trialPopupBtnGradient: { paddingVertical: 16, alignItems: 'center' },
  trialPopupBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 },
  trialPopupCloseBtn: { padding: 10 },
  limitModalCard: { backgroundColor: '#0a0026', width: '100%', borderRadius: 25, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#8a2be2', shadowColor: '#8a2be2', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  limitIconWrapper: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(138, 43, 226, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#8a2be2' },
  limitModalTitle: { color: '#ffffff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  limitModalSubtitle: { color: '#aaaaaa', fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
  limitCancelText: { color: '#888888', fontSize: 15, fontWeight: 'bold' },
  
  // עיצוב לכפתור האייקון המרחף מעל שורת ההקלדה
  floatingAdBtn: {
    position: 'absolute',
    top: -45, 
    alignSelf: 'center',
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#00e5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    zIndex: 60,
  },
  floatingAdGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderRadius: 20,
  },
  floatingAdText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  }
});