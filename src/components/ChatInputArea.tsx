import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const PREVIEW_HEIGHT = 80;

interface ChatInputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  selectedMedia: { uri: string, type: 'image' | 'video', thumbnailUri?: string } | null;
  setSelectedMedia: (media: any | null) => void;
  isAttachMenuVisible: boolean;
  setIsAttachMenuVisible: (visible: boolean) => void;
  onSendMessage: () => void;
  onOpenCamera: () => void;
  onOpenGallery: () => void;
  placeholder: string;
  cameraText: string;
  galleryText: string;
  disclaimerText: string;
}

export default function ChatInputArea({
  inputText, setInputText,
  selectedMedia, setSelectedMedia,
  isAttachMenuVisible, setIsAttachMenuVisible,
  onSendMessage, onOpenCamera, onOpenGallery,
  placeholder, cameraText, galleryText, disclaimerText
}: ChatInputAreaProps) {
  return (
    <View style={styles.inputWrapper}>
      
      {isAttachMenuVisible && (
        <View style={styles.floatingAttachMenu}>
          <TouchableOpacity style={styles.attachMenuItem} onPress={onOpenCamera}>
            <Ionicons name="camera-outline" size={24} color="#00e5ff" style={styles.attachMenuIcon} />
            <Text style={styles.attachMenuText}>{cameraText}</Text>
          </TouchableOpacity>
          <View style={styles.attachMenuDivider} />
          <TouchableOpacity style={styles.attachMenuItem} onPress={onOpenGallery}>
            <Ionicons name="image-outline" size={24} color="#00e5ff" style={styles.attachMenuIcon} />
            <Text style={styles.attachMenuText}>{galleryText}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputUnifiedField}>
        <TouchableOpacity 
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsAttachMenuVisible(!isAttachMenuVisible); }} 
          style={styles.attachButton}
        >
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
              <TouchableOpacity style={styles.removeMediaBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMedia(null); }}>
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          <TextInput 
            style={[styles.input, selectedMedia ? { paddingTop: PREVIEW_HEIGHT + 10 } : null]} 
            placeholder={selectedMedia ? "Add game name for perfect answer..." : placeholder} 
            placeholderTextColor="#aaaaaa" 
            value={inputText} 
            onChangeText={setInputText} 
            onFocus={() => setIsAttachMenuVisible(false)}
            multiline 
          />
        </View>
        <TouchableOpacity testID="send-button" onPress={onSendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={22} color="#00e5ff" style={{ paddingBottom: Platform.OS === 'ios' ? 12 : 14 }} />
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimerText}>{disclaimerText}</Text>

    </View>
  );
}

const styles = StyleSheet.create({
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
  attachMenuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
  attachMenuIcon: { marginRight: 12 },
  attachMenuText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  attachMenuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 10 },
  
  disclaimerText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, textAlign: 'center', marginTop: 10, letterSpacing: 0.5 }
});