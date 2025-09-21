import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import MediaService from '../services/media';
import {
  GolfHole,
  HoleShotData,
  TEE_SHOT_OPTIONS_PAR3,
  TEE_SHOT_OPTIONS_PAR45,
  APPROACH_OPTIONS,
  CHIP_OPTIONS,
  BUNKER_OPTIONS,
  TROUBLE_SHOT_OPTIONS,
  PUTT_OPTIONS,
} from '../types';

interface ShotRow {
  id: string;
  selections: string[];
}

const ShotTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { hole, onSave, roundId } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => void; roundId?: string };

  const [par, setPar] = useState<3 | 4 | 5>(hole.par as 3 | 4 | 5 || 4);
  const [teeShot, setTeeShot] = useState<string>('');
  const [approachShots, setApproachShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [chipShots, setChipShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [greensideBunkerShots, setGreensideBunkerShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [fairwayBunkerShots, setFairwayBunkerShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [troubleShots, setTroubleShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [puttShots, setPuttShots] = useState<ShotRow[]>([{ id: '1', selections: [] }]);
  const [totalStrokes, setTotalStrokes] = useState(0);

  useEffect(() => {
    // Calculate total strokes
    let strokes = 0;
    
    // Tee shot counts as 1 if selected
    if (teeShot) strokes++;
    
    // Count approach shots (each row with selections counts as 1)
    approachShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    // Count chip shots
    chipShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    // Count greenside bunker shots
    greensideBunkerShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    // Count fairway bunker shots
    fairwayBunkerShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    // Count trouble shots
    troubleShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    // Count putts (each row with selections counts as 1)
    puttShots.forEach(shot => {
      if (shot.selections.length > 0) strokes++;
    });
    
    setTotalStrokes(strokes);
  }, [teeShot, approachShots, chipShots, greensideBunkerShots, fairwayBunkerShots, troubleShots, puttShots]);

  const handleSave = () => {
    // Convert the new data structure to the old format for compatibility
    const shotData: HoleShotData = {
      par,
      teeShot,
      approach: approachShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      chip: chipShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      greensideBunker: greensideBunkerShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      fairwayBunker: fairwayBunkerShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      troubleShot: troubleShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      putts: puttShots.filter(s => s.selections.length > 0).map(s => s.selections).flat(),
    };

    const updatedHole: GolfHole = {
      ...hole,
      par,
      strokes: totalStrokes,
      shotData,
      putts: puttShots.filter(s => s.selections.length > 0).length,
      fairwayHit: par > 3 ? teeShot === 'Fairway' : undefined,
      greenInRegulation: calculateGIR(),
    };

    onSave(updatedHole);
    navigation.goBack();
  };

  const handleSaveAndSummary = () => {
    const shotData: HoleShotData = {
      par,
      teeShot,
      approach: approachShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      chip: chipShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      greensideBunker: greensideBunkerShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      fairwayBunker: fairwayBunkerShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      troubleShot: troubleShots.filter(s => s.selections.length > 0).map(s => s.selections.join(' + ')).join(', '),
      putts: puttShots.filter(s => s.selections.length > 0).map(s => s.selections).flat(),
    };

    const updatedHole: GolfHole = {
      ...hole,
      par,
      strokes: totalStrokes,
      shotData,
      putts: puttShots.filter(s => s.selections.length > 0).length,
      fairwayHit: par > 3 ? teeShot === 'Fairway' : undefined,
      greenInRegulation: calculateGIR(),
    };

    onSave(updatedHole);
    
    navigation.navigate('HoleSummary' as never, {
      hole: updatedHole,
      roundId: roundId,
      onNext: () => {
        navigation.goBack();
      },
    } as never);
  };

  const calculateGIR = () => {
    if (par === 3) {
      return teeShot === 'On Green';
    } else if (par === 4) {
      return (teeShot && approachShots[0]?.selections.includes('Green') && chipShots[0]?.selections.length === 0);
    } else if (par === 5) {
      const hasGreenInApproach = approachShots.some(s => s.selections.includes('Green'));
      return hasGreenInApproach && chipShots[0]?.selections.length === 0;
    }
    return false;
  };

  const handleShotSelection = (
    shotType: 'approach' | 'chip' | 'greensideBunker' | 'fairwayBunker' | 'trouble',
    rowId: string,
    option: string
  ) => {
    let shots: ShotRow[];
    let setShots: React.Dispatch<React.SetStateAction<ShotRow[]>>;
    
    switch(shotType) {
      case 'approach':
        shots = approachShots;
        setShots = setApproachShots;
        break;
      case 'chip':
        shots = chipShots;
        setShots = setChipShots;
        break;
      case 'greensideBunker':
        shots = greensideBunkerShots;
        setShots = setGreensideBunkerShots;
        break;
      case 'fairwayBunker':
        shots = fairwayBunkerShots;
        setShots = setFairwayBunkerShots;
        break;
      case 'trouble':
        shots = troubleShots;
        setShots = setTroubleShots;
        break;
    }
    
    const newShots = [...shots];
    const rowIndex = newShots.findIndex(s => s.id === rowId);
    
    if (rowIndex !== -1) {
      const row = newShots[rowIndex];
      const selectionIndex = row.selections.indexOf(option);
      
      if (selectionIndex !== -1) {
        // Remove selection if already selected
        row.selections.splice(selectionIndex, 1);
      } else {
        // Add selection (max 2)
        if (row.selections.length < 2) {
          row.selections.push(option);
        } else {
          // Replace the oldest selection
          row.selections = [row.selections[1], option];
        }
      }
      
      // If this row has selections and is the last row, add a new empty row
      if (row.selections.length > 0 && rowIndex === newShots.length - 1) {
        newShots.push({ id: Date.now().toString(), selections: [] });
      }
      
      // Remove empty rows except the last one
      const filtered = newShots.filter((s, i) => s.selections.length > 0 || i === newShots.length - 1);
      setShots(filtered.length === 0 ? [{ id: Date.now().toString(), selections: [] }] : filtered);
    }
  };

  const removeShot = (
    shotType: 'approach' | 'chip' | 'greensideBunker' | 'fairwayBunker' | 'trouble',
    rowId: string
  ) => {
    let shots: ShotRow[];
    let setShots: React.Dispatch<React.SetStateAction<ShotRow[]>>;
    
    switch(shotType) {
      case 'approach':
        shots = approachShots;
        setShots = setApproachShots;
        break;
      case 'chip':
        shots = chipShots;
        setShots = setChipShots;
        break;
      case 'greensideBunker':
        shots = greensideBunkerShots;
        setShots = setGreensideBunkerShots;
        break;
      case 'fairwayBunker':
        shots = fairwayBunkerShots;
        setShots = setFairwayBunkerShots;
        break;
      case 'trouble':
        shots = troubleShots;
        setShots = setTroubleShots;
        break;
    }
    
    const filtered = shots.filter(s => s.id !== rowId);
    setShots(filtered.length === 0 ? [{ id: Date.now().toString(), selections: [] }] : filtered);
  };

  // Putts now use the dynamic row system like other shot types

  const getScoreDisplay = () => {
    if (totalStrokes === 0) return '';
    const diff = totalStrokes - par;
    if (diff === 0) return 'Par';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double';
    if (diff === 3) return 'Triple';
    if (diff > 3) return `+${diff}`;
    return `${diff}`;
  };

  const getIconForOption = (category: string, option: string) => {
    if (category === 'tee') {
      switch(option) {
        case 'Left': return '←';
        case 'Right': return '→';
        case 'Fairway': return '⬆';
        case 'Short': return '⬇';
        case 'Long': return '⬆';
        case 'On Green': return '🎯';
        case 'Bunker': return '⛳';
        case 'Hazard': return '💧';
        default: return '•';
      }
    }
    if (category === 'approach' || category === 'chip' || category === 'bunker' || category === 'trouble') {
      switch(option) {
        case 'Left': return '←';
        case 'Right': return '→';
        case 'Green': return '🎯';
        case 'Long': return '⬆';
        case 'Short': return '⬇';
        case 'On Target': return '🎯';
        default: return '•';
      }
    }
    if (category === 'putt') {
      switch(option) {
        case 'Long': return '⬆';
        case 'Short': return '⬇';
        case 'High': return '↗';
        case 'Low': return '↘';
        case 'On Target': return '🎯';
        case 'In Hole': return '🕳';
        default: return '•';
      }
    }
    return '•';
  };

  const renderShotRow = (
    shotType: 'approach' | 'chip' | 'greensideBunker' | 'fairwayBunker' | 'trouble',
    options: string[],
    shots: ShotRow[],
    categoryName: string
  ) => {
    return shots.map((row, index) => (
      <View key={row.id}>
        <View style={styles.shotRowContainer}>
          <View style={styles.optionsRow}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  row.selections.includes(option) && styles.optionButtonActive
                ]}
                onPress={() => handleShotSelection(shotType, row.id, option)}
              >
                <Text style={[
                  styles.optionIcon,
                  row.selections.includes(option) && styles.optionIconActive
                ]}>
                  {getIconForOption(categoryName, option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {row.selections.length > 0 && index < shots.length - 1 && (
            <TouchableOpacity 
              onPress={() => removeShot(shotType, row.id)}
              style={styles.removeButton}
            >
              <Ionicons name="close-circle" size={20} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
        {row.selections.length > 0 && (
          <Text style={styles.selectionSummary}>
            Shot {index + 1}: {row.selections.join(' + ')}
          </Text>
        )}
      </View>
    ));
  };

  const teeOptions = par === 3 ? TEE_SHOT_OPTIONS_PAR3 : TEE_SHOT_OPTIONS_PAR45;

  return (
    <View style={styles.container}>
      {/* Header with Par Selection */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.holeNumber}>Hole {hole.holeNumber}</Text>
          
          <View style={styles.parSelector}>
            <Text style={styles.parLabel}>Par:</Text>
            {[3, 4, 5].map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.parButton, par === p && styles.parButtonActive]}
                onPress={() => setPar(p as 3 | 4 | 5)}
              >
                <Text style={[styles.parButtonText, par === p && styles.parButtonTextActive]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={async () => {
                if (!roundId) return;
                try {
                  const media = await MediaService.capturePhoto(roundId, hole.holeNumber);
                  if (media) {
                    Alert.alert('Success', 'Photo saved to album');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to capture photo');
                }
              }}
            >
              <FontAwesome5 name="camera" size={18} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={async () => {
                if (!roundId) return;
                try {
                  const media = await MediaService.captureVideo(roundId, hole.holeNumber);
                  if (media) {
                    Alert.alert('Success', 'Video saved to album');
                  }
                } catch (error) {
                  Alert.alert('Error', 'Failed to capture video');
                }
              }}
            >
              <FontAwesome5 name="video" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.strokeCounter}>
          <Text style={styles.strokesLabel}>Strokes</Text>
          <Text style={styles.strokesValue}>{totalStrokes || '-'}</Text>
          {totalStrokes > 0 && (
            <Text style={styles.scoreText}>{getScoreDisplay()}</Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tee Shot Section - Single selection only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tee Shot</Text>
          <View style={styles.optionsRow}>
            {teeOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, teeShot === option && styles.optionButtonActive]}
                onPress={() => setTeeShot(teeShot === option ? '' : option)}
              >
                <Text style={[styles.optionIcon, teeShot === option && styles.optionIconActive]}>
                  {getIconForOption('tee', option)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Approach Section - Multiple selections */}
        {par > 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approach</Text>
            {renderShotRow('approach', APPROACH_OPTIONS, approachShots, 'approach')}
          </View>
        )}

        {/* Chip Section - Multiple selections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chip</Text>
          {renderShotRow('chip', CHIP_OPTIONS, chipShots, 'chip')}
        </View>

        {/* Greenside Bunker Section - Multiple selections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Greenside Bunker</Text>
          {renderShotRow('greensideBunker', BUNKER_OPTIONS, greensideBunkerShots, 'bunker')}
        </View>

        {/* Fairway Bunker Section - Multiple selections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fairway Bunker</Text>
          {renderShotRow('fairwayBunker', BUNKER_OPTIONS, fairwayBunkerShots, 'bunker')}
        </View>

        {/* Trouble Shot Section - Multiple selections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trouble Shot</Text>
          {renderShotRow('trouble', TROUBLE_SHOT_OPTIONS, troubleShots, 'trouble')}
        </View>

        {/* Putts Section - Multiple selections, dynamic rows */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Putts</Text>
          {puttShots.map((row, index) => (
            <View key={row.id}>
              <View style={styles.shotRowContainer}>
                <View style={styles.optionsRow}>
                  {PUTT_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.optionButton,
                        row.selections.includes(option) && styles.optionButtonActive
                      ]}
                      onPress={() => {
                        const newSelections = row.selections.includes(option)
                          ? row.selections.filter(s => s !== option)
                          : row.selections.length < 2 
                            ? [...row.selections, option]
                            : row.selections;
                        
                        const newPuttShots = [...puttShots];
                        newPuttShots[index] = { ...row, selections: newSelections };
                        
                        // Add new row if this row has selections and is the last row
                        if (newSelections.length > 0 && index === puttShots.length - 1) {
                          newPuttShots.push({ id: Date.now().toString(), selections: [] });
                        }
                        
                        // Remove empty rows except the last one
                        const filtered = newPuttShots.filter((shot, idx) => 
                          shot.selections.length > 0 || idx === newPuttShots.length - 1
                        );
                        
                        setPuttShots(filtered.length === 0 ? [{ id: Date.now().toString(), selections: [] }] : filtered);
                      }}
                    >
                      <Text style={[
                        styles.optionIcon,
                        row.selections.includes(option) && styles.optionIconActive
                      ]}>
                        {getIconForOption('putt', option)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {row.selections.length > 0 && index < puttShots.length - 1 && (
                  <TouchableOpacity 
                    onPress={() => {
                      const newPuttShots = puttShots.filter(s => s.id !== row.id);
                      setPuttShots(newPuttShots.length === 0 ? [{ id: Date.now().toString(), selections: [] }] : newPuttShots);
                    }}
                    style={styles.removeButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#f44336" />
                  </TouchableOpacity>
                )}
              </View>
              {row.selections.length > 0 && (
                <Text style={styles.selectionSummary}>
                  Putt {index + 1}: {row.selections.join(' + ')}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
          >
            <Icon name="check" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.saveButton, styles.summaryButton]} 
            onPress={handleSaveAndSummary}
            disabled={totalStrokes === 0}
          >
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  mediaButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    padding: 8,
    borderRadius: 20,
  },
  holeNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  parSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  parLabel: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    fontWeight: '600',
  },
  parButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  parButtonActive: {
    backgroundColor: '#fff',
  },
  parButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  parButtonTextActive: {
    color: '#4CAF50',
  },
  strokeCounter: {
    alignItems: 'center',
  },
  strokesLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  strokesValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  shotRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'space-between',
  },
  optionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    minWidth: 45,
    height: 45,
    marginBottom: 5,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    flex: 1,
    marginHorizontal: 2,
  },
  optionButtonActive: {
    backgroundColor: '#4CAF50',
  },
  optionButtonDisabled: {
    opacity: 0.4,
  },
  optionIcon: {
    fontSize: 24,
  },
  optionIconActive: {
    color: '#fff',
  },
  optionIconDisabled: {
    color: '#999',
  },
  optionLabel: {
    fontSize: 10,
    color: '#666',
  },
  optionLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  optionLabelDisabled: {
    color: '#999',
  },
  removeButton: {
    padding: 5,
    marginLeft: 5,
  },
  selectionSummary: {
    fontSize: 12,
    color: '#4CAF50',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 4,
  },
  puttCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  puttCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 10,
  },
  undoButton: {
    padding: 5,
  },
  puttHistory: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  puttHistoryItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 5,
  },
  summaryButton: {
    backgroundColor: '#2196F3',
  },
});

export default ShotTrackingScreen;