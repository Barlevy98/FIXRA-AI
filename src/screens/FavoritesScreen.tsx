import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Linking, ActivityIndicator, Alert, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as Haptics from 'expo-haptics';
import { getUserBookmarks, deleteBookmark } from '../utils/db';

interface FavoritesScreenProps {
  visible: boolean;
  onClose: () => void;
}

export default function FavoritesScreen({ visible, onClose }: FavoritesScreenProps) {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const { user } = useUser();
  
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 🌟 סטייט חדש ששומר איזה מועדפים פתוחים כרגע לקריאה מלאה
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    if (visible && user?.id) {
      loadBookmarks();
    }
  }, [visible, user?.id]);

  const loadBookmarks = async () => {
    setIsLoading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const data = await getUserBookmarks(token, user!.id);
        setBookmarks(data || []);
      }
    } catch (e) {
      console.error("Error loading bookmarks:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Remove Bookmark",
      "Are you sure you want to remove this solution from your favorites?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              const token = await getToken({ template: 'supabase' });
              if (token) {
                await deleteBookmark(token, id);
                setBookmarks(prev => prev.filter(b => b.id !== id));
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            } catch (e) {
              console.error("Error deleting bookmark:", e);
            }
          }
        }
      ]
    );
  };

  // 🌟 פונקציה שפותחת/סוגרת טקסט ארוך
  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const renderLinks = (walkthroughData: any) => {
    if (!walkthroughData) return null;
    return (
      <View style={styles.linksContainer}>
        {walkthroughData.youtube && (
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${walkthroughData.youtube.videoId}`)}>
            <Ionicons name="logo-youtube" size={18} color="#ff0000" />
            <Text style={styles.linkText} numberOfLines={1}>{walkthroughData.youtube.title}</Text>
          </TouchableOpacity>
        )}
        {walkthroughData.wiki && (
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(walkthroughData.wiki.url)}>
            <Ionicons name="book" size={18} color="#00e5ff" />
            <Text style={styles.linkText} numberOfLines={1}>{walkthroughData.wiki.title}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={['#050012', '#0a0026', '#000000']} style={styles.background}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, 20) }]}>
          
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="chevron-down" size={28} color="#aaaaaa" />
              <Text style={styles.closeBtnText}>Back to Chat</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.screenTitle}>Saved Solutions <Ionicons name="bookmark" size={28} color="#ffca28" /></Text>

          {isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#00e5ff" />
            </View>
          ) : bookmarks.length === 0 ? (
            <View style={styles.centerContent}>
              <Ionicons name="bookmarks-outline" size={64} color="rgba(255,255,255,0.2)" style={{marginBottom: 20}} />
              <Text style={styles.emptyText}>No saved solutions yet.</Text>
              <Text style={styles.emptySubText}>Tap the bookmark icon in the chat to save helpful guides here.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
              {bookmarks.map((bookmark) => (
                <View key={bookmark.id} style={styles.bookmarkCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{bookmark.title}</Text>
                    <TouchableOpacity onPress={() => handleDelete(bookmark.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                  
                  {bookmark.message_data?.text && (
                    // 🌟 הנה הכפתור שעוטף את הטקסט ומאפשר להרחיב אותו!
                    <TouchableOpacity activeOpacity={0.7} onPress={() => toggleExpand(bookmark.id)}>
                      <Text 
                        style={styles.messageText} 
                        numberOfLines={expandedIds.includes(bookmark.id) ? undefined : 4}
                      >
                        {bookmark.message_data.text}
                      </Text>
                      {bookmark.message_data.text.length > 150 && (
                        <Text style={styles.expandText}>
                          {expandedIds.includes(bookmark.id) ? 'Show less' : 'Read more...'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {renderLinks(bookmark.message_data?.walkthroughData)}
                </View>
              ))}
            </ScrollView>
          )}

        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  header: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 20 },
  closeBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  closeBtnText: { color: '#aaaaaa', fontSize: 16, marginLeft: 5, fontWeight: '500' },
  screenTitle: { fontSize: 32, fontWeight: '900', color: '#ffffff', marginBottom: 20, letterSpacing: 1, paddingHorizontal: 20 },
  
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  emptySubText: { color: '#aaaaaa', fontSize: 15, textAlign: 'center', lineHeight: 22 },

  bookmarkCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12 },
  cardTitle: { color: '#00e5ff', fontSize: 16, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  deleteBtn: { padding: 5, backgroundColor: 'rgba(255, 68, 68, 0.1)', borderRadius: 10 },
  
  messageText: { color: '#cccccc', fontSize: 15, lineHeight: 22, marginBottom: 5 },
  expandText: { color: '#00e5ff', fontSize: 13, fontWeight: 'bold', marginBottom: 15, marginTop: 5 }, // הוספנו עיצוב לכפתור הקריאה
  
  linksContainer: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, marginTop: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  linkText: { color: '#ffffff', fontSize: 14, marginLeft: 10, flex: 1 }
});