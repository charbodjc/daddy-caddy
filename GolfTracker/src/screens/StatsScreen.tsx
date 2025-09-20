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
import DatabaseService from '../services/database';
import AIService from '../services/ai';
import { GolfRound, Statistics } from '../types';

const StatsScreen = () => {
  const [rounds, setRounds] = useState<GolfRound[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '90days'>('all');

  useEffect(() => {
    loadStatistics();
  }, [timeFilter]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const allRounds = await DatabaseService.getRounds();
      
      // Apply time filter
      const filteredRounds = filterRoundsByTime(allRounds);
      setRounds(filteredRounds);

      if (filteredRounds.length > 0) {
        const stats = AIService.calculateStatistics(filteredRounds);
        setStatistics(stats);
      } else {
        setStatistics(null);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRoundsByTime = (rounds: GolfRound[]): GolfRound[] => {
    if (timeFilter === 'all') return rounds;
    
    const now = new Date();
    const daysAgo = timeFilter === '30days' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    return rounds.filter(round => round.date >= cutoffDate);
  };

  const getImprovementTrend = (): 'improving' | 'declining' | 'stable' => {
    if (rounds.length < 3) return 'stable';
    
    const recentRounds = rounds.slice(0, 3);
    const olderRounds = rounds.slice(3, 6);
    
    if (olderRounds.length === 0) return 'stable';
    
    const recentAvg = recentRounds.reduce((sum, r) => sum + (r.totalScore || 0), 0) / recentRounds.length;
    const olderAvg = olderRounds.reduce((sum, r) => sum + (r.totalScore || 0), 0) / olderRounds.length;
    
    if (recentAvg < olderAvg - 1) return 'improving';
    if (recentAvg > olderAvg + 1) return 'declining';
    return 'stable';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!statistics || rounds.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="bar-chart" size={64} color="#ccc" />
        <Text style={styles.emptyText}>No statistics available</Text>
        <Text style={styles.emptySubtext}>Play some rounds to see your statistics</Text>
      </View>
    );
  }

  const trend = getImprovementTrend();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Statistics</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('all')}
          >
            <Text style={[styles.filterButtonText, timeFilter === 'all' && styles.filterButtonTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === '30days' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('30days')}
          >
            <Text style={[styles.filterButtonText, timeFilter === '30days' && styles.filterButtonTextActive]}>
              30 Days
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, timeFilter === '90days' && styles.filterButtonActive]}
            onPress={() => setTimeFilter('90days')}
          >
            <Text style={[styles.filterButtonText, timeFilter === '90days' && styles.filterButtonTextActive]}>
              90 Days
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Overview Cards */}
      <View style={styles.overviewCards}>
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Icon name="sports-golf" size={20} color="#4CAF50" />
            <Text style={styles.overviewLabel}>Rounds Played</Text>
          </View>
          <Text style={styles.overviewValue}>{statistics.totalRounds}</Text>
        </View>

        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Icon 
              name={trend === 'improving' ? 'trending-down' : trend === 'declining' ? 'trending-up' : 'trending-flat'} 
              size={20} 
              color={trend === 'improving' ? '#4CAF50' : trend === 'declining' ? '#F44336' : '#FF9800'}
            />
            <Text style={styles.overviewLabel}>Trend</Text>
          </View>
          <Text style={[
            styles.overviewValue,
            { color: trend === 'improving' ? '#4CAF50' : trend === 'declining' ? '#F44336' : '#FF9800' }
          ]}>
            {trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable'}
          </Text>
        </View>
      </View>

      {/* Scoring Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Scoring</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics.averageScore.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Average Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics.bestRound}</Text>
            <Text style={styles.statLabel}>Best Round</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{statistics.worstRound}</Text>
            <Text style={styles.statLabel}>Worst Round</Text>
          </View>
        </View>
      </View>

      {/* Shot Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shot Accuracy</Text>
        <View style={styles.accuracyStats}>
          <View style={styles.accuracyStat}>
            <View style={styles.accuracyHeader}>
              <Icon name="golf-course" size={16} color="#666" />
              <Text style={styles.accuracyLabel}>Fairway Accuracy</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${statistics.fairwayAccuracy}%` }]}
              />
            </View>
            <Text style={styles.accuracyValue}>{statistics.fairwayAccuracy.toFixed(1)}%</Text>
          </View>

          <View style={styles.accuracyStat}>
            <View style={styles.accuracyHeader}>
              <Icon name="flag" size={16} color="#666" />
              <Text style={styles.accuracyLabel}>Greens in Regulation</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[styles.progressFill, { width: `${statistics.girPercentage}%` }]}
              />
            </View>
            <Text style={styles.accuracyValue}>{statistics.girPercentage.toFixed(1)}%</Text>
          </View>
        </View>
      </View>

      {/* Putting Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Putting</Text>
        <View style={styles.puttingCard}>
          <Icon name="sports-golf" size={32} color="#4CAF50" />
          <View style={styles.puttingStats}>
            <Text style={styles.puttingValue}>{statistics.averagePutts.toFixed(1)}</Text>
            <Text style={styles.puttingLabel}>Average Putts per Round</Text>
          </View>
        </View>
      </View>

      {/* Score Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Score Distribution</Text>
        <View style={styles.distributionContainer}>
          {statistics.eaglesOrBetter > 0 && (
            <View style={styles.distributionBar}>
              <View style={[styles.bar, styles.eagleBar, { height: (statistics.eaglesOrBetter / rounds.length) * 100 }]} />
              <Text style={styles.barLabel}>Eagle-</Text>
              <Text style={styles.barValue}>{statistics.eaglesOrBetter}</Text>
            </View>
          )}
          <View style={styles.distributionBar}>
            <View style={[styles.bar, styles.birdieBar, { height: (statistics.birdies / (rounds.length * 18)) * 300 }]} />
            <Text style={styles.barLabel}>Birdie</Text>
            <Text style={styles.barValue}>{statistics.birdies}</Text>
          </View>
          <View style={styles.distributionBar}>
            <View style={[styles.bar, styles.parBar, { height: (statistics.pars / (rounds.length * 18)) * 300 }]} />
            <Text style={styles.barLabel}>Par</Text>
            <Text style={styles.barValue}>{statistics.pars}</Text>
          </View>
          <View style={styles.distributionBar}>
            <View style={[styles.bar, styles.bogeyBar, { height: (statistics.bogeys / (rounds.length * 18)) * 300 }]} />
            <Text style={styles.barLabel}>Bogey</Text>
            <Text style={styles.barValue}>{statistics.bogeys}</Text>
          </View>
          <View style={styles.distributionBar}>
            <View style={[styles.bar, styles.doubleBar, { height: (statistics.doubleBogeyOrWorse / (rounds.length * 18)) * 300 }]} />
            <Text style={styles.barLabel}>Double+</Text>
            <Text style={styles.barValue}>{statistics.doubleBogeyOrWorse}</Text>
          </View>
        </View>
      </View>

      {/* Recent Rounds Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Scores</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chartContainer}>
            {rounds.slice(0, 10).reverse().map((round, index) => (
              <View key={round.id} style={styles.chartBar}>
                <Text style={styles.chartScore}>{round.totalScore || '-'}</Text>
                <View 
                  style={[
                    styles.chartBarFill,
                    { 
                      height: ((round.totalScore || 72) - 60) * 3,
                      backgroundColor: round.totalScore && round.totalScore < statistics.averageScore ? '#4CAF50' : '#FF9800'
                    }
                  ]}
                />
                <Text style={styles.chartDate}>
                  {round.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
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
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
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
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
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
