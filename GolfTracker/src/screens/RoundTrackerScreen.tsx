import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { GolfRound, GolfHole } from '../types';

const RoundTrackerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tournamentId = (route.params as any)?.tournamentId;
  const tournamentName = (route.params as any)?.tournamentName;

  const [courseName, setCourseName] = useState('');
  const [currentHole, setCurrentHole] = useState(1);
  const [holes, setHoles] = useState<GolfHole[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [roundId, setRoundId] = useState<string>('');

  useEffect(() => {
    initializeHoles();
  }, []);

  const initializeHoles = () => {
    const initialHoles: GolfHole[] = [];
    const standardPars = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5]; // Standard 18-hole par 72
    
    for (let i = 1; i <= 18; i++) {
      initialHoles.push({
        holeNumber: i,
        par: standardPars[i - 1],
        strokes: 0,
        fairwayHit: undefined,
        greenInRegulation: undefined,
        putts: undefined,
        notes: '',
        mediaUrls: [],
      });
    }
    setHoles(initialHoles);
  };

  const startRound = () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    // Generate a round ID for this session
    setRoundId(Date.now().toString());
    setIsStarted(true);
  };

  const updateHole = (holeNumber: number, updates: Partial<GolfHole>) => {
    setHoles(prevHoles => 
      prevHoles.map(hole => 
        hole.holeNumber === holeNumber 
          ? { ...hole, ...updates }
          : hole
      )
    );
  };

  const navigateToHoleDetails = (holeNumber: number) => {
    navigation.navigate('ShotTracking' as never, {
      hole: holes[holeNumber - 1],
      roundId: roundId,
      onSave: (updatedHole: GolfHole) => {
        updateHole(holeNumber, updatedHole);
      },
    } as never);
  };

  const navigateToCamera = () => {
    navigation.navigate('Camera' as never, {
      currentHole,
      roundId: roundId,
      onCapture: (mediaUrl: string) => {
        const hole = holes[currentHole - 1];
        updateHole(currentHole, {
          mediaUrls: [...(hole.mediaUrls || []), mediaUrl],
        });
      },
    } as never);
  };

  const calculateScore = () => {
    const completedHoles = holes.filter(h => h.strokes > 0);
    const totalStrokes = completedHoles.reduce((sum, h) => sum + h.strokes, 0);
    const totalPar = completedHoles.reduce((sum, h) => sum + h.par, 0);
    const score = totalStrokes - totalPar;
    return {
      totalStrokes,
      totalPar,
      score,
      completedHoles: completedHoles.length,
    };
  };

  const finishRound = async () => {
    const stats = calculateScore();
    
    if (stats.completedHoles === 0) {
      Alert.alert('Error', 'Please record scores for at least one hole');
      return;
    }

    Alert.alert(
      'Finish Round?',
      `You have completed ${stats.completedHoles} holes. Finish this round?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              const round: GolfRound = {
                id: roundId,
                tournamentId,
                tournamentName,
                courseName,
                date: new Date(),
                holes: holes.filter(h => h.strokes > 0),
                totalScore: stats.totalStrokes,
                totalPutts: holes.reduce((sum, h) => sum + (h.putts || 0), 0),
                fairwaysHit: holes.filter(h => h.fairwayHit === true).length,
                greensInRegulation: holes.filter(h => h.greenInRegulation === true).length,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              await DatabaseService.saveRound(round);
              navigation.navigate('RoundSummary' as never, { roundId: round.id } as never);
            } catch (error) {
              Alert.alert('Error', 'Failed to save round. Please try again.');
              console.error('Save round error:', error);
            }
          },
        },
      ]
    );
  };

  const getHoleStatus = (hole: GolfHole) => {
    if (hole.strokes === 0) return 'pending';
    const score = hole.strokes - hole.par;
    if (score <= -2) return 'eagle';
    if (score === -1) return 'birdie';
    if (score === 0) return 'par';
    if (score === 1) return 'bogey';
    return 'double';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eagle': return '#FFD700';
      case 'birdie': return '#4CAF50';
      case 'par': return '#2196F3';
      case 'bogey': return '#FF9800';
      case 'double': return '#F44336';
      default: return '#ccc';
    }
  };

  if (!isStarted) {
    return (
      <View style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.setupTitle}>New Round Setup</Text>
          
          {tournamentName && (
            <View style={styles.tournamentInfo}>
              <Icon name="emoji-events" size={20} color="#4CAF50" />
              <Text style={styles.tournamentText}>{tournamentName}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Course Name"
            value={courseName}
            onChangeText={setCourseName}
            autoCapitalize="words"
          />

          <TouchableOpacity style={styles.startButton} onPress={startRound}>
            <Icon name="play-arrow" size={24} color="#fff" />
            <Text style={styles.startButtonText}>Start Round</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stats = calculateScore();

  return (
    <View style={styles.container}>
      {/* Header with score */}
      <View style={styles.header}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{courseName}</Text>
          {tournamentName && (
            <Text style={styles.tournamentName}>{tournamentName}</Text>
          )}
        </View>
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>
            {stats.score > 0 ? '+' : ''}{stats.score}
          </Text>
        </View>
      </View>

      {/* Current Hole Quick Entry */}
      <View style={styles.currentHoleSection}>
        <Text style={styles.currentHoleTitle}>Hole {currentHole}</Text>
        <View style={styles.quickEntry}>
          <View style={styles.quickEntryRow}>
            <Text style={styles.quickEntryLabel}>Par {holes[currentHole - 1].par}</Text>
            <View style={styles.strokeButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(strokes => (
                <TouchableOpacity
                  key={strokes}
                  style={[
                    styles.strokeButton,
                    holes[currentHole - 1].strokes === strokes && styles.strokeButtonActive,
                  ]}
                  onPress={() => updateHole(currentHole, { strokes })}
                >
                  <Text style={[
                    styles.strokeButtonText,
                    holes[currentHole - 1].strokes === strokes && styles.strokeButtonTextActive,
                  ]}>
                    {strokes}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => navigateToHoleDetails(currentHole)}
            >
              <Icon name="golf-course" size={20} color="#4CAF50" />
              <Text style={styles.quickActionText}>Shot Track</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={navigateToCamera}
            >
              <Icon name="camera-alt" size={20} color="#4CAF50" />
              <Text style={styles.quickActionText}>Photo</Text>
            </TouchableOpacity>

            {currentHole < 18 && (
              <TouchableOpacity
                style={[styles.quickActionButton, styles.nextButton]}
                onPress={() => setCurrentHole(currentHole + 1)}
                disabled={holes[currentHole - 1].strokes === 0}
              >
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Hole Grid */}
      <ScrollView style={styles.holesContainer}>
        <Text style={styles.sectionTitle}>All Holes</Text>
        <View style={styles.holesGrid}>
          {holes.map((hole) => {
            const status = getHoleStatus(hole);
            return (
              <TouchableOpacity
                key={hole.holeNumber}
                style={[
                  styles.holeCard,
                  currentHole === hole.holeNumber && styles.holeCardActive,
                ]}
                onPress={() => setCurrentHole(hole.holeNumber)}
              >
                <Text style={styles.holeNumber}>{hole.holeNumber}</Text>
                <View style={[styles.holeStatus, { backgroundColor: getStatusColor(status) }]}>
                  <Text style={styles.holeScore}>
                    {hole.strokes > 0 ? hole.strokes : '-'}
                  </Text>
                </View>
                <Text style={styles.holePar}>Par {hole.par}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.finishButton} onPress={finishRound}>
          <Icon name="check-circle" size={24} color="#fff" />
          <Text style={styles.finishButtonText}>Finish Round</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  setupContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tournamentText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tournamentName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scoreInfo: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  currentHoleSection: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentHoleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickEntry: {
    gap: 15,
  },
  quickEntryRow: {
    gap: 10,
  },
  quickEntryLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  strokeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  strokeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  strokeButtonActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  strokeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  strokeButtonTextActive: {
    color: '#fff',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  holesContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  holesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  holeCard: {
    width: '22%',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  holeCardActive: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  holeNumber: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  holeStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  holeScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  holePar: {
    fontSize: 11,
    color: '#999',
  },
  finishButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RoundTrackerScreen;
