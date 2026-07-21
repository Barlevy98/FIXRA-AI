import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuth, useUser } from '@clerk/clerk-expo'; // 🌟 הבאנו את Clerk
import { MessageType } from '../types';
import TypingIndicator from './TypingIndicator';
import { reportMessageToCloud } from '../utils/db'; // 🌟 הבאנו את הפונקציה שלנו

interface MessageBubbleProps {
  msg: MessageType;
  isBookmarked: boolean;
  onRate: (messageId: string, rating: 'up' | 'down') => void;
  onBookmark: (msg: MessageType) => void;
}

export default function MessageBubble({ msg, isBookmarked, onRate, onBookmark }: MessageBubbleProps) {
  const isUser = msg.sender === 'user';
  const { getToken } = useAuth();
  const { user } = useUser();

  // 🌟 סטייטים עבור הפופ-אפ של הדיווח
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleOpenReportModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReportReason('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      Alert.alert("Missing Info", "Please tell us why you are reporting this message.");
      return;
    }

    setIsSubmittingReport(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const token = await getToken({ template: 'supabase' });
      if (token && user?.id) {
        const success = await reportMessageToCloud(
          token, 
          user.id, 
          msg.id, 
          msg.text || "Media Message", 
          reportReason
        );
        
        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setReportModalVisible(false);
          Alert.alert("Thank You", "Your report has been securely sent to our moderation team.");
        } else {
          throw new Error("Failed to send");
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not send the report. Please try again later.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const renderContent = () => (
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
          <TypingIndicator />
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

              {msg.walkthroughData.polygon && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(msg.walkthroughData!.polygon!.url)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.polygon.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.polygon.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#a032a8'}]}>🟣 Polygon Guide</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {msg.walkthroughData.mapgenie && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(msg.walkthroughData!.mapgenie!.url)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.mapgenie.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.mapgenie.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#32a852'}]}>🗺️ MapGenie Location</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {msg.walkthroughData.fextralife && (
                <TouchableOpacity style={[styles.stableCard, {height: 135}]} onPress={() => Linking.openURL(msg.walkthroughData!.fextralife!.url)}>
                  <View style={styles.stableRow}>
                    <Image source={{ uri: msg.walkthroughData.fextralife.thumbnail }} style={styles.stableLeftIcon} />
                    <View style={styles.stableTextContainer}>
                      <Text style={styles.solutionTitle} numberOfLines={3}>{msg.walkthroughData.fextralife.title}</Text>
                      <Text style={[styles.solutionSubtitle, {color: '#d4af37'}]}>⚔️ Fextralife Guide</Text>
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
    <>
      {isUser ? (
        <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.messageBubble, styles.userBubble]}>
          {renderContent()}
        </LinearGradient>
      ) : (
        <View style={[styles.messageBubble, styles.botBubble]}>
          {renderContent()}
        </View>
      )}
      
      {!isUser && !msg.isLoading && (
        <View style={styles.botActionsWrapper}>
          <View style={styles.ratingContainer}>
            <TouchableOpacity onPress={() => onRate(msg.id, 'up')} style={[styles.actionBtn, msg.rating === 'up' && styles.actionBtnActiveUp]}>
              <Ionicons name={msg.rating === 'up' ? "thumbs-up" : "thumbs-up-outline"} size={16} color={msg.rating === 'up' ? "#00e5ff" : "#888"} />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => onRate(msg.id, 'down')} style={[styles.actionBtn, msg.rating === 'down' && styles.actionBtnActiveDown]}>
              <Ionicons name={msg.rating === 'down' ? "thumbs-down" : "thumbs-down-outline"} size={16} color={msg.rating === 'down' ? "#ff00cc" : "#888"} />
            </TouchableOpacity>
          </View>

          <View style={styles.ratingContainer}>
            {/* 🌟 כפתור הדיווח שפותח את הפופ-אפ המעוצב */}
            <TouchableOpacity 
              onPress={handleOpenReportModal} 
              style={styles.actionBtn}
            >
              <Ionicons name="flag-outline" size={16} color="#ff4444" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => onBookmark(msg)} 
              style={[styles.actionBtn, isBookmarked && styles.bookmarkBtnActive]}
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={16} 
                color={isBookmarked ? "#ffca28" : "#888"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 🌟 הפופ-אפ הקאסטום המעוצב לדיווחים! 🌟 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={reportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={24} color="#ff4444" />
              <Text style={styles.modalTitle}>Report Content</Text>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Help us keep the community safe. Why are you reporting this message?
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="e.g., Inappropriate language, hallucination, wrong game..."
              placeholderTextColor="#666"
              multiline
              autoFocus
              maxLength={200}
              value={reportReason}
              onChangeText={setReportReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setReportModalVisible(false)}
                disabled={isSubmittingReport}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.submitBtn]} 
                onPress={submitReport}
                disabled={isSubmittingReport}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  messageBubble: { padding: 15, borderRadius: 20 },
  userBubble: { borderBottomRightRadius: 5 },
  botBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  messageText: { color: '#ffffff', fontSize: 16, marginTop: 5, textAlign: 'auto', lineHeight: 22 },
  messageImage: { width: 220, height: 160, borderRadius: 10, resizeMode: 'cover' },
  messageMediaWrapper: { width: 220, height: 160, borderRadius: 10, overflow: 'hidden', position: 'relative', marginBottom: 10 },
  playIconOverlayMessage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, width: 60, height: 30 },
  solutionsWrapper: { marginTop: 15 },
  solutionsHeader: { color: '#aaaaaa', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  stableCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  stableRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stableLeftIcon: { width: 100, height: '100%', resizeMode: 'cover' },
  stableTextContainer: { flex: 1, paddingHorizontal: 15, justifyContent: 'center' },
  solutionTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginBottom: 6, lineHeight: 20 },
  solutionSubtitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  
  botActionsWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginLeft: 5, paddingRight: 5 },
  ratingContainer: { flexDirection: 'row', justifyContent: 'flex-start', gap: 10 },
  actionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  actionBtnActiveUp: { backgroundColor: 'rgba(0, 229, 255, 0.15)', borderColor: '#00e5ff' },
  actionBtnActiveDown: { backgroundColor: 'rgba(255, 0, 204, 0.15)', borderColor: '#ff00cc' },
  bookmarkBtnActive: { backgroundColor: 'rgba(255, 202, 40, 0.15)', borderColor: '#ffca28' },

  // 🌟 עיצוב הפופ-אפ החדש
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { width: '100%', backgroundColor: '#0f002b', borderRadius: 24, padding: 25, borderWidth: 1, borderColor: 'rgba(255,68,68,0.3)' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalTitle: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginLeft: 10 },
  modalSubtitle: { color: '#aaaaaa', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#ffffff', borderRadius: 15, padding: 15, minHeight: 100, textAlignVertical: 'top', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 25 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#555' },
  cancelBtnText: { color: '#cccccc', fontSize: 16, fontWeight: '600' },
  submitBtn: { backgroundColor: '#ff4444' },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
});