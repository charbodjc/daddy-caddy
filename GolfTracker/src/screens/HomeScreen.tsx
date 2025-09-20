import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { GolfRound, Statistics } from '../types';
import AIService from '../services/ai';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [recentRounds, setRecentRounds] = useState<GolfRound[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await DatabaseService.init();
      const rounds = await DatabaseService.getRounds();
      setRecentRounds(rounds.slice(0, 5)); // Get last 5 rounds
      
      if (rounds.length > 0) {
        const stats = AIService.calculateStatistics(rounds);
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Golf Tracker</Text>
        <Text style={styles.subtitle}>Track • Analyze • Improve</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => navigation.navigate('Round' as never)}
        >
          <Icon name="add-circle" size={30} color="#fff" />
          <Text style={styles.actionButtonText}>New Round</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Stats' as never)}
        >
          <Icon name="bar-chart" size={30} color="#4CAF50" />
          <Text style={styles.actionButtonTextDark}>View Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Overview */}
      {statistics && (
        <View style={styles.statsOverview}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statistics.averageScore.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statistics.averagePutts.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Avg Putts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statistics.fairwayAccuracy.toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>Fairways</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {statistics.girPercentage.toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>GIR</Text>
            </View>
          </View>

          <View style={styles.scoreDistribution}>
            <Text style={styles.subsectionTitle}>Score Distribution</Text>
            <View style={styles.scoreGrid}>
              {statistics.eaglesOrBetter > 0 && (
                <View style={styles.scoreItem}>
                  <Text style={styles.scoreCount}>{statistics.eaglesOrBetter}</Text>
                  <Text style={styles.scoreLabel}>Eagles</Text>
                </View>
              )}
              <View style={styles.scoreItem}>
                <Text style={styles.scoreCount}>{statistics.birdies}</Text>
                <Text style={styles.scoreLabel}>Birdies</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreCount}>{statistics.pars}</Text>
                <Text style={styles.scoreLabel}>Pars</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreCount}>{statistics.bogeys}</Text>
                <Text style={styles.scoreLabel}>Bogeys</Text>
              </View>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreCount}>{statistics.doubleBogeyOrWorse}</Text>
                <Text style={styles.scoreLabel}>Double+</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Recent Rounds */}
      <View style={styles.recentRounds}>
        <Text style={styles.sectionTitle}>Recent Rounds</Text>
        {recentRounds.length > 0 ? (
          recentRounds.map((round) => (
            <TouchableOpacity
              key={round.id}
              style={styles.roundCard}
              onPress={() => navigation.navigate('RoundSummary' as never, { roundId: round.id } as never)}
            >
              <View style={styles.roundHeader}>
                <Text style={styles.courseName}>{round.courseName}</Text>
                <Text style={styles.roundDate}>{formatDate(round.date)}</Text>
              </View>
              <View style={styles.roundStats}>
                <View style={styles.roundStatItem}>
                  <Icon name="flag" size={16} color="#666" />
                  <Text style={styles.roundStatText}>
                    Score: {round.totalScore || 'N/A'}
                  </Text>
                </View>
                {round.tournamentName && (
                  <View style={styles.roundStatItem}>
                    <Icon name="emoji-events" size={16} color="#666" />
                    <Text style={styles.roundStatText}>{round.tournamentName}</Text>
                  </View>
                )}
              </View>
              {round.aiAnalysis && (
                <View style={styles.aiInsight}>
                  <Icon name="psychology" size={16} color="#4CAF50" />
                  <Text style={styles.aiInsightText} numberOfLines={2}>
                    {round.aiAnalysis}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="golf-course" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No rounds recorded yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Start tracking your golf rounds to see statistics here
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  actionButtonTextDark: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  statsOverview: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
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
  scoreDistribution: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  scoreGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  scoreItem: {
    alignItems: 'center',
  },
  scoreCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  recentRounds: {
    padding: 20,
    paddingTop: 0,
  },
  roundCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  courseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roundDate: {
    fontSize: 14,
    color: '#666',
  },
  roundStats: {
    flexDirection: 'row',
    gap: 15,
  },
  roundStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roundStatText: {
    fontSize: 14,
    color: '#666',
  },
  aiInsight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 5,
  },
  aiInsightText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
});

export default HomeScreen;
