import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatabaseService from '../services/database';
import MediaService from '../services/media';
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
  const [activeRound, setActiveRound] = useState<GolfRound | null>(null);

  useEffect(() => {
    initializeHoles();
    loadActiveRound();
  }, []);

  const loadActiveRound = async () => {
    try {
      // Check for saved active round
      const savedRoundId = await DatabaseService.getPreference('active_round_id');
      if (savedRoundId) {
        const round = await DatabaseService.getRound(savedRoundId);
        if (round && !round.totalScore) { // Only load if round is not finished
          setRoundId(round.id);
          setCourseName(round.courseName);
          setIsStarted(true);
          setActiveRound(round);
          if (round.holes) {
            setHoles(round.holes);
            // Find the next unplayed hole
            const nextHole = round.holes.find(h => h.strokes === 0);
            if (nextHole) {
              setCurrentHole(nextHole.holeNumber);
            }
          }
        } else {
          // Clear the preference if round is finished or not found
          await DatabaseService.setPreference('active_round_id', '');
        }
      }
    } catch (error) {
      console.error('Error loading active round:', error);
    }
  };

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

  const startRound = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    // Generate a round ID for this session
    const newRoundId = Date.now().toString();
    setRoundId(newRoundId);
    setIsStarted(true);
    
    // Save the active round ID to preferences
    try {
      await DatabaseService.setPreference('active_round_id', newRoundId);
      
      // Create a preliminary round in the database
      const newRound: GolfRound = {
        id: newRoundId,
        tournamentId,
        tournamentName,
        courseName: courseName.trim(),
        date: new Date(),
        holes,
        totalScore: undefined, // Not finished yet
        totalPutts: undefined,
        fairwaysHit: undefined,
        greensInRegulation: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await DatabaseService.saveRound(newRound);
      setActiveRound(newRound);
    } catch (error) {
      console.error('Error saving active round:', error);
    }
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
          style: 'default',
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
              // Clear the active round preference
              await DatabaseService.setPreference('active_round_id', '');
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

  const deleteRound = async () => {
    Alert.alert(
      'Delete Round?',
      'Are you sure you want to delete this round? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear the active round preference
              await DatabaseService.setPreference('active_round_id', '');
              // Delete the round if it was saved
              if (activeRound) {
                await DatabaseService.deleteRound(roundId);
              }
              // Navigate back to home
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete round.');
              console.error('Delete round error:', error);
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
      case 'eagle': return '#FFD700';  // Gold for eagle
      case 'birdie': return '#FF0000'; // Red for birdie
      case 'par': return 'transparent'; // No background for par
      case 'bogey': return 'transparent'; // No background for bogey (single)
      case 'double': return '#000'; // Black for double bogey or worse
      default: return '#ccc';
    }
  };

  if (!isStarted) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.setupContainer}>
            <View style={styles.setupContent}>
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
                returnKeyType="done"
                onSubmitEditing={startRound}
              />

              <TouchableOpacity style={styles.startButton} onPress={startRound}>
                <Icon name="play-arrow" size={24} color="#fff" />
                <Text style={styles.startButtonText}>Start Round</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }

  const stats = calculateScore();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      {/* Header with score */}
      <View style={styles.header}>
        <View style={styles.courseInfo}>
          <Text style={styles.courseName}>{courseName}</Text>
          {tournamentName && (
            <Text style={styles.tournamentName}>{tournamentName}</Text>
          )}
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={deleteRound}
          >
            <Icon name="delete" size={24} color="#ff6b6b" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={finishRound}
          >
            <Icon name="check-circle" size={24} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.mediaButtons}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={async () => {
              try {
                const media = await MediaService.capturePhoto(roundId, currentHole);
                if (media) {
                  Alert.alert('Success', 'Photo saved to album');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to capture photo');
              }
            }}
          >
            <FontAwesome5 name="camera" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={async () => {
              try {
                const media = await MediaService.captureVideo(roundId, currentHole);
                if (media) {
                  Alert.alert('Success', 'Video saved to album');
                }
              } catch (error) {
                Alert.alert('Error', 'Failed to capture video');
              }
            }}
          >
            <FontAwesome5 name="video" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>
            {stats.score > 0 ? '+' : ''}{stats.score}
          </Text>
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
                onPress={() => {
                  setCurrentHole(hole.holeNumber);
                  navigateToHoleDetails(hole.holeNumber);
                }}
              >
                <Text style={styles.holeNumber}>{hole.holeNumber}</Text>
                <View style={[
                  styles.holeStatus,
                  status === 'eagle' ? styles.holeStatusEagleCircle :
                  status === 'birdie' ? styles.holeStatusBirdieCircle : 
                  status === 'bogey' ? styles.holeStatusSquare : 
                  status === 'double' ? styles.holeStatusFilledSquare :
                  styles.holeStatusNone,
                  { backgroundColor: getStatusColor(status) }
                ]}>
                  {hole.strokes > 0 ? (
                    <Text style={[
                      styles.holeScore,
                      status === 'par' ? styles.holeScorePar :
                      status === 'eagle' ? styles.holeScoreEagle :
                      status === 'birdie' ? styles.holeScoreBirdie :
                      status === 'bogey' ? styles.holeScoreBogey :
                      status === 'double' ? styles.holeScoreDouble :
                      styles.holeScorePending
                    ]}>
                      {hole.strokes}
                    </Text>
                  ) : (
                    <FontAwesome5 name="golf-ball" size={20} color="#999" />
                  )}
                </View>
                <Text style={styles.holePar}>Par {hole.par}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      </View>
    </TouchableWithoutFeedback>
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
  setupContent: {
    width: '100%',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconButton: {
    padding: 8,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 10,
    borderRadius: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  holeStatusEagleCircle: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFD700',  // Gold border for eagle
  },
  holeStatusBirdieCircle: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF0000',  // Red border for birdie
  },
  holeStatusSquare: {
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  holeStatusFilledSquare: {
    borderRadius: 4,
    // No border needed, filled with black background
  },
  holeStatusNone: {
    // No border for par or pending
  },
  holeScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  holeScorePar: {
    color: '#000',
  },
  holeScoreEagle: {
    color: '#000',  // Black text inside gold circle
  },
  holeScoreBirdie: {
    color: '#fff',  // White text inside red circle
  },
  holeScoreBogey: {
    color: '#000',
  },
  holeScoreDouble: {
    color: '#fff',  // White text for double bogey or worse
  },
  holeScorePending: {
    color: '#999',
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
