import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatSession } from '../types';

const screenWidth = Dimensions.get('window').width;

interface ChatSideMenuProps {
  slideAnim: Animated.Value;
  onNewChat: () => void;
  onOpenTutorial: () => void;
  onOpenFavorites: () => void;
  onOpenCommunity: () => void;
  onOpenPaywall: () => void;
  groupedSessions: Record<string, ChatSession[]>;
  expandedFolders: string[];
  onToggleFolder: (category: string) => void;
  currentSessionId: string | null;
  onSwitchSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  newChatText: string;
  historyTitleText: string;
}

export default function ChatSideMenu({
  slideAnim, onNewChat, onOpenTutorial, onOpenFavorites, onOpenCommunity, onOpenPaywall,
  groupedSessions, expandedFolders, onToggleFolder, currentSessionId, onSwitchSession, onDeleteSession,
  newChatText, historyTitleText
}: ChatSideMenuProps) {
  return (
    <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
      <View style={styles.menuContent}>
        
        <TouchableOpacity activeOpacity={0.8} onPress={onNewChat}>
          <LinearGradient colors={['#8a2be2', '#4b0082']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.newChatBtn}>
            <Text style={styles.newChatBtnText}>{newChatText}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.menuTopActions}>
          <TouchableOpacity style={styles.menuActionItem} onPress={onOpenTutorial}>
            <View style={[styles.menuActionCircle, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
              <Ionicons name="book-outline" size={22} color="#ffffff" />
            </View>
            <Text style={styles.menuActionText} numberOfLines={1} adjustsFontSizeToFit>Tutorial</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuActionItem} onPress={onOpenFavorites}>
            <View style={[styles.menuActionCircle, { backgroundColor: 'rgba(255, 202, 40, 0.15)' }]}>
              <Ionicons name="bookmark" size={20} color="#ffca28" />
            </View>
            <Text style={[styles.menuActionText, { color: '#ffca28' }]} numberOfLines={1} adjustsFontSizeToFit>Saved</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuActionItem} onPress={onOpenCommunity}>
            <View style={[styles.menuActionCircle, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
              <Ionicons name="planet" size={24} color="#00e5ff" />
            </View>
            <Text style={[styles.menuActionText, { color: '#00e5ff' }]} numberOfLines={1} adjustsFontSizeToFit>Community</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuActionItem} onPress={onOpenPaywall}>
            <View style={[styles.menuActionCircle, { backgroundColor: 'rgba(138, 43, 226, 0.15)' }]}>
              <Image source={require('../../assets/icon.png')} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
            </View>
            <Text style={[styles.menuActionText, { color: '#b19cd9' }]} numberOfLines={1} adjustsFontSizeToFit>Upgrade</Text>
          </TouchableOpacity>
        </View>
          
        <Text style={styles.menuSectionTitle}>{historyTitleText}</Text>
        
        <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
          {Object.entries(groupedSessions).map(([category, catSessions]) => (
            <View key={category} style={styles.folderContainer}>
              <TouchableOpacity style={styles.folderHeader} onPress={() => onToggleFolder(category)}>
                <Text style={styles.folderHeaderText}>📁 {category}</Text>
                <Text style={styles.folderIcon}>{expandedFolders.includes(category) ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              {expandedFolders.includes(category) && catSessions.map(session => (
                <View key={session.id} style={[styles.historyItemWrapper, currentSessionId === session.id && styles.activeHistoryItem]}>
                  <TouchableOpacity style={styles.historyItemBtn} onPress={() => onSwitchSession(session.id)}>
                    <Text style={[styles.historyItemText, currentSessionId === session.id && {color: '#00e5ff', fontWeight: 'bold'}]} numberOfLines={1}>{session.title}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => onDeleteSession(session.id)}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sideMenu: { position: 'absolute', top: 0, bottom: 0, width: screenWidth * 0.75, backgroundColor: 'rgba(10, 0, 38, 0.95)', zIndex: 100, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.1)', padding: 20 },
  menuContent: { marginTop: 60, flex: 1 },
  newChatBtn: { padding: 15, borderRadius: 15, alignItems: 'center', marginBottom: 20 },
  newChatBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  menuTopActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, paddingHorizontal: 2 },
  menuActionItem: { alignItems: 'center', width: '25%' },
  menuActionCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  menuActionText: { color: '#aaaaaa', fontSize: 11, fontWeight: '600' },
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
});