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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { ScoringStackParamList } from '../types/navigation';
import { database } from '../database/watermelon/database';
import { ScreenHeader } from '../components/common/ScreenHeader';
import Hole from '../database/watermelon/models/Hole';
import Media from '../database/watermelon/models/Media';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { Q } from '@nozbe/watermelondb';
import { parseShotData } from '../utils/roundStats';
import { getScoreColor, getScoreName } from '../utils/scoreColors';

interface RouteParams {
  holeId: string;
  roundId: string;
}

const HoleDetailsScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<ScoringStackParamList>>();
  const route = useRoute();
  const { holeId, roundId } = (route.params as RouteParams) || {};
  
  const { updateHole } = useRoundStore();
  
  const [hole, setHole] = useState<Hole | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    loadHoleData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadHoleData depends on holeId
  }, [holeId]);
  
  const loadHoleData = async () => {
    if (!holeId) return;
    
    setLoading(true);
    try {
      const holeData = await database.collections.get<Hole>('holes').find(holeId);
      setHole(holeData);
      setNotes(holeData.notes || '');
      
      // Load media for this hole
      const holeMedia = await database.collections
        .get<Media>('media')
        .query(
          Q.where('round_id', roundId),
          Q.where('hole_number', holeData.holeNumber)
        )
        .fetch();
      
      setMedia(holeMedia);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!hole || !roundId) return;
    
    setSaving(true);
    try {
      await updateHole(roundId, {
        holeNumber: hole.holeNumber,
        par: hole.par,
        strokes: hole.strokes,
        notes: notes.trim(),
        fairwayHit: hole.fairwayHit,
        greenInRegulation: hole.greenInRegulation,
        putts: hole.putts,
        shotData: hole.shotData,
      });
      
      Alert.alert('Success', 'Notes saved');
    } catch (error) {
      Alert.alert('Error', 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };
  
  const handleNavigateToCamera = () => {
    navigation.navigate('Camera', {
      roundId,
      currentHole: hole?.holeNumber ?? 0,
    });
  };
  
  if (loading) {
    return <LoadingScreen message="Loading hole details..." />;
  }
  
  if (error || !hole) {
    return <ErrorScreen error={error || new Error('Hole not found')} onRetry={loadHoleData} />;
  }
  
  const score = hole.strokes - hole.par;
  const scoreText = getScoreName(score);
  const scoreColorValue = getScoreColor(score);
  
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Hole ${hole.holeNumber}`}
        subtitle={`Par ${hole.par}`}
        leftAction="back"
      />
      <ScrollView style={styles.scrollContent}>
      
      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreMain}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{hole.strokes}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColorValue }]}>
            <Text style={styles.scoreBadgeText}>{scoreText}</Text>
          </View>
        </View>
        
        <View style={styles.scoreDivider} />
        
        <View style={styles.scoreStats}>
          {hole.putts !== undefined && hole.putts > 0 && (
            <StatRow icon="golf-course" label="Putts" value={hole.putts} />
          )}
          {hole.fairwayHit !== undefined && (
            <StatRow
              icon="flag"
              label="Fairway"
              value={hole.fairwayHit ? 'Hit' : 'Missed'}
            />
          )}
          {hole.greenInRegulation !== undefined && (
            <StatRow
              icon="adjust"
              label="GIR"
              value={hole.greenInRegulation ? 'Yes' : 'No'}
            />
          )}
        </View>
      </View>
      
      {/* Media Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Media</Text>
          <TouchableOpacity
            style={styles.addMediaButton}
            onPress={handleNavigateToCamera}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Add photo or video"
            accessibilityRole="button"
          >
            <Icon name="add-a-photo" size={20} color="#4CAF50" />
            <Text style={styles.addMediaText}>Add</Text>
          </TouchableOpacity>
        </View>
        
        {media.length === 0 ? (
          <View style={styles.emptyMedia}>
            <Icon name="photo-library" size={40} color="#ddd" />
            <Text style={styles.emptyMediaText}>No photos or videos yet</Text>
          </View>
        ) : (
          <View style={styles.mediaGrid}>
            {media.map((item) => (
              <View key={item.id} style={styles.mediaThumbnail}>
                <Icon
                  name={item.type === 'photo' ? 'photo' : 'videocam'}
                  size={32}
                  color="#4CAF50"
                />
              </View>
            ))}
          </View>
        )}
      </View>
      
      {/* Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notes</Text>
        
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={4}
          placeholder="Add notes about this hole..."
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
          accessibilityLabel="Hole notes"
        />
        
        <Button
          title="Save Notes"
          onPress={handleSaveNotes}
          loading={saving}
          style={styles.saveButton}
        />
      </View>
      
      {/* Shot Data Section */}
      {hole.shotData && (() => {
        const shotData = parseShotData(hole.shotData);
        return shotData && shotData.shots.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shot Data</Text>
            <View style={styles.shotDataCard}>
              {shotData.shots.map((shot, index) => (
                <Text key={index} style={styles.shotDataText}>
                  {shot.type} (Stroke {shot.stroke}): {shot.results.join(', ')}
                </Text>
              ))}
            </View>
          </View>
        ) : null;
      })()}
      </ScrollView>
    </View>
  );
};

// Helper Component
const StatRow: React.FC<{
  icon: string;
  label: string;
  value: string | number;
}> = React.memo(({ icon, label, value }) => (
  <View style={styles.statRow}>
    <FontAwesome5 name={icon} size={16} color="#666" />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
));

StatRow.displayName = 'StatRow';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flex: 1,
  },
  scoreCard: {
    backgroundColor: '#fff',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scoreMain: {
    flex: 1,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scoreDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  scoreStats: {
    flex: 1,
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginTop: 15,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  addMediaText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  emptyMedia: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyMediaText: {
    fontSize: 14,
    color: '#767676',
    marginTop: 10,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaThumbnail: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  saveButton: {
    marginBottom: 20,
  },
  shotDataCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shotDataText: {
    fontSize: 14,
    color: '#333',
  },
});

export default HoleDetailsScreen;

