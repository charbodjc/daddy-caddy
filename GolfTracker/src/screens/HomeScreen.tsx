import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { GolfRound } from '../types';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [activeRound, setActiveRound] = useState<GolfRound | null>(null);
  const [recentRounds, setRecentRounds] = useState<GolfRound[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [newRoundModal, setNewRoundModal] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<string>('Round 1');
  const [showRoundPicker, setShowRoundPicker] = useState(false);

  useEffect(() => {
    loadData();
    loadTournaments();
    loadRecentRounds();
  }, []);

  const loadData = async () => {
    try {
      // Database is now initialized at app level
      const activeRoundId = await DatabaseService.getPreference('active_round_id');
      if (activeRoundId) {
        const round = await DatabaseService.getRound(activeRoundId);
        if (round && !round.totalScore) {
          setActiveRound(round);
        } else {
          setActiveRound(null);
        }
      } else {
        setActiveRound(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadTournaments = async () => {
    try {
      const tournamentsData = await DatabaseService.getTournaments();
      setTournaments(tournamentsData || []);
    } catch (error) {
      console.error('Error loading tournaments:', error);
      setTournaments([]);
    }
  };

  const loadRecentRounds = async () => {
    try {
      const rounds = await DatabaseService.getRounds();
      // Get the 10 most recent rounds
      setRecentRounds(rounds.slice(0, 10));
    } catch (error) {
      console.error('Error loading recent rounds:', error);
      setRecentRounds([]);
    }
  };

  const confirmDeleteRound = (round: GolfRound) => {
    Alert.alert(
      'Delete Round?',
      `Delete round at ${round.courseName} from ${formatDate(round.date)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteRound(round.id);
              if (round.id === activeRound?.id) {
                await DatabaseService.setPreference('active_round_id', '');
              }
              await loadData();
              await loadRecentRounds();
            } catch (e) {
              // noop
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await loadTournaments();
    await loadRecentRounds();
    setRefreshing(false);
  };

  const openRound = (roundId: string) => {
    // Set as active round and navigate to tracker
    DatabaseService.setPreference('active_round_id', roundId);
    navigation.navigate('Tournaments' as never, { 
      screen: 'RoundTracker', 
      params: { roundId } 
    } as never);
  };

  const calculateScoreToPar = (round: GolfRound): string => {
    if (!round.holes || round.holes.length === 0) return 'E';
    
    const completedHoles = round.holes.filter(h => h.strokes > 0);
    if (completedHoles.length === 0) return 'E';
    
    const totalStrokes = completedHoles.reduce((sum, h) => sum + (h.strokes || 0), 0);
    const totalPar = completedHoles.reduce((sum, h) => sum + (h.par || 4), 0);
    const diff = totalStrokes - totalPar;
    
    if (diff === 0) return 'E';
    return diff > 0 ? `+${diff}` : `${diff}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800' }}
        style={styles.header}
        imageStyle={styles.headerImage}
      >
        <View style={styles.headerOverlay}>
            <FontAwesome5 name="golf-ball" size={40} color="#fff" style={styles.headerIcon} />
            <Text style={styles.title}>Daddy Caddy</Text>
          <Text style={styles.subtitle}>Track, Analyze, Report</Text>
        </View>
      </ImageBackground>

      {/* Recent Rounds */}
      <View style={styles.statsOverview}>
        <Text style={styles.sectionTitle}>Recent Rounds</Text>
        {recentRounds.length > 0 ? (
          <View>
            {recentRounds.map((round) => {
              const completedHoles = round.holes?.filter(h => h.strokes > 0).length || 0;
              const scoreToPar = calculateScoreToPar(round);
              
              return (
                <TouchableOpacity
                  key={round.id}
                  style={styles.roundCard}
                  onPress={() => openRound(round.id)}
                >
                  <View style={styles.roundHeader}>
                    <View style={{ flex: 1 }}>
                      {round.tournamentName && (
                        <Text style={styles.tournamentName}>{round.tournamentName}</Text>
                      )}
                      <Text style={styles.courseName}>
                        {round.courseName}
                      </Text>
                      <Text style={styles.roundInfo}>
                        {round.name || 'Practice Round'} • {formatDate(round.date)}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => confirmDeleteRound(round)} 
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="delete" size={20} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.roundStats}>
                    <View style={styles.roundStatItem}>
                      <FontAwesome5 name="flag" size={14} color="#666" />
                      <Text style={styles.roundStatText}>{completedHoles}/18</Text>
                    </View>
                    <View style={[styles.scoreBox, 
                      scoreToPar.startsWith('+') ? styles.overPar : 
                      scoreToPar.startsWith('-') ? styles.underPar : 
                      styles.evenPar
                    ]}>
                      <Text style={styles.scoreText}>{scoreToPar}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome5 name="golf-ball" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No rounds yet</Text>
            <Text style={styles.emptyStateSubtext}>Create a tournament to get started</Text>
          </View>
        )}
      </View>

      {/* New Round Modal */}
      <Modal visible={newRoundModal} transparent animationType="slide" onRequestClose={() => setNewRoundModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.newRoundCard}>
            <Text style={styles.sectionTitle}>Create New Round</Text>
            
            {/* Tournament Selector */}
            <TouchableOpacity 
              style={styles.dropdownButton}
              onPress={() => setShowTournamentPicker(!showTournamentPicker)}
            >
              <Text style={styles.dropdownButtonText}>
                {selectedTournamentId === 'none' 
                  ? 'No Tournament' 
                  : selectedTournamentId 
                    ? tournaments.find(t => t.id === selectedTournamentId)?.name || 'Select Tournament'
                    : 'Select Tournament'}
              </Text>
              <Icon name={showTournamentPicker ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
            </TouchableOpacity>
            
            {/* Tournament Picker Dropdown */}
            {showTournamentPicker && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 200 }}>
                  {tournaments.map(tournament => (
                    <TouchableOpacity
                      key={tournament.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setSelectedTournamentId(tournament.id);
                        setShowTournamentPicker(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{tournament.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.dropdownItem, { borderTopWidth: 1, borderTopColor: '#eee' }]}
                    onPress={() => {
                      setSelectedTournamentId('none');
                      setShowTournamentPicker(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, { fontStyle: 'italic' }]}>No Tournament</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
            
            {/* Course Name Input - Only show for No Tournament */}
            {selectedTournamentId === 'none' && (
              <TextInput
                style={styles.input}
                placeholder="Course Name (required)"
                placeholderTextColor="#666"
                value={courseName}
                onChangeText={setCourseName}
              />
            )}
            
            {/* Round Number Selection - Always use standard naming */}
            {selectedTournamentId ? (
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowRoundPicker(!showRoundPicker)}
              >
                <Text style={styles.dropdownButtonText}>{selectedRoundNumber}</Text>
                <Icon name={showRoundPicker ? 'arrow-drop-up' : 'arrow-drop-down'} size={24} color="#666" />
              </TouchableOpacity>
            ) : null}
            
            {/* Round Number Picker */}
            {showRoundPicker && selectedTournamentId && (
              <View style={styles.dropdownList}>
                {['Round 1', 'Round 2', 'Round 3', 'Round 4'].map(roundNum => (
                  <TouchableOpacity
                    key={roundNum}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedRoundNumber(roundNum);
                      setShowRoundPicker(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{roundNum}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
              <TouchableOpacity 
                style={[styles.saveButton, { flex: 1, backgroundColor: '#4CAF50' }]} 
                onPress={async () => {
                  // Validate inputs
                  if (selectedTournamentId === 'none' && !courseName.trim()) {
                    Alert.alert('Course Name Required', 'Please enter a course name');
                    return;
                  }
                  
                  // Create round and associate with tournament
                  const id = Date.now().toString();
                  const selectedTournament = selectedTournamentId && selectedTournamentId !== 'none' 
                    ? tournaments.find(t => t.id === selectedTournamentId)
                    : null;
                  
                  const round: GolfRound = {
                    id,
                    courseName: selectedTournament?.courseName || courseName.trim() || 'Unknown Course',
                    date: new Date(),
                    holes: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    tournamentId: selectedTournament?.id || undefined,
                    tournamentName: selectedTournament?.name || undefined,
                  } as any;
                  
                  // Always use standard round naming
                  (round as any).name = selectedRoundNumber;
                  
                  await DatabaseService.saveRound({ ...round, holes: [] });
                  await DatabaseService.setPreference('active_round_id', id);
                  
                  // Reset modal state
                  setNewRoundModal(false);
                  setCourseName('');
                  setSelectedTournamentId(null);
                  setSelectedRoundNumber('Round 1');
                  setShowTournamentPicker(false);
                  setShowRoundPicker(false);
                  
                  // Reload data to show new round
                  await loadData();
                  
                  // Navigate to round tracker
                  navigation.navigate('Tournaments' as never, { screen: 'RoundTracker', params: { roundId: id } } as never);
                }}
              >
                <Text style={styles.saveButtonText}>Start Round</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, { flex: 1 }]} 
                onPress={() => {
                  setNewRoundModal(false);
                  setCourseName('');
                  setSelectedTournamentId(null);
                  setSelectedRoundNumber('Round 1');
                  setShowTournamentPicker(false);
                  setShowRoundPicker(false);
                }}
              >
                <Text style={styles.saveButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    opacity: 0.8,
  },
  headerOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  fullWidthButton: {
    width: '100%',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  actionButtonTextDark: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  statsOverview: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newRoundCard: {
    backgroundColor: '#fff',
    width: '90%',
    maxWidth: 420,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  scoreDistribution: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  recentRounds: {
    padding: 20,
    paddingTop: 0,
  },
  roundCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roundInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  tournamentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 2,
  },
  roundDate: {
    fontSize: 14,
    color: '#666',
  },
  scoreBox: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  overPar: {
    backgroundColor: '#ffebee',
  },
  underPar: {
    backgroundColor: '#e8f5e9',
  },
  evenPar: {
    backgroundColor: '#f5f5f5',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  roundStats: {
    flexDirection: 'row',
    gap: 15,
  },
  roundStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roundStatText: {
    fontSize: 14,
    color: '#666',
  },
  aiInsight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 5,
  },
  aiInsightText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  saveButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default HomeScreen;