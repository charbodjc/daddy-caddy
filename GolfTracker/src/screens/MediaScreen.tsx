import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator, Modal, Dimensions, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Q } from '@nozbe/watermelondb';
import { database } from '../database/watermelon/database';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import Media from '../database/watermelon/models/Media';
import { MediaItem } from '../types';
import Video from 'react-native-video';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const MediaScreen = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaByHole, setMediaByHole] = useState<Record<number, MediaItem[]>>({});
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const items = await database.collections.get<Tournament>('tournaments').query().fetch();
        setTournaments(items);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openRound = async (round: Round) => {
    try {
      setSelectedRound(round);
      const mediaItems = await database.collections
        .get<Media>('media')
        .query(Q.where('round_id', round.id))
        .fetch();
      
      console.log(`📸 Loaded ${mediaItems.length} media items for round ${round.id}`);
      
      // Convert WatermelonDB Media to MediaItem format
      const items: MediaItem[] = mediaItems.map(m => ({
        id: m.id,
        uri: m.uri,
        type: m.type,
        roundId: m.roundId || '',
        holeNumber: m.holeNumber || 0,
        timestamp: new Date(m.timestamp),
        description: m.description || undefined
      }));
      
      const grouped: Record<number, MediaItem[]> = {};
      items.forEach(m => {
        console.log(`Media item: ${m.id}, type: ${m.type}, uri: ${m.uri}`);
        const key = m.holeNumber || 0;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(m);
      });
      setMediaByHole(grouped);
    } catch (error) {
      console.error('Error loading round media:', error);
      Alert.alert('Error', 'Failed to load media for this round');
    }
  };
  
  const openMedia = (item: MediaItem) => {
    setSelectedMedia(item);
    setShowMediaViewer(true);
  };

  const closeMediaViewer = () => {
    setSelectedMedia(null);
    setShowMediaViewer(false);
  };

  if (selectedRound) {
    // Only show holes that have media
    const holesWithMedia = Object.keys(mediaByHole)
      .map(h => parseInt(h))
      .filter(h => mediaByHole[h] && mediaByHole[h].length > 0)
      .sort((a, b) => a - b);
      
    return (
      <>
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Photos and Videos</Text>
          </View>
          
          <View style={styles.roundHeader}>
            <TouchableOpacity onPress={() => setSelectedRound(null)} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.roundInfo}>
              <Text style={styles.roundName}>
                {selectedRound.name || `Round at ${selectedRound.courseName}`}
              </Text>
              <Text style={styles.roundDetails}>
                {selectedRound.courseName} • {new Date(selectedRound.date).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {holesWithMedia.length > 0 ? (
            holesWithMedia.map(hole => (
              <View key={hole} style={styles.section}>
                <Text style={styles.holeTitle}>Hole {hole}</Text>
                <View style={styles.thumbRow}>
                  {(mediaByHole[hole] || []).map(item => (
                    <TouchableOpacity key={item.id} onPress={() => openMedia(item)}>
                      {item.type === 'photo' ? (
                        <Image 
                          source={{ uri: item.uri }} 
                          style={styles.thumb}
                          onError={() => {
                            console.error(`Failed to load thumbnail for ${item.id}`);
                          }}
                        />
                      ) : (
                        <View style={[styles.thumb, styles.videoThumb]}>
                          <Icon name="videocam" size={18} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <FontAwesome5 name="camera" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No media for this round</Text>
              <Text style={styles.emptyStateSubtext}>
                Take photos or videos during your round to see them here
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Media Viewer Modal */}
        <Modal
          visible={showMediaViewer}
          transparent={true}
          animationType="fade"
          onRequestClose={closeMediaViewer}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={closeMediaViewer}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
            {selectedMedia && (
              <View style={styles.mediaContainer}>
                {selectedMedia.type === 'photo' ? (
                  <Image 
                    source={{ uri: selectedMedia.uri }} 
                    style={styles.fullscreenImage}
                    resizeMode="contain"
                    onError={(error) => {
                      console.error('Image load error:', error);
                      Alert.alert('Error', 'Failed to load image. The file may have been moved or deleted.');
                    }}
                  />
                ) : (
                  <Video
                    source={{ uri: selectedMedia.uri }}
                    style={styles.fullscreenVideo}
                    controls={true}
                    resizeMode="contain"
                    paused={false}
                    onError={(error) => {
                      console.error('Video load error:', error);
                      Alert.alert('Error', 'Failed to load video. The file may have been moved or deleted.');
                    }}
                  />
                )}
              </View>
            )}
          </View>
        </Modal>
      </>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Photos and Videos</Text>
      </View>
      {tournaments.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="camera" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No media yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a tournament and capture photos/videos during rounds
          </Text>
        </View>
      ) : (
      <>
      {tournaments.map(t => (
        <View key={t.id} style={styles.section}>
          <Text style={styles.sectionTitle}>{t.name}</Text>
          {t.rounds.map(r => (
            <TouchableOpacity key={r.id} style={styles.roundRow} onPress={() => openRound(r)}>
              <Icon name="image" size={18} color="#4CAF50" />
              <Text style={styles.roundItemName}>{r.name || `Round at ${r.courseName}`} — {new Date(r.date).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))}
          {t.rounds.length === 0 && (
            <Text style={{ color: '#999' }}>No rounds yet</Text>
          )}
        </View>
      ))}
      </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#4CAF50', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  roundInfo: {
    flex: 1,
  },
  roundName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roundDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  section: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  roundItemName: { color: '#333' },
  holeTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  videoThumb: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#333' },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  mediaContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  fullscreenVideo: {
    width: screenWidth,
    height: screenHeight * 0.6,
  },
});

export default MediaScreen;