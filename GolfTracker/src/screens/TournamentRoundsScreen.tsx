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
import RoundDeletionManager from '../utils/RoundDeletionManager';
import { GolfRound, GolfHole } from '../types';

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
      
      // Also listen for round deletions
      const cleanup = RoundDeletionManager.addListener((deletedRoundId) => {
        console.log('Round deleted, refreshing TournamentRoundsScreen for tournament:', tournament.id);
        // Reload rounds after a brief delay to ensure database has completed the delete
        setTimeout(() => {
          loadRounds();
        }, 100);
      });

      return cleanup;
    }, [tournament.id])
  );

  const loadRounds = async () => {
    try {
      const allRounds = await DatabaseService.getRounds();
      // Show all rounds for this tournament
      const tournamentRounds = allRounds.filter(r => 
        r.tournamentId === tournament.id
      );
      
      // Debug logging
      console.log('Loaded tournament rounds:', tournamentRounds.map(r => ({
        id: r.id,
        name: r.name,
        holesCount: r.holes?.length,
        totalScore: r.totalScore,
        holesWithStrokes: r.holes?.filter(h => h.strokes > 0).length,
        firstHole: r.holes?.[0],
        holesData: r.holes?.slice(0, 3).map(h => ({ num: h.holeNumber, strokes: h.strokes, par: h.par }))
      })));
      
      // Sort by creation date (oldest first) or by round name
      tournamentRounds.sort((a, b) => {
        // First try to sort by round number if names are like "Round 1", "Round 2"
        const aNum = parseInt(a.name?.replace('Round ', '') || '0');
        const bNum = parseInt(b.name?.replace('Round ', '') || '0');
        if (aNum && bNum) {
          return aNum - bNum;
        }
        // Otherwise sort by creation date
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
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
              console.log(`🗑️ Starting deletion of round ${round.id} from tournament screen`);
              
              // If this round is the active round, clear it first
              const activeRoundId = await DatabaseService.getPreference('active_round_id');
              if (activeRoundId === round.id) {
                await DatabaseService.setPreference('active_round_id', '');
                console.log('✅ Cleared active round preference');
              }
              
              // Delete the round from database
              await DatabaseService.deleteRound(round.id);
              console.log(`✅ Database deleteRound completed for ${round.id}`);
              
              // Wait for deletion to propagate
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Force reload the rounds list
              await loadRounds();
              console.log('✅ Tournament rounds list reloaded');
            } catch (e) {
              console.error('❌ Failed to delete round from tournament:', e);
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

  const createNewRound = async () => {
    try {
      // Determine the round number based on existing rounds
      const roundNumber = rounds.length + 1;
      const roundName = `Round ${roundNumber}`;
      
      // Create the new round with proper initial holes structure
      const initialHoles: GolfHole[] = Array.from({ length: 18 }, (_, i) => ({
        holeNumber: i + 1,
        par: 4, // Default par, will be set when playing
        strokes: 0,
        fairwayHit: false,
        greenInRegulation: false,
        putts: 0,
      }));
      
      // Create the new round
      const newRound: GolfRound = {
        id: `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: roundName,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        courseName: tournament.courseName,
        date: new Date(),
        holes: initialHoles,
        totalScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Save the round
      await DatabaseService.saveRound(newRound);
      
      // Set as active round and navigate to scoring tab
      await DatabaseService.setPreference('active_round_id', newRound.id);
      navigation.getParent()?.navigate('Scoring' as never, {
        screen: 'RoundTracker',
        params: {
          roundId: newRound.id,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
        }
      } as never);
    } catch (error) {
      console.error('Error creating round:', error);
      Alert.alert('Error', 'Failed to create round');
    }
  };

  const renderRound = ({ item }: { item: GolfRound }) => {
    // Ensure holes array exists and calculate completed holes
    const holesArray = item.holes || [];
    const completedHoles = holesArray.filter(h => h && typeof h.strokes === 'number' && h.strokes > 0).length;
    const totalStrokes = item.totalScore || holesArray.reduce((sum, h) => sum + (h?.strokes || 0), 0) || 0;
    const isInProgress = completedHoles > 0 && completedHoles < 18;
    const isCompleted = completedHoles === 18;
    const notStarted = completedHoles === 0;
    
    return (
      <TouchableOpacity
        style={styles.roundCard}
        onPress={() => selectRound(item)}
      >
        <View style={styles.roundHeader}>
          <View style={styles.roundInfo}>
            <Text style={styles.roundName}>{item.name || 'Unnamed Round'}</Text>
            <Text style={styles.roundDate}>{formatDate(item.date)}</Text>
            {notStarted && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Not Started</Text>
              </View>
            )}
            {isInProgress && (
              <View style={[styles.statusBadge, styles.inProgressBadge]}>
                <Text style={styles.statusText}>In Progress</Text>
              </View>
            )}
            {isCompleted && (
              <View style={[styles.statusBadge, styles.completedBadge]}>
                <Text style={styles.statusText}>Completed</Text>
              </View>
            )}
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
            <Text style={styles.addFirstButtonText}>Start Round 1</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rounds}
          renderItem={renderRound}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListFooterComponent={() => <View style={{ height: 100 }} />}
        />
      )}

      {rounds.length > 0 && rounds.length < 4 && (
        <TouchableOpacity style={styles.fab} onPress={createNewRound}>
          <Icon name="add" size={28} color="#fff" />
          <Text style={styles.fabText}>Start Round {rounds.length + 1}</Text>
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
  roundInfo: {
    flex: 1,
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
  statusBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  inProgressBadge: {
    backgroundColor: '#fff3cd',
  },
  completedBadge: {
    backgroundColor: '#d4edda',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
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
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TournamentRoundsScreen;
