import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/database';
import RoundDeletionManager from '../utils/RoundDeletionManager';
import { GolfRound, Tournament } from '../types';

const StatsScreen = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedRound, setSelectedRound] = useState<GolfRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen is focused and listen for round deletions
  useFocusEffect(
    React.useCallback(() => {
      loadData();
      
      const cleanup = RoundDeletionManager.addListener((deletedRoundId) => {
        console.log('Round deleted, refreshing StatsScreen');
        
        // If the currently selected round was deleted, clear the selection
        if (selectedRound && selectedRound.id === deletedRoundId) {
          setSelectedRound(null);
        }
        
        // Reload all data to reflect the deletion
        loadData();
      });

      return cleanup;
    }, [selectedRound])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const ts = await DatabaseService.getTournaments();
      setTournaments(ts);
    } catch (error) {
      console.error('Error loading stats data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!selectedRound) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Statistics by Round</Text>
        </View>
        
        {tournaments.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome5 name="chart-line" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No statistics yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create a tournament and track rounds to see statistics
            </Text>
          </View>
        ) : (
        <>
        {tournaments.map(t => (
          <View key={t.id} style={styles.section}>
            <Text style={styles.sectionTitle}>{t.name}</Text>
            {t.rounds.map(r => (
              <TouchableOpacity key={r.id} style={styles.roundRow} onPress={() => setSelectedRound(r)}>
                <Icon name="bar-chart" size={18} color="#4CAF50" />
                <Text style={styles.roundName}>{r.name || `Round at ${r.courseName}`} — {new Date(r.date).toLocaleDateString()}</Text>
              </TouchableOpacity>
            ))}
            {t.rounds.length === 0 && (
              <Text style={{ color: '#999' }}>No rounds yet</Text>
            )}
          </View>
        ))}
        </>
        )}
      </ScrollView>
    );
  }

  // Analyze shot data from the selected round
  const holes = selectedRound.holes || [];
  
  // Helper to extract shot data
  const extractShotData = (hole: any) => {
    try {
      if (!hole.shotData) return null;
      if (typeof hole.shotData === 'string') {
        return JSON.parse(hole.shotData);
      }
      return hole.shotData;
    } catch (e) {
      return null;
    }
  };

  // Aggregate shot statistics by type
  const shotStats: { [key: string]: { [result: string]: number } } = {};
  let totalShots = 0;
  let totalPutts = 0;

  holes.forEach(hole => {
    const shotData = extractShotData(hole);
    if (shotData?.shots && Array.isArray(shotData.shots)) {
      shotData.shots.forEach((shot: any) => {
        totalShots++;
        
        // Initialize shot type if not exists
        if (!shotStats[shot.type]) {
          shotStats[shot.type] = {};
        }
        
        // Count results for this shot type
        if (shot.results && Array.isArray(shot.results)) {
          shot.results.forEach((result: string) => {
            shotStats[shot.type][result] = (shotStats[shot.type][result] || 0) + 1;
          });
        }
        
        // If no results, count as "no result"
        if (!shot.results || shot.results.length === 0) {
          shotStats[shot.type]['no result'] = (shotStats[shot.type]['no result'] || 0) + 1;
        }
      });
    }
    
    // Count putts
    if (shotData?.putts && Array.isArray(shotData.putts)) {
      totalPutts += shotData.putts.length;
    } else if (hole.putts) {
      totalPutts += hole.putts;
    }
  });

  // Calculate basic round stats
  const completedHoles = holes.filter(h => h.strokes > 0);
  const totalScore = completedHoles.reduce((sum, h) => sum + h.strokes, 0);
  const totalPar = completedHoles.reduce((sum, h) => sum + h.par, 0);
  const scoreToPar = totalScore - totalPar;
  const fairwaysHit = selectedRound.fairwaysHit || 0;
  const greensInRegulation = selectedRound.greensInRegulation || 0;

  // Result icons mapping
  const resultIcons: { [key: string]: string } = {
    'up': '⬆️',
    'down': '⬇️',
    'left': '⬅️',
    'right': '➡️',
    'target': '🎯',
    'hazard': '💧',
    'bunker': '🏖️',
    'ob': '❌',
    'lost': '❓',
    'trees': '🌳',
    'no result': '—'
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
      </View>
      
      <View style={styles.roundHeader}>
        <TouchableOpacity onPress={() => setSelectedRound(null)} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.roundInfo}>
          <Text style={styles.roundName}>
            {selectedRound.name || `Round at ${selectedRound.courseName}`}
          </Text>
          <Text style={styles.roundDetails}>
            {selectedRound.courseName} • {new Date(selectedRound.date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {/* Overall Round Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Round Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalScore || '—'}</Text>
            <Text style={styles.statLabel}>Total Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{scoreToPar > 0 ? `+${scoreToPar}` : scoreToPar || 'E'}</Text>
            <Text style={styles.statLabel}>Score to Par</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completedHoles.length}/18</Text>
            <Text style={styles.statLabel}>Holes Played</Text>
          </View>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{fairwaysHit}</Text>
            <Text style={styles.statLabel}>Fairways Hit</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{greensInRegulation}</Text>
            <Text style={styles.statLabel}>Greens in Reg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalPutts}</Text>
            <Text style={styles.statLabel}>Total Putts</Text>
          </View>
        </View>
      </View>

      {/* Shot Type Analysis */}
      {Object.keys(shotStats).map(shotType => {
        const results = shotStats[shotType];
        const totalForType = Object.values(results).reduce((sum, count) => sum + count, 0);
        
        return (
          <View key={shotType} style={styles.section}>
            <Text style={styles.sectionTitle}>{shotType} ({totalForType} shots)</Text>
            <View style={styles.resultsGrid}>
              {Object.entries(results).map(([result, count]) => (
                <View key={result} style={styles.resultCard}>
                  <Text style={styles.resultIcon}>{resultIcons[result] || result}</Text>
                  <Text style={styles.resultCount}>{count}</Text>
                  <Text style={styles.resultLabel}>
                    {result === 'up' ? 'Long' :
                     result === 'down' ? 'Short' :
                     result === 'left' ? 'Left' :
                     result === 'right' ? 'Right' :
                     result === 'target' ? 'On Target' :
                     result === 'hazard' ? 'Hazard' :
                     result === 'bunker' ? 'Bunker' :
                     result === 'ob' ? 'Out of Bounds' :
                     result === 'lost' ? 'Lost Ball' :
                     result === 'trees' ? 'Trees' :
                     result === 'no result' ? 'No Result' :
                     result}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}

      {Object.keys(shotStats).length === 0 && (
        <View style={styles.section}>
          <Text style={styles.noDataText}>No detailed shot data available for this round</Text>
          <Text style={styles.noDataSubtext}>Track your shots during the round to see detailed statistics</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  roundInfo: {
    flex: 1,
  },
  roundName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  roundDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  section: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roundName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultCard: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  resultIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  resultCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  resultLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default StatsScreen;