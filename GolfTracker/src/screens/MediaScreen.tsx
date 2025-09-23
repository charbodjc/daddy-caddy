import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import DatabaseService from '../services/database';
import { Tournament, GolfRound, MediaItem } from '../types';

const MediaScreen = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<GolfRound | null>(null);
  const [mediaByHole, setMediaByHole] = useState<Record<number, MediaItem[]>>({});

  useEffect(() => {
    (async () => {
      try {
        const t = await DatabaseService.getTournaments();
        setTournaments(t);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openRound = async (round: GolfRound) => {
    setSelectedRound(round);
    const items = await DatabaseService.getMediaForRound(round.id);
    const grouped: Record<number, MediaItem[]> = {};
    items.forEach(m => {
      const key = m.holeNumber || 0;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(m);
    });
    setMediaByHole(grouped);
  };

  if (selectedRound) {
    const holes = Array.from({ length: 18 }, (_, i) => i + 1);
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Photos and Videos</Text>
        </View>
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelectedRound(null)} style={{ padding: 8 }}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>{selectedRound.courseName} • {new Date(selectedRound.date).toLocaleDateString()}</Text>
          </View>
        </View>
        {holes.map(hole => (
          <View key={hole} style={styles.section}>
            <Text style={styles.holeTitle}>Hole {hole}</Text>
            <View style={styles.thumbRow}>
              {(mediaByHole[hole] || []).map(item => (
                <TouchableOpacity key={item.id} onPress={() => { /* OS viewer will handle URI */ }}>
                  {item.type === 'photo' ? (
                    <Image source={{ uri: item.uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.videoThumb]}>
                      <Icon name="videocam" size={18} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
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
              <Text style={styles.roundName}>{r.courseName} — {new Date(r.date).toLocaleDateString()}</Text>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  section: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  roundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  roundName: { color: '#333' },
  holeTitle: { fontWeight: '600', color: '#333', marginBottom: 8 },
  thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 6, backgroundColor: '#ddd' },
  videoThumb: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50' },
});

export default MediaScreen;


