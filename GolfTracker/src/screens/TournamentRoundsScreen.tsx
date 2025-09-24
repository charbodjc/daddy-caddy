import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { GolfRound } from '../types';

const TournamentRoundsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { tournament } = route.params as { tournament: any };
  const [rounds, setRounds] = useState<GolfRound[]>([]);

  useEffect(() => {
    loadRounds();
  }, []);

  // Reload rounds when screen is focused (e.g., after deletion)
  useFocusEffect(
    React.useCallback(() => {
      loadRounds();
    }, [])
  );

  const loadRounds = async () => {
    try {
      const allRounds = await DatabaseService.getRounds();
      // Only show rounds that have at least one scored hole
      const tournamentRounds = allRounds.filter(r => 
        r.tournamentId === tournament.id && 
        r.holes && 
        r.holes.some(h => h.strokes > 0)
      );
      setRounds(tournamentRounds);
    } catch (error) {
      console.error('Error loading rounds:', error);
    }
  };

  const selectRound = (round: GolfRound) => {
    // Set as active round and navigate to scoring tab
    DatabaseService.setPreference('active_round_id', round.id);
    navigation.getParent()?.navigate('Scoring' as never, {
      screen: 'RoundTracker',
      params: {
        roundId: round.id,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
      }
    } as never);
  };

  const deleteRound = (round: GolfRound) => {
    Alert.alert(
      'Delete Round?',
      `Delete ${round.name || `Round at ${round.courseName}`}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteRound(round.id);
              loadRounds();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete round');
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const createNewRound = () => {
    // Navigate to scoring tab with tournament info
    navigation.getParent()?.navigate('Scoring' as never, {
      screen: 'RoundTracker',
      params: {
        tournamentId: tournament.id,
        tournamentName: tournament.name,
      }
    } as never);
  };

  const renderRound = ({ item }: { item: GolfRound }) => {
    const completedHoles = item.holes?.filter(h => h.strokes > 0).length || 0;
    const totalStrokes = item.totalScore || item.holes?.reduce((sum, h) => sum + (h.strokes || 0), 0) || 0;
    
    return (
      <TouchableOpacity
        style={styles.roundCard}
        onPress={() => selectRound(item)}
      >
        <View style={styles.roundHeader}>
          <View>
            <Text style={styles.roundName}>{item.name || 'Unnamed Round'}</Text>
            <Text style={styles.roundDate}>{formatDate(item.date)}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => deleteRound(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="delete" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.roundStats}>
          <View style={styles.statItem}>
            <FontAwesome5 name="flag" size={16} color="#666" />
            <Text style={styles.statText}>Holes: {completedHoles}/18</Text>
          </View>
          {totalStrokes > 0 && (
            <View style={styles.statItem}>
              <FontAwesome5 name="golf-ball" size={16} color="#666" />
              <Text style={styles.statText}>Score: {totalStrokes}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{tournament.name}</Text>
          <Text style={styles.subtitle}>{tournament.courseName}</Text>
        </View>
      </View>

      {rounds.length === 0 ? (
        <View style={styles.emptyState}>
          <FontAwesome5 name="golf-ball" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No rounds yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start tracking your first round
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={createNewRound}>
            <Icon name="play-arrow" size={24} color="#fff" />
            <Text style={styles.addFirstButtonText}>Start Round</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rounds}
          renderItem={renderRound}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {rounds.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={createNewRound}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  roundCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  roundName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  roundDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  roundStats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  },
  addFirstButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    alignItems: 'center',
    gap: 10,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});

export default TournamentRoundsScreen;
