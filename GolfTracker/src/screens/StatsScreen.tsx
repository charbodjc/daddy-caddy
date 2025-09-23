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
import DatabaseService from '../services/database';
import { GolfRound, Tournament } from '../types';

const StatsScreen = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedRound, setSelectedRound] = useState<GolfRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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
                <Text style={styles.roundName}>{r.courseName} — {new Date(r.date).toLocaleDateString()}</Text>
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

  // Per-round shot stats
  const holes = selectedRound.holes || [];
  // Aggregate across all shot types present in shotData.shots if JSON string
  const extract = (h: any) => {
    try {
      if (typeof h.shotData === 'string') return JSON.parse(h.shotData);
      return h.shotData;
    } catch { return h.shotData; }
  };

  const teeLeft = holes.filter(h => extract(h)?.teeShot === 'Left' || (extract(h)?.shots||[]).some((s:any)=>(s.type==='Tee' || s.type==='Tee Shot') && s.results?.includes('left'))).length;
  const teeRight = holes.filter(h => extract(h)?.teeShot === 'Right' || (extract(h)?.shots||[]).some((s:any)=>(s.type==='Tee' || s.type==='Tee Shot') && s.results?.includes('right'))).length;
  const teeFair = holes.filter(h => extract(h)?.teeShot === 'Fairway' || (extract(h)?.shots||[]).some((s:any)=>(s.type==='Tee' || s.type==='Tee Shot') && s.results?.includes('target'))).length;

  const appLeftShort = holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Approach' && (s.results?.includes('left') || s.results?.includes('down')))).length;
  const appLeftLong = holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Approach' && (s.results?.includes('left') || s.results?.includes('up')))).length;
  const appRightShort = holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Approach' && (s.results?.includes('right') || s.results?.includes('down')))).length;
  const appRightLong = holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Approach' && (s.results?.includes('right') || s.results?.includes('up')))).length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedRound(null)}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.title, { marginTop: 10 }]}>Round Stats</Text>
        <Text style={{ color: '#fff' }}>{selectedRound.courseName} • {new Date(selectedRound.date).toLocaleDateString()}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tee Shots</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{teeLeft}</Text><Text style={styles.statLabel}>Miss Left</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{teeFair}</Text><Text style={styles.statLabel}>On Target</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{teeRight}</Text><Text style={styles.statLabel}>Miss Right</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Approach</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{appLeftShort}</Text><Text style={styles.statLabel}>Left/Short</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{appRightShort}</Text><Text style={styles.statLabel}>Right/Short</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{appLeftLong}</Text><Text style={styles.statLabel}>Left/Long</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{appRightLong}</Text><Text style={styles.statLabel}>Right/Long</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Short Game & Trouble</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}><Text style={styles.statValue}>{holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Chip' || s.type==='Chip/Pitch')).length}</Text><Text style={styles.statLabel}>Chips</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type?.includes('Bunker'))).length}</Text><Text style={styles.statLabel}>Bunker</Text></View>
          <View style={styles.statCard}><Text style={styles.statValue}>{holes.filter(h => (extract(h)?.shots||[]).some((s:any)=>s.type==='Trouble' || s.type==='Recovery' || s.type==='Hazard' || s.type==='Penalty' || s.results?.includes('hazard') || s.results?.includes('ob'))).length}</Text><Text style={styles.statLabel}>Trouble</Text></View>
        </View>
        </View>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#4CAF50',
  },
  overviewCards: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#666',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 12,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  roundName: {
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  accuracyStats: {
    gap: 20,
  },
  accuracyStat: {
    gap: 8,
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accuracyLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  accuracyValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  puttingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  puttingStats: {
    flex: 1,
  },
  puttingValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  puttingLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  distributionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
  },
  distributionBar: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: 40,
    borderRadius: 4,
    marginBottom: 5,
  },
  eagleBar: {
    backgroundColor: '#FFD700',
  },
  birdieBar: {
    backgroundColor: '#4CAF50',
  },
  parBar: {
    backgroundColor: '#2196F3',
  },
  bogeyBar: {
    backgroundColor: '#FF9800',
  },
  doubleBar: {
    backgroundColor: '#F44336',
  },
  barLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingVertical: 10,
    gap: 15,
  },
  chartBar: {
    alignItems: 'center',
  },
  chartScore: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  chartBarFill: {
    width: 30,
    borderRadius: 4,
    marginBottom: 5,
  },
  chartDate: {
    fontSize: 10,
    color: '#666',
  },
});

export default StatsScreen;
