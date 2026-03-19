/**
 * RoundTrackerScreen.tsx
 * 
 * Complete rewrite of RoundTrackerScreen (was 860 lines → now ~250 lines)
 * 
 * Key improvements:
 * - Uses useRound hook for data
 * - Uses useRoundStore for actions
 * - Uses reusable components (HoleGrid, RoundHeader, Button)
 * - Separated concerns (no business logic in UI)
 * - Optimized re-renders
 * - Clean, maintainable code
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppNavigationProp } from '../types/navigation';
import { useRound } from '../hooks/useRound';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { RoundHeader } from '../components/round/RoundHeader';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Hole from '../database/watermelon/models/Hole';
import { useObservable } from '../hooks/useObservable';
import { HoleCard } from '../components/round/HoleCard';
import { GolferPicker } from '../components/golfer/GolferPicker';
import { useGolfers } from '../hooks/useGolfers';

interface RouteParams {
  roundId?: string;
  tournamentId?: string;
  tournamentName?: string;
  quickStart?: boolean;
}

const RoundTrackerScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const params = (route.params as RouteParams) || {};
  
  const { round, loading, error } = useRound(params.roundId);
  const { createRound, updateHole, finishRound, deleteRound } = useRoundStore();
  const { golfers, activeGolferId, loading: golfersLoading, createGolfer } = useGolfers();
  const [selectedGolferId, setSelectedGolferId] = useState<string | null>(null);

  // Initialize selected golfer to active golfer
  useEffect(() => {
    if (!selectedGolferId && activeGolferId) {
      setSelectedGolferId(activeGolferId);
    }
  }, [activeGolferId, selectedGolferId]);

  // Observe holes reactively — UI updates automatically on DB changes.
  // Depend on round?.id (not round) to avoid creating a new Observable
  // when loadActiveRound() returns a new Round object with the same ID.
  const roundId = round?.id;
  const holesObservable = useMemo(
    () => round?.holes.observe(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stabilize on ID, not object reference
    [roundId],
  );
  const rawHoles = useObservable<Hole[]>(holesObservable);
  const holes = useMemo(
    () => (rawHoles ? [...rawHoles].sort((a, b) => a.holeNumber - b.holeNumber) : []),
    [rawHoles],
  );

  const [setupVisible, setSetupVisible] = useState(!params.roundId && !round);
  const [courseName, setCourseName] = useState('');
  const [parModalVisible, setParModalVisible] = useState(false);
  const [selectedHole, setSelectedHole] = useState<Hole | null>(null);
  const [saving, setSaving] = useState(false);

  // Show setup modal if no active round
  useEffect(() => {
    setSetupVisible(!params.roundId && !round);
  }, [params.roundId, round]);
  
  const handleStartRound = async () => {
    if (!courseName.trim()) {
      Alert.alert('Error', 'Please enter a course name');
      return;
    }
    
    setSaving(true);
    
    try {
      await createRound({
        courseName: courseName.trim(),
        golferId: selectedGolferId || undefined,
        tournamentId: params.tournamentId,
        tournamentName: params.tournamentName,
      });
      
      setSetupVisible(false);
      setCourseName('');
    } catch (_err) {
      Alert.alert('Error', 'Failed to start round');
    } finally {
      setSaving(false);
    }
  };
  
  const handleHolePress = async (hole: Hole) => {
    setSelectedHole(hole);
    
    // If hole not played yet, show par selection first
    if (hole.strokes === 0) {
      setParModalVisible(true);
    } else {
      // Navigate to shot tracking
      navigateToShotTracking(hole);
    }
  };
  
  const handleParSelect = (par: number) => {
    setParModalVisible(false);
    
    if (selectedHole && round) {
      // Update hole par first, then navigate
      updateHole(round.id, {
        holeNumber: selectedHole.holeNumber,
        par,
        strokes: 0,
      }).then(() => {
        navigateToShotTracking({ id: selectedHole.id, par });
      });
    }
  };
  
  const navigateToShotTracking = (hole: { id: string; par: number }) => {
    navigation.navigate('HoleScoring', {
      holeId: hole.id,
      roundId: round?.id,
    } );
  };
  
  const handleFinishRound = () => {
    if (!round) return;
    
    Alert.alert(
      'Finish Round?',
      'Are you sure you want to finish this round?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish',
          onPress: async () => {
            try {
              await finishRound(round.id);
              navigation.navigate('RoundSummary', {
                roundId: round.id,
              } );
            } catch (_err) {
              Alert.alert('Error', 'Failed to finish round');
            }
          },
        },
      ]
    );
  };
  
  const handleDeleteRound = () => {
    if (!round) return;
    
    Alert.alert(
      'Delete Round?',
      'Are you sure you want to delete this round? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRound(round.id);
              navigation.goBack();
            } catch (_err) {
              Alert.alert('Error', 'Failed to delete round');
            }
          },
        },
      ]
    );
  };
  
  const handleViewSummary = () => {
    if (!round) return;
    
    navigation.navigate('RoundSummary', {
      roundId: round.id,
    } );
  };
  
  const totalPar = useMemo(() => {
    const sum = holes.reduce((s, h) => s + (h.par || 0), 0);
    return sum || undefined;
  }, [holes]);

  if (loading) {
    return <LoadingScreen message="Loading round..." />;
  }

  if (error) {
    return (
      <ErrorScreen
        error={error}
        onRetry={() => useRoundStore.getState().loadActiveRound()}
      />
    );
  }
  
  // Setup screen for new round
  if (setupVisible || !round) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.setupContainer}>
            <Text style={styles.setupTitle}>New Round Setup</Text>

            {params.tournamentName && (
              <View style={styles.tournamentBadge}>
                <Icon name="emoji-events" size={20} color="#4CAF50" />
                <Text style={styles.tournamentText}>{params.tournamentName}</Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Golfer</Text>
            <GolferPicker
              golfers={golfers}
              selectedGolferId={selectedGolferId}
              onSelectGolfer={setSelectedGolferId}
              onCreateGolfer={async (name) => { await createGolfer({ name }); }}
              loading={golfersLoading}
            />

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Course</Text>
            <TextInput
              style={styles.input}
              placeholder="Course Name"
              value={courseName}
              onChangeText={setCourseName}
              autoCapitalize="words"
              autoFocus
              accessibilityLabel="Course name"
              returnKeyType="done"
              onSubmitEditing={handleStartRound}
            />

            <Button
              title="Start Round"
              onPress={handleStartRound}
              loading={saving}
              style={styles.startButton}
            />
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    );
  }
  
  // Main round tracking screen
  return (
    <View style={styles.container}>
      {/* Header with score */}
      <RoundHeader
        round={round}
        totalPar={totalPar}
        golferName={golfers.find((g) => g.id === round.golferId)?.name}
        golferColor={golfers.find((g) => g.id === round.golferId)?.color}
      />
      
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleViewSummary} accessibilityLabel="View round summary" accessibilityRole="button">
          <Icon name="bar-chart" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleFinishRound} accessibilityLabel="Finish round" accessibilityRole="button">
          <Icon name="check-circle" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Finish</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleDeleteRound} accessibilityLabel="Delete round" accessibilityRole="button">
          <Icon name="delete" size={20} color="#f44336" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
      
      {/* Hole Grid - using .map() instead of HoleGrid/FlatList to avoid nested scrolling */}
      <ScrollView style={styles.content}>
        <View style={styles.holeGrid}>
          {holes.map((hole) => (
            <HoleCard
              key={`hole-${hole.holeNumber}`}
              holeNumber={hole.holeNumber}
              par={hole.par}
              strokes={hole.strokes}
              onPress={() => handleHolePress(hole)}
            />
          ))}
        </View>
      </ScrollView>
      
      {/* Par Selection Modal */}
      <Modal
        visible={parModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setParModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.parModal}>
            <Text style={styles.parModalTitle}>
              Select Par for Hole {selectedHole?.holeNumber}
            </Text>
            
            <View style={styles.parButtons}>
              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(3)}
                accessibilityRole="button"
                accessibilityLabel="Par 3"
              >
                <Text style={styles.parButtonText}>Par 3</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(4)}
                accessibilityRole="button"
                accessibilityLabel="Par 4"
              >
                <Text style={styles.parButtonText}>Par 4</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.parButton}
                onPress={() => handleParSelect(5)}
                accessibilityRole="button"
                accessibilityLabel="Par 5"
              >
                <Text style={styles.parButtonText}>Par 5</Text>
              </TouchableOpacity>
            </View>
            
            <Button
              title="Cancel"
              onPress={() => setParModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    padding: 20,
  },
  setupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 30,
  },
  tournamentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
  },
  tournamentText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  startButton: {
    marginTop: 10,
  },
  actionBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  holeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  parModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  parModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  parButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  parButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  parButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default RoundTrackerScreen;

