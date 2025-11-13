/**
 * ShotTrackingScreenNew.tsx
 * 
 * Final screen migration - most complex screen.
 * Shot-by-shot tracking for a hole.
 * 
 * Demonstrates:
 * - Complex form state management
 * - Dynamic UI based on hole type (par 3/4/5)
 * - Real-time updates
 * - Form validation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useRoundStore } from '../stores/roundStore';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import {
  TEE_SHOT_OPTIONS_PAR3,
  TEE_SHOT_OPTIONS_PAR45,
  APPROACH_OPTIONS,
  CHIP_OPTIONS,
  PUTT_OPTIONS,
} from '../types';

interface RouteParams {
  hole: any;
  roundId: string;
  onSave?: (hole: any) => void;
}

type ShotType = 'teeShot' | 'approach' | 'chip' | 'greenside' | 'putt';

const ShotTrackingScreenNew: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { hole: initialHole, roundId, onSave } = (route.params as RouteParams) || {};
  
  const { updateHole } = useRoundStore();
  
  const [currentShot, setCurrentShot] = useState<ShotType>('teeShot');
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [putts, setPutts] = useState<string[]>([]);
  const [fairwayHit, setFairwayHit] = useState<boolean | undefined>(undefined);
  const [greenInRegulation, setGreenInRegulation] = useState<boolean | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  
  const isPar3 = initialHole?.par === 3;
  const isPar4 = initialHole?.par === 4;
  const isPar5 = initialHole?.par === 5;
  
  const getTeeOptions = () => {
    return isPar3 ? TEE_SHOT_OPTIONS_PAR3 : TEE_SHOT_OPTIONS_PAR45;
  };
  
  const handleShotSelect = (option: string) => {
    // Update based on current shot type
    switch (currentShot) {
      case 'teeShot':
        setTotalStrokes(totalStrokes + 1);
        
        // Determine fairway hit for par 4/5
        if (!isPar3) {
          setFairwayHit(option === 'Fairway');
        }
        
        // Determine next shot type
        if (option === 'On Green' || option === 'Green') {
          setCurrentShot('putt');
        } else {
          setCurrentShot(isPar3 ? 'putt' : 'approach');
        }
        break;
        
      case 'approach':
        setTotalStrokes(totalStrokes + 1);
        
        // Check if green in regulation
        const strokesAfterApproach = totalStrokes + 1;
        const girThreshold = initialHole.par - 2;
        setGreenInRegulation(strokesAfterApproach <= girThreshold);
        
        if (option === 'Green') {
          setCurrentShot('putt');
        } else {
          setCurrentShot('chip');
        }
        break;
        
      case 'chip':
        setTotalStrokes(totalStrokes + 1);
        
        if (option === 'On Target') {
          setCurrentShot('putt');
        }
        break;
        
      case 'putt':
        const newPutts = [...putts, option];
        setPutts(newPutts);
        setTotalStrokes(totalStrokes + 1);
        
        if (option === 'In Hole') {
          // Hole complete
          handleComplete(totalStrokes + 1, newPutts.length);
        }
        break;
    }
  };
  
  const handleComplete = async (strokes: number, puttCount: number) => {
    setSaving(true);
    
    try {
      const updatedHole = {
        holeNumber: initialHole.holeNumber,
        par: initialHole.par,
        strokes,
        fairwayHit,
        greenInRegulation,
        putts: puttCount,
      };
      
      if (roundId) {
        await updateHole(roundId, updatedHole);
      }
      
      if (onSave) {
        await onSave(updatedHole);
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save hole data');
    } finally {
      setSaving(false);
    }
  };
  
  const handleQuickScore = async (strokes: number) => {
    setSaving(true);
    
    try {
      const updatedHole = {
        holeNumber: initialHole.holeNumber,
        par: initialHole.par,
        strokes,
      };
      
      if (roundId) {
        await updateHole(roundId, updatedHole);
      }
      
      if (onSave) {
        await onSave(updatedHole);
      }
      
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save score');
    } finally {
      setSaving(false);
    }
  };
  
  const getCurrentOptions = () => {
    switch (currentShot) {
      case 'teeShot':
        return getTeeOptions();
      case 'approach':
        return APPROACH_OPTIONS;
      case 'chip':
        return CHIP_OPTIONS;
      case 'putt':
        return PUTT_OPTIONS;
      default:
        return [];
    }
  };
  
  const getShotTitle = () => {
    switch (currentShot) {
      case 'teeShot':
        return 'Tee Shot';
      case 'approach':
        return 'Approach Shot';
      case 'chip':
        return 'Chip Shot';
      case 'putt':
        return 'Putt';
      default:
        return 'Shot';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="close" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Hole {initialHole?.holeNumber}</Text>
          <Text style={styles.headerSubtitle}>Par {initialHole?.par}</Text>
        </View>
      </View>
      
      {/* Stroke Counter */}
      <View style={styles.strokeCounter}>
        <FontAwesome5 name="golf-ball" size={20} color="#4CAF50" />
        <Text style={styles.strokeText}>
          {totalStrokes + putts.length} Strokes
        </Text>
      </View>
      
      {/* Quick Score Section */}
      <View style={styles.quickScore}>
        <Text style={styles.quickScoreTitle}>Quick Score</Text>
        <View style={styles.quickScoreButtons}>
          {[2, 3, 4, 5, 6, 7, 8, 9].map((score) => (
            <TouchableOpacity
              key={score}
              style={styles.quickScoreButton}
              onPress={() => handleQuickScore(score)}
            >
              <Text style={styles.quickScoreText}>{score}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Shot Tracking Section */}
      <ScrollView style={styles.content}>
        <View style={styles.shotSection}>
          <Text style={styles.shotTitle}>{getShotTitle()}</Text>
          
          <View style={styles.shotOptions}>
            {getCurrentOptions().map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.shotOption}
                onPress={() => handleShotSelect(option)}
              >
                <Text style={styles.shotOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Current Progress */}
        {putts.length > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>Putting Progress</Text>
            {putts.map((putt, index) => (
              <View key={index} style={styles.progressItem}>
                <Text style={styles.progressNumber}>{index + 1}.</Text>
                <Text style={styles.progressText}>{putt}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  strokeCounter: {
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  strokeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quickScore: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickScoreTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  quickScoreButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickScoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  quickScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  shotSection: {
    padding: 20,
  },
  shotTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  shotOptions: {
    gap: 12,
  },
  shotOption: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shotOptionText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  progressSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  progressItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    gap: 10,
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  progressText: {
    fontSize: 14,
    color: '#333',
  },
});

export default ShotTrackingScreenNew;

