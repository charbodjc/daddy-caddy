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
import { useNavigation, useRoute } from '@react-navigation/native';
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

const ShotTrackingScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { hole, onSave } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => void };

  const [par, setPar] = useState<3 | 4 | 5>(hole.par as 3 | 4 | 5 || 4);
  const [teeShot, setTeeShot] = useState<string>('');
  const [approach, setApproach] = useState<string>('');
  const [chip, setChip] = useState<string>('');
  const [greensideBunker, setGreensideBunker] = useState<string>('');
  const [fairwayBunker, setFairwayBunker] = useState<string>('');
  const [troubleShot, setTroubleShot] = useState<string>('');
  const [putts, setPutts] = useState<string[]>([]);
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('par');

  useEffect(() => {
    // Load existing shot data if available
    if (hole.shotData) {
      setPar(hole.shotData.par);
      setTeeShot(hole.shotData.teeShot || '');
      setApproach(hole.shotData.approach || '');
      setChip(hole.shotData.chip || '');
      setGreensideBunker(hole.shotData.greensideBunker || '');
      setFairwayBunker(hole.shotData.fairwayBunker || '');
      setTroubleShot(hole.shotData.troubleShot || '');
      setPutts(hole.shotData.putts || []);
    }
  }, [hole]);

  useEffect(() => {
    // Calculate total strokes
    let strokes = 0;
    if (teeShot) strokes++;
    if (approach) strokes++;
    if (chip) strokes++;
    if (greensideBunker) strokes++;
    if (fairwayBunker) strokes++;
    if (troubleShot) strokes++;
    strokes += putts.length;
    setTotalStrokes(strokes);
  }, [teeShot, approach, chip, greensideBunker, fairwayBunker, troubleShot, putts]);

  const handleSave = () => {
    const shotData: HoleShotData = {
      par,
      teeShot,
      approach,
      chip,
      greensideBunker,
      fairwayBunker,
      troubleShot,
      putts,
    };

    const updatedHole: GolfHole = {
      ...hole,
      par,
      strokes: totalStrokes,
      shotData,
      putts: putts.length,
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
      approach,
      chip,
      greensideBunker,
      fairwayBunker,
      troubleShot,
      putts,
    };

    const updatedHole: GolfHole = {
      ...hole,
      par,
      strokes: totalStrokes,
      shotData,
      putts: putts.length,
      fairwayHit: par > 3 ? teeShot === 'Fairway' : undefined,
      greenInRegulation: calculateGIR(),
    };

    onSave(updatedHole);
    
    // Navigate to hole summary screen
    navigation.navigate('HoleSummary' as never, {
      hole: updatedHole,
      roundId: (route.params as any)?.roundId,
      onNext: () => {
        navigation.goBack();
        // Logic to move to next hole would go here
      },
    } as never);
  };

  const calculateGIR = () => {
    // Green in Regulation logic
    if (par === 3) {
      return teeShot === 'On Green';
    } else if (par === 4) {
      return (teeShot && approach === 'Green' && !chip && !greensideBunker);
    } else if (par === 5) {
      // For par 5, GIR means on green in 3 shots or less
      const shotsToGreen = [teeShot, approach].filter(s => s).length;
      return approach === 'Green' && shotsToGreen <= 2;
    }
    return false;
  };

  const addPutt = (puttResult: string) => {
    if (puttResult === 'In Hole') {
      // Final putt
      setPutts([...putts, puttResult]);
    } else {
      // Add putt and allow for another
      setPutts([...putts, puttResult]);
    }
  };

  const removePutt = () => {
    if (putts.length > 0) {
      setPutts(putts.slice(0, -1));
    }
  };

  const renderOptionButton = (
    option: string,
    selected: string,
    onSelect: (value: string) => void,
    color: string = '#4CAF50'
  ) => (
    <TouchableOpacity
      key={option}
      style={[
        styles.optionButton,
        selected === option && { backgroundColor: color }
      ]}
      onPress={() => onSelect(selected === option ? '' : option)}
    >
      <Text style={[
        styles.optionText,
        selected === option && styles.selectedOptionText
      ]}>
        {option}
      </Text>
    </TouchableOpacity>
  );

  const getTeeOptions = () => {
    return par === 3 ? TEE_SHOT_OPTIONS_PAR3 : TEE_SHOT_OPTIONS_PAR45;
  };

  const getScoreDisplay = () => {
    if (totalStrokes === 0) return '-';
    const diff = totalStrokes - par;
    if (diff === 0) return 'Par';
    if (diff === -3) return 'Albatross';
    if (diff === -2) return 'Eagle';
    if (diff === -1) return 'Birdie';
    if (diff === 1) return 'Bogey';
    if (diff === 2) return 'Double';
    if (diff === 3) return 'Triple';
    return diff > 0 ? `+${diff}` : diff.toString();
  };

  const sections = [
    { id: 'par', label: 'Par', show: true },
    { id: 'tee', label: 'Tee Shot', show: true },
    { id: 'approach', label: 'Approach', show: par > 3 },
    { id: 'chip', label: 'Chip', show: true },
    { id: 'bunker', label: 'Bunkers', show: true },
    { id: 'trouble', label: 'Trouble', show: true },
    { id: 'putts', label: 'Putts', show: true },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.holeNumber}>Hole {hole.holeNumber}</Text>
          <Text style={styles.parText}>Par {par}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.strokesLabel}>Strokes</Text>
          <Text style={styles.strokesValue}>{totalStrokes || '-'}</Text>
          <Text style={styles.scoreText}>{getScoreDisplay()}</Text>
        </View>
      </View>

      {/* Section Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
        {sections.filter(s => s.show).map(section => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.tab,
              activeSection === section.id && styles.activeTab
            ]}
            onPress={() => setActiveSection(section.id)}
          >
            <Text style={[
              styles.tabText,
              activeSection === section.id && styles.activeTabText
            ]}>
              {section.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content Area */}
      <ScrollView style={styles.content}>
        {/* Par Selection */}
        {activeSection === 'par' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Par for Hole {hole.holeNumber}</Text>
            <View style={styles.optionsGrid}>
              {[3, 4, 5].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.parButton,
                    par === p && styles.selectedParButton
                  ]}
                  onPress={() => setPar(p as 3 | 4 | 5)}
                >
                  <Text style={[
                    styles.parButtonText,
                    par === p && styles.selectedParButtonText
                  ]}>
                    Par {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Tee Shot */}
        {activeSection === 'tee' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tee Shot Result</Text>
            <View style={styles.optionsGrid}>
              {getTeeOptions().map(option =>
                renderOptionButton(option, teeShot, setTeeShot, '#2196F3')
              )}
            </View>
            {teeShot && (
              <View style={styles.selectedDisplay}>
                <Icon name="golf-course" size={20} color="#2196F3" />
                <Text style={styles.selectedText}>Tee: {teeShot}</Text>
              </View>
            )}
          </View>
        )}

        {/* Approach */}
        {activeSection === 'approach' && par > 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approach Shot</Text>
            <View style={styles.optionsGrid}>
              {APPROACH_OPTIONS.map(option =>
                renderOptionButton(option, approach, setApproach, '#4CAF50')
              )}
            </View>
            {approach && (
              <View style={styles.selectedDisplay}>
                <Icon name="flag" size={20} color="#4CAF50" />
                <Text style={styles.selectedText}>Approach: {approach}</Text>
              </View>
            )}
          </View>
        )}

        {/* Chip */}
        {activeSection === 'chip' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chip Shot</Text>
            <View style={styles.optionsGrid}>
              {CHIP_OPTIONS.map(option =>
                renderOptionButton(option, chip, setChip, '#FF9800')
              )}
            </View>
            {chip && (
              <View style={styles.selectedDisplay}>
                <Icon name="sports-golf" size={20} color="#FF9800" />
                <Text style={styles.selectedText}>Chip: {chip}</Text>
              </View>
            )}
          </View>
        )}

        {/* Bunkers */}
        {activeSection === 'bunker' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Greenside Bunker</Text>
            <View style={styles.optionsGrid}>
              {BUNKER_OPTIONS.map(option =>
                renderOptionButton(option, greensideBunker, setGreensideBunker, '#F4B400')
              )}
            </View>
            {greensideBunker && (
              <View style={styles.selectedDisplay}>
                <Text style={styles.selectedText}>Greenside: {greensideBunker}</Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Fairway Bunker</Text>
            <View style={styles.optionsGrid}>
              {BUNKER_OPTIONS.map(option =>
                renderOptionButton(option, fairwayBunker, setFairwayBunker, '#DB4437')
              )}
            </View>
            {fairwayBunker && (
              <View style={styles.selectedDisplay}>
                <Text style={styles.selectedText}>Fairway: {fairwayBunker}</Text>
              </View>
            )}
          </View>
        )}

        {/* Trouble Shot */}
        {activeSection === 'trouble' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trouble/Recovery Shot</Text>
            <View style={styles.optionsGrid}>
              {TROUBLE_SHOT_OPTIONS.map(option =>
                renderOptionButton(option, troubleShot, setTroubleShot, '#9C27B0')
              )}
            </View>
            {troubleShot && (
              <View style={styles.selectedDisplay}>
                <Icon name="warning" size={20} color="#9C27B0" />
                <Text style={styles.selectedText}>Trouble: {troubleShot}</Text>
              </View>
            )}
          </View>
        )}

        {/* Putts */}
        {activeSection === 'putts' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Putting ({putts.length} putts)</Text>
            
            {/* Show existing putts */}
            {putts.length > 0 && (
              <View style={styles.puttsList}>
                {putts.map((putt, index) => (
                  <View key={index} style={styles.puttItem}>
                    <Text style={styles.puttNumber}>Putt {index + 1}:</Text>
                    <Text style={styles.puttResult}>{putt}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.removePuttButton} onPress={removePutt}>
                  <Icon name="remove-circle" size={20} color="#F44336" />
                  <Text style={styles.removePuttText}>Remove Last Putt</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add new putt if not holed */}
            {(!putts.length || putts[putts.length - 1] !== 'In Hole') && (
              <>
                <Text style={styles.subsectionTitle}>
                  {putts.length === 0 ? 'First Putt' : `Putt ${putts.length + 1}`}
                </Text>
                <View style={styles.optionsGrid}>
                  {PUTT_OPTIONS.map(option =>
                    renderOptionButton(
                      option,
                      '',
                      (value) => addPutt(value),
                      option === 'In Hole' ? '#4CAF50' : '#0F9D58'
                    )
                  )}
                </View>
              </>
            )}

            {putts.includes('In Hole') && (
              <View style={styles.holedDisplay}>
                <Icon name="flag" size={24} color="#4CAF50" />
                <Text style={styles.holedText}>Holed Out!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {teeShot && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Tee</Text>
              <Text style={styles.summaryValue}>{teeShot}</Text>
            </View>
          )}
          {approach && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>App</Text>
              <Text style={styles.summaryValue}>{approach}</Text>
            </View>
          )}
          {chip && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Chip</Text>
              <Text style={styles.summaryValue}>{chip}</Text>
            </View>
          )}
          {(greensideBunker || fairwayBunker) && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Bunker</Text>
              <Text style={styles.summaryValue}>
                {greensideBunker || fairwayBunker}
              </Text>
            </View>
          )}
          {troubleShot && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Trouble</Text>
              <Text style={styles.summaryValue}>{troubleShot}</Text>
            </View>
          )}
          {putts.length > 0 && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Putts</Text>
              <Text style={styles.summaryValue}>{putts.length}</Text>
            </View>
          )}
        </ScrollView>
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
          <Text style={styles.saveButtonText}>Save & Share</Text>
        </TouchableOpacity>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  holeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  parText: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  strokesLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  strokesValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  tabContainer: {
    backgroundColor: '#fff',
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
    marginBottom: 10,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#fff',
  },
  parButton: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  selectedParButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  parButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  selectedParButtonText: {
    color: '#fff',
  },
  selectedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  selectedText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  puttsList: {
    marginBottom: 20,
  },
  puttItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 5,
  },
  puttNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  puttResult: {
    fontSize: 14,
    color: '#333',
  },
  removePuttButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    padding: 8,
  },
  removePuttText: {
    fontSize: 14,
    color: '#F44336',
  },
  holedDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    padding: 15,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  holedText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  summaryBar: {
    backgroundColor: '#fff',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#999',
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  summaryButton: {
    backgroundColor: '#2196F3',
  },
});

export default ShotTrackingScreen;
