import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, Image, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RAWG_API_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY || '';

// 🌟 רשימת ברירת מחדל חדשה עם שרתי התמונות של Steam (יציב ב-100%, איכות פרימיום)
const POPULAR_GAMES = [
  { id: '1', name: 'Grand Theft Auto V', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/library_600x900_2x.jpg' },
  { id: '2', name: 'Elden Ring', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/library_600x900_2x.jpg' },
  { id: '3', name: 'Call of Duty', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1938090/library_600x900_2x.jpg' },
  { id: '4', name: 'Cyberpunk 2077', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/library_600x900_2x.jpg' },
  { id: '5', name: 'Red Dead Redemption 2', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/library_600x900_2x.jpg' },
  { id: '6', name: 'Hogwarts Legacy', cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/990080/library_600x900_2x.jpg' },
];

interface GameLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGame: (gameName: string) => void;
}

export default function GameLibraryModal({ visible, onClose, onSelectGame }: GameLibraryModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchQuery)}&page_size=15`
        );
        const json = await response.json();
        
        if (json.results) {
          const formattedResults = json.results.map((game: any) => ({
            id: game.id.toString(),
            name: game.name,
            cover: game.background_image || 'https://via.placeholder.com/150'
          }));
          setSearchResults(formattedResults);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectGame = (gameName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    setSearchResults([]);
    onSelectGame(gameName);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  const displayedGames = searchQuery.trim().length > 0 ? searchResults : POPULAR_GAMES;

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.modalContent, { marginTop: insets.top + 50 }]}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Add Game</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#aaaaaa" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#aaaaaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any game..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#aaaaaa" />
              </TouchableOpacity>
            )}
          </View>

          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00e5ff" />
              <Text style={styles.loadingText}>Searching global database...</Text>
            </View>
          ) : (
            <FlatList
              data={displayedGames}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.listContainer}
              columnWrapperStyle={styles.rowWrapper}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="game-controller-outline" size={50} color="#333" />
                  <Text style={styles.emptyText}>No games found for "{searchQuery}"</Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.gameCard} 
                  activeOpacity={0.8}
                  onPress={() => handleSelectGame(item.name)}
                >
                  <Image source={{ uri: item.cover }} style={styles.gameImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
                    style={styles.gameGradient}
                  >
                    <Text style={styles.gameName} numberOfLines={2}>{item.name}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            />
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#050012', 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    margin: 20,
    borderRadius: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  listContainer: {
    paddingHorizontal: 15,
    paddingBottom: 40,
  },
  rowWrapper: {
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gameCard: {
    width: '48%',
    aspectRatio: 0.75,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gameImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gameGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 10,
  },
  gameName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#666',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  loadingText: {
    color: '#00e5ff',
    marginTop: 15,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  }
});