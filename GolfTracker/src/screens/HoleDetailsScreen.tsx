import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GolfHole } from '../types';

const HoleDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { hole, onSave } = route.params as { hole: GolfHole; onSave: (hole: GolfHole) => void };

  const [strokes, setStrokes] = useState(hole.strokes || 0);
  const [putts, setPutts] = useState(hole.putts || 0);
  const [fairwayHit, setFairwayHit] = useState(hole.fairwayHit || false);
  const [greenInRegulation, setGreenInRegulation] = useState(hole.greenInRegulation || false);
  const [notes, setNotes] = useState(hole.notes || '');

  const handleSave = () => {
    const updatedHole: GolfHole = {
      ...hole,
      strokes,
      putts,
      fairwayHit,
      greenInRegulation,
      notes,
    };
    onSave(updatedHole);
    navigation.goBack();
  };

  const getScoreName = () => {
    const score = strokes - hole.par;
    if (score <= -3) return 'Albatross';
    if (score === -2) return 'Eagle';
    if (score === -1) return 'Birdie';
    if (score === 0) return 'Par';
    if (score === 1) return 'Bogey';
    if (score === 2) return 'Double Bogey';
    if (score === 3) return 'Triple Bogey';
    return `+${score}`;
  };

  const getScoreColor = () => {
    const score = strokes - hole.par;
    if (score <= -2) return '#FFD700';
    if (score === -1) return '#4CAF50';
    if (score === 0) return '#2196F3';
    if (score === 1) return '#FF9800';
    return '#F44336';
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hole {hole.holeNumber}</Text>
        <Text style={styles.subtitle}>Par {hole.par}</Text>
      </View>

      {/* Score Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score</Text>
        <View style={styles.scoreContainer}>
          <View style={styles.scoreButtons}>
            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => setStrokes(Math.max(1, strokes - 1))}
            >
              <Icon name="remove" size={24} color="#666" />
            </TouchableOpacity>
            
            <View style={styles.scoreDisplay}>
              <Text style={[styles.scoreValue, { color: strokes > 0 ? getScoreColor() : '#666' }]}>
                {strokes || '-'}
              </Text>
              {strokes > 0 && (
                <Text style={styles.scoreName}>{getScoreName()}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.scoreButton}
              onPress={() => setStrokes(strokes + 1)}
            >
              <Icon name="add" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Putts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Putts</Text>
        <View style={styles.puttsContainer}>
          {[0, 1, 2, 3, 4, 5].map(num => (
            <TouchableOpacity
              key={num}
              style={[styles.puttButton, putts === num && styles.puttButtonActive]}
              onPress={() => setPutts(num)}
            >
              <Text style={[styles.puttButtonText, putts === num && styles.puttButtonTextActive]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Shot Tracking */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Tracking</Text>
        
        {hole.par > 3 && (
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Icon name="golf-course" size={20} color="#666" />
              <Text style={styles.switchText}>Fairway Hit</Text>
            </View>
            <Switch
              value={fairwayHit}
              onValueChange={setFairwayHit}
              trackColor={{ false: '#ddd', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
        )}

        <View style={styles.switchRow}>
          <View style={styles.switchLabel}>
            <Icon name="flag" size={20} color="#666" />
            <Text style={styles.switchText}>Green in Regulation</Text>
          </View>
          <Switch
            value={greenInRegulation}
            onValueChange={setGreenInRegulation}
            trackColor={{ false: '#ddd', true: '#4CAF50' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add notes about this hole..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Media Section */}
      {hole.mediaUrls && hole.mediaUrls.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Media</Text>
          <View style={styles.mediaCount}>
            <Icon name="photo-library" size={20} color="#4CAF50" />
            <Text style={styles.mediaCountText}>
              {hole.mediaUrls.length} photo{hole.mediaUrls.length !== 1 ? 's' : ''} attached
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Icon name="check" size={20} color="#fff" />
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </TouchableWithoutFeedback>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreDisplay: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreName: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  puttsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  puttButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  puttButtonActive: {
    backgroundColor: '#4CAF50',
  },
  puttButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  puttButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  switchText: {
    fontSize: 16,
    color: '#333',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 100,
  },
  mediaCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mediaCountText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
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
});

export default HoleDetailsScreen;
