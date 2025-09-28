import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/database';
import MediaService from '../services/media';
import RoundManager from '../utils/roundManager';
import RoundDeletionManager from '../utils/RoundDeletionManager';
import { GolfRound, GolfHole, Tournament } from '../types';

const RoundTrackerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tournamentId = (route.params as any)?.tournamentId;
  const tournamentName = (route.params as any)?.tournamentName;
  const routeRoundId = (route.params as any)?.roundId as string | undefined;

  const [courseName, setCourseName] = useState('');
  const [currentHole, setCurrentHole] = useState(1);
  const [holes, setHoles] = useState<GolfHole[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [roundId, setRoundId] = useState<string>('');
  const [activeRound, setActiveRound] = useState<GolfRound | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | undefined>(tournamentId);
  const [selectedTournamentName, setSelectedTournamentName] = useState<string | undefined>(tournamentName);
  const [tournamentPickerVisible, setTournamentPickerVisible] = useState(false);
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([]);
  const [parSelectionModal, setParSelectionModal] = useState(false);
  const [selectedHoleNumber, setSelectedHoleNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Always initialize holes first
    if (holes.length === 0) {
      initializeHoles();
    }
    loadActiveRound();
    loadTournaments();
  }, [routeRoundId]);

  // Save round data when leaving the screen
  useEffect(() => {
    return () => {
      if (isStarted && (roundId || activeRound?.id) && holes.length > 0) {
        const completedHoles = holes.filter(h => h.strokes > 0);
        const partialRound: GolfRound = {
          id: roundId || activeRound!.id,
          name: activeRound?.name,  // Preserve the round name
          tournamentId: activeRound?.tournamentId || tournamentId,
          tournamentName: activeRound?.tournamentName || tournamentName,
          courseName: activeRound?.courseName || courseName,
          date: activeRound?.date || new Date(),
          holes: holes,
          totalScore: completedHoles.reduce((sum, h) => sum + h.strokes, 0),
          isFinished: false,
          createdAt: activeRound?.createdAt || new Date(),
          updatedAt: new Date(),
        };
        // Use async IIFE to properly handle the promise
        (async () => {
          try {
            await DatabaseService.saveRound(partialRound);
            console.log('✅ Round autosaved on screen unmount');
          } catch (error) {
            console.error('❌ Failed to autosave round on unmount:', error);
          }
        })();
      }
    };
  }, [isStarted, roundId, activeRound, holes, tournamentId, tournamentName, courseName]); // Reload when roundId changes

  // Listen for round deletions
  useFocusEffect(
    React.useCallback(() => {
      const cleanup = RoundDeletionManager.addListener((deletedRoundId) => {
        // If the deleted round is the current round, reset the screen
        if (deletedRoundId === roundId || deletedRoundId === activeRound?.id) {
          console.log('Current round was deleted, resetting screen');
          resetToDefaultState();
        }
      });

      return cleanup;
    }, [roundId, activeRound])
  );

  const resetToDefaultState = () => {
    setRoundId('');
    setActiveRound(null);
    setIsStarted(false);
    setCourseName('');
    setSelectedTournamentId(undefined);
    setSelectedTournamentName(undefined);
    initializeHoles();
    setCurrentHole(1);
    // Clear the active round preference
    DatabaseService.setPreference('active_round_id', '');
  };

  const loadActiveRound = async () => {
    try {
      setIsLoading(true);
      // Prefer an explicitly requested round
      const preferRoundId = routeRoundId || await DatabaseService.getPreference('active_round_id');
      console.log('Loading round with ID:', preferRoundId);
      
      if (preferRoundId) {
        const round = await DatabaseService.getRound(preferRoundId);
        console.log('Loaded round:', round);
        
        if (round) {
          setRoundId(round.id);
          setCourseName(round.courseName || 'Unknown Course');
          setIsStarted(true);
          setActiveRound(round);
          // Set tournament info from the loaded round
          setSelectedTournamentId(round.tournamentId || tournamentId);
          setSelectedTournamentName(round.tournamentName || tournamentName);
          
          console.log('Round holes data:', {
            hasHoles: !!round.holes,
            holesLength: round.holes?.length,
            firstHole: round.holes?.[0],
            holesWithStrokes: round.holes?.filter(h => h.strokes > 0).length
          });
          
          // Always ensure we have holes data
          if (round.holes && round.holes.length > 0) {
            console.log('Setting holes from loaded round');
            setHoles(round.holes);
            // Find the next unplayed hole
            const nextHole = round.holes.find(h => h.strokes === 0);
            if (nextHole) {
              setCurrentHole(nextHole.holeNumber);
            } else {
              // All holes played, go to last hole
              setCurrentHole(18);
            }
          } else {
            console.log('No holes in round, initializing new holes');
            // Initialize holes if they don't exist
            const newHoles = initializeHoles();
            setHoles(newHoles);
            // Save the initialized holes to the round
            if (round.id) {
              const updatedRound = { ...round, holes: newHoles };
              await DatabaseService.saveRound(updatedRound);
            }
          }
          
          // Set as active round if it was explicitly requested via route
          if (routeRoundId) {
            await DatabaseService.setPreference('active_round_id', round.id);
          }
        } else if (!routeRoundId) {
          // Only clear preference if not explicitly requested via route
          await DatabaseService.setPreference('active_round_id', '');
        }
      }
    } catch (error) {
      console.error('Error loading active round:', error);
    } finally {
      setIsLoading(false);
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
    return initialHoles;
  };

  const loadTournaments = async () => {
    try {
      const list = await DatabaseService.getTournaments();
      setTournamentsList(list);
    } catch (e) {
      // noop
    }
  };

  const startRound = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    
    // Ensure holes are initialized
    let holesForRound = holes;
    if (!holesForRound || holesForRound.length === 0) {
      console.log('⚠️ Holes not initialized, creating default holes');
      holesForRound = initializeHoles();
    }
    
    // Generate a unique round ID for this session
    const newRoundId = RoundManager.generateRoundId();
    setRoundId(newRoundId);
    setIsStarted(true);
    
    // Save the active round ID using RoundManager
    try {
      await RoundManager.setActiveRound(newRoundId);
      
      // Create a preliminary round in the database
      const newRound: GolfRound = {
        id: newRoundId,
        tournamentId: selectedTournamentId,
        tournamentName: selectedTournamentName,
        courseName: courseName.trim(),
        date: new Date(),
        holes: holesForRound,
        totalScore: undefined, // Not finished yet
        totalPutts: undefined,
        fairwaysHit: undefined,
        greensInRegulation: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log(`📝 Starting new round ${newRoundId} with ${holesForRound.length} holes`);
      await DatabaseService.saveRound(newRound);
      setActiveRound(newRound);
      console.log('✅ New round started successfully with ID:', newRoundId);
    } catch (error) {
      console.error('❌ Error saving active round:', error);
      Alert.alert('Error', 'Failed to start round. Please try again.');
    }
  };

  const updateHole = async (holeNumber: number, updates: Partial<GolfHole>) => {
    const newHoles = holes.map(hole =>
      hole.holeNumber === holeNumber ? { ...hole, ...updates } : hole
    );
    setHoles(newHoles);

    // Persist progress to DB (autosave)
    if (roundId || activeRound?.id) {
      const completedHoles = newHoles.filter(h => h.strokes > 0);
      const partialRound: GolfRound = {
        id: roundId || activeRound!.id,
        name: activeRound?.name,  // Preserve the round name
        tournamentId: activeRound?.tournamentId || tournamentId,
        tournamentName: activeRound?.tournamentName || tournamentName,
        courseName: activeRound?.courseName || courseName,
        date: activeRound?.date || new Date(),
        holes: newHoles,
        totalScore: completedHoles.reduce((sum, h) => sum + (h.strokes || 0), 0),
        totalPutts: completedHoles.reduce((sum, h) => sum + (h.putts || 0), 0),
        fairwaysHit: newHoles.filter(h => h.fairwayHit === true).length,
        greensInRegulation: newHoles.filter(h => h.greenInRegulation === true).length,
        createdAt: activeRound?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      try {
        console.log(`🔄 Autosaving round ${partialRound.id} with ${partialRound.holes.length} holes`);
        console.log('Holes being saved:', partialRound.holes.filter(h => h.strokes > 0).map(h => ({
          hole: h.holeNumber,
          strokes: h.strokes,
          par: h.par
        })));
        await DatabaseService.saveRound(partialRound);
        console.log('✅ Round autosaved successfully');
      } catch (err) {
        console.error('❌ Autosave round error:', err);
        // Show error to user
        Alert.alert(
          'Save Error', 
          'Failed to save round data. Please try again or restart the app if the problem persists.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const navigateToHoleDetails = (holeNumber: number, par: number) => {
    // Update the hole with the selected par
    const updatedHoles = [...holes];
    updatedHoles[holeNumber - 1].par = par;
    setHoles(updatedHoles);
    
    // Navigate to shot tracking with pre-selected shot type
    navigation.navigate('ShotTracking' as never, {
      hole: updatedHoles[holeNumber - 1],
      roundId: roundId,
      roundName: activeRound?.name,
      tournamentName: tournamentName,
      preselectedShotType: par === 3 ? 'Approach' : 'Tee Shot',
      onSave: async (updatedHole: GolfHole) => {
        await updateHole(holeNumber, updatedHole);
      },
    } as never);
  };
  
  const showParSelection = (holeNumber: number) => {
    const hole = holes[holeNumber - 1];
    // Only show par selection if the hole hasn't been played yet
    if (hole && hole.strokes === 0) {
      setSelectedHoleNumber(holeNumber);
      setParSelectionModal(true);
    } else {
      // If hole has been played, go directly to shot tracking
      navigation.navigate('ShotTracking' as never, {
        hole: hole,
        roundId: roundId,
        roundName: activeRound?.name,
        tournamentName: tournamentName,
        onSave: async (updatedHole: GolfHole) => {
          await updateHole(holeNumber, updatedHole);
        },
      } as never);
    }
  };
  
  const selectPar = (par: number) => {
    setParSelectionModal(false);
    navigateToHoleDetails(selectedHoleNumber, par);
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

  const saveAndNavigateToTournament = async () => {
    try {
      // Save the current round data
      const currentRoundId = roundId || activeRound?.id;
      if (!currentRoundId) {
        Alert.alert('Error', 'No active round to save');
        return;
      }

      const calculatedStats = calculateScore();
      const currentRound: GolfRound = {
        id: currentRoundId,
        name: activeRound?.name,
        courseName: courseName || activeRound?.courseName || 'Unknown Course',
        date: activeRound?.date || new Date(),
        holes: holes,
        totalScore: calculatedStats.totalStrokes,
        totalPutts: holes.reduce((sum, h) => sum + (h.putts || 0), 0),
        fairwaysHit: holes.filter(h => h.fairwayHit === true).length,
        greensInRegulation: holes.filter(h => h.greenInRegulation === true).length,
        isFinished: false,
        tournamentId: selectedTournamentId || activeRound?.tournamentId || tournamentId,
        tournamentName: selectedTournamentName || activeRound?.tournamentName || tournamentName,
        createdAt: activeRound?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Save the round
      await DatabaseService.saveRound(currentRound);
      
      // Navigate to the tournament rounds screen if this round belongs to a tournament
      if (currentRound.tournamentId) {
        // Get the tournament details
        const tournaments = await DatabaseService.getTournaments();
        const tournament = tournaments.find(t => t.id === currentRound.tournamentId);
        
        if (tournament) {
          // Navigate to the Tournament tab and then to the rounds screen
          navigation.getParent()?.navigate('Tournaments' as never, {
            screen: 'TournamentRounds',
            params: {
              tournament: tournament
            }
          } as never);
        } else {
          // If no tournament found, just go to tournaments list
          navigation.getParent()?.navigate('Tournaments' as never);
        }
      } else {
        // If no tournament, just go to tournaments tab
        navigation.getParent()?.navigate('Tournaments' as never);
      }
    } catch (error) {
      console.error('Error saving round:', error);
      Alert.alert('Error', 'Failed to save round');
    }
  };

  const viewSummary = async () => {
    const stats = calculateScore();
    
    if (stats.completedHoles === 0) {
      Alert.alert('No Scores', 'Please record scores for at least one hole before viewing summary');
      return;
    }

    try {
      // Ensure we have a valid round ID
      const currentRoundId = roundId || activeRound?.id;
      if (!currentRoundId) {
        Alert.alert('Error', 'No active round found');
        return;
      }

      // Save the current round data to database before navigating to summary
      const currentRound: GolfRound = {
        id: currentRoundId,
        name: activeRound?.name,  // Preserve the round name
        courseName: courseName || activeRound?.courseName || 'Unknown Course',
        date: activeRound?.date || new Date(),
        holes: holes,  // Keep all holes for view summary (including unplayed ones)
        totalScore: stats.totalStrokes,
        totalPutts: holes.reduce((sum, h) => sum + (h.putts || 0), 0),
        fairwaysHit: holes.filter(h => h.fairwayHit === true).length,
        greensInRegulation: holes.filter(h => h.greenInRegulation === true).length,
        isFinished: false,
        tournamentId: selectedTournamentId || activeRound?.tournamentId || tournamentId,
        tournamentName: selectedTournamentName || activeRound?.tournamentName || tournamentName,
        createdAt: activeRound?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Save the round to ensure database has latest data
      console.log('Saving round for summary view:', {
        id: currentRound.id,
        courseName: currentRound.courseName,
        holesWithStrokes: currentRound.holes.filter(h => h.strokes > 0).length,
        totalStrokes: currentRound.totalScore,
      });
      await DatabaseService.saveRound(currentRound);

      // Navigate to summary screen with the round ID
      console.log('Navigating to summary with roundId:', currentRoundId);
      navigation.navigate('RoundSummary' as never, {
        roundId: currentRoundId,
      } as never);
    } catch (error) {
      console.error('Error saving round for summary:', error);
      Alert.alert('Error', 'Failed to save round data. Please try again.');
    }
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
                name: activeRound?.name,  // Preserve the round name
                tournamentId: selectedTournamentId,
                tournamentName: selectedTournamentName,
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
              // Delete the round if we have an id
              if (roundId) {
                await DatabaseService.deleteRound(roundId);
              }
              // Reset the screen to default state (no round selected)
              resetToDefaultState();
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

  // Show loading indicator while loading
  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading round...</Text>
      </View>
    );
  }

  // Show message when no round is selected (after deletion or initial load)
  if (!isStarted && !routeRoundId && !tournamentId) {
    return (
      <View style={styles.container}>
        <View style={styles.noRoundContainer}>
          <FontAwesome5 name="golf-ball" size={80} color="#ddd" />
          <Text style={styles.noRoundTitle}>No Active Round</Text>
          <Text style={styles.noRoundText}>
            Create or select a round from the{'\n'}Tournaments tab to start tracking
          </Text>
        </View>
      </View>
    );
  }

  // Only show setup screen if not started AND no round is being loaded but tournament is selected
  if (!isStarted && !routeRoundId && tournamentId) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.setupContainer}>
            <View style={styles.setupContent}>
              <Text style={styles.setupTitle}>New Round Setup</Text>
              
              <TouchableOpacity
                style={styles.tournamentSelect}
                onPress={() => setTournamentPickerVisible(true)}
              >
                <Icon name="emoji-events" size={20} color="#4CAF50" />
                <Text style={styles.tournamentText}>
                  {selectedTournamentName ? selectedTournamentName : 'Select Tournament (optional)'}
                </Text>
              </TouchableOpacity>

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

          {/* Tournament Picker Modal */}
          <Modal
            animationType="slide"
            transparent
            visible={tournamentPickerVisible}
            onRequestClose={() => setTournamentPickerVisible(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Tournament</Text>
                      <TouchableOpacity onPress={() => setTournamentPickerVisible(false)}>
                        <Icon name="close" size={24} color="#666" />
                      </TouchableOpacity>
                    </View>
                    <ScrollView contentContainerStyle={styles.modalForm}>
                      {tournamentsList.length === 0 ? (
                        <Text style={{ color: '#666' }}>No tournaments. Create one in Tournaments tab.</Text>
                      ) : (
                        tournamentsList.map(t => (
                          <TouchableOpacity
                            key={t.id}
                            style={styles.tournamentItem}
                            onPress={() => {
                              setSelectedTournamentId(t.id);
                              setSelectedTournamentName(t.name);
                              setTournamentPickerVisible(false);
                            }}
                          >
                            <Icon name="emoji-events" size={18} color="#4CAF50" />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: '600', color: '#333' }}>{t.name}</Text>
                              <Text style={{ color: '#666', fontSize: 12 }}>{t.courseName}</Text>
                            </View>
                          </TouchableOpacity>
                        ))
                      )}
                      {selectedTournamentId && (
                        <TouchableOpacity
                          style={[styles.cancelButton, { marginTop: 10 }]}
                          onPress={() => {
                            setSelectedTournamentId(undefined);
                            setSelectedTournamentName(undefined);
                            setTournamentPickerVisible(false);
                          }}
                        >
                          <Text style={styles.cancelButtonText}>Clear Selection</Text>
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }

  const stats = calculateScore();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      {/* Combined Header with Score and Actions */}
      <View style={styles.customHeader}>
        <View style={styles.headerLeft}>
          {/* Empty space where save button used to be */}
        </View>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{courseName || 'Golf Course'}</Text>
          {activeRound?.name && (
            <Text style={styles.roundName}>{activeRound.name}</Text>
          )}
          {tournamentName && (
            <Text style={styles.headerSubtitle}>{tournamentName}</Text>
          )}
          <Text style={styles.headerScore}>
            Score: {stats.totalStrokes || 0} ({stats.score > 0 ? '+' : ''}{stats.score})
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={deleteRound}
          >
            <Icon name="delete" size={20} color="#ff6b6b" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={viewSummary}
          >
            <Icon name="bar-chart" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Hole Grid */}
      <ScrollView style={styles.holesContainer}>
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
                  showParSelection(hole.holeNumber);
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
      
      {/* Par Selection Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={parSelectionModal}
        onRequestClose={() => setParSelectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.parModalContent}>
            <Text style={styles.parModalTitle}>Select Par for Hole {selectedHoleNumber}</Text>
            
            <View style={styles.parButtonsContainer}>
              <TouchableOpacity
                style={styles.parButton}
                onPress={() => selectPar(3)}
              >
                <Text style={styles.parButtonNumber}>3</Text>
                <Text style={styles.parButtonLabel}>Par 3</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.parButton}
                onPress={() => selectPar(4)}
              >
                <Text style={styles.parButtonNumber}>4</Text>
                <Text style={styles.parButtonLabel}>Par 4</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.parButton}
                onPress={() => selectPar(5)}
              >
                <Text style={styles.parButtonNumber}>5</Text>
                <Text style={styles.parButtonLabel}>Par 5</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity
              style={styles.parCancelButton}
              onPress={() => setParSelectionModal(false)}
            >
              <Text style={styles.parCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Floating Action Button for Save */}
      <TouchableOpacity
        style={styles.fab}
        onPress={async () => {
          await saveAndNavigateToTournament();
        }}
        activeOpacity={0.8}
      >
        <Icon name="save" size={28} color="#fff" />
      </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  customHeader: {
    backgroundColor: '#4CAF50',
    paddingTop: 45,
    paddingBottom: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 40,  // Same width as the headerActions to keep center balanced
  },
  headerBackButton: {
    padding: 5,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  roundName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  headerScore: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  setupContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  setupContent: {
    width: '100%',
  },
  tournamentSelect: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
  tournamentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerIconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  parModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  parModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  parButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  parButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  parButtonNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  parButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  parButtonHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  parCancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  parCancelText: {
    fontSize: 16,
    color: '#666',
  },
  noRoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noRoundTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 30,
    marginBottom: 15,
  },
  noRoundText: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 26,
  },
  goToTournamentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 10,
  },
  goToTournamentsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#4CAF50',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});

export default RoundTrackerScreen;
