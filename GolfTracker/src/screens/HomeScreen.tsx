// Updated: Quick Tips removed, Media tab removed, Delete functionality added - 2025-09-29
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { GolfRound, Tournament } from '../types';
import RoundDeletionManager from '../services/roundManager';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRound, setActiveRound] = useState<GolfRound | null>(null);
  const [recentRounds, setRecentRounds] = useState<GolfRound[]>([]);
  const [stats, setStats] = useState({
    totalRounds: 0,
    averageScore: 0,
    bestScore: 0,
    totalBirdies: 0,
    totalEagles: 0,
    averagePutts: 0,
    fairwayAccuracy: 0,
    greenAccuracy: 0,
  });

  const loadData = async () => {
    try {
      // Check for active round
      const activeRoundId = await DatabaseService.getPreference('active_round_id');
      if (activeRoundId) {
        const round = await DatabaseService.getRound(activeRoundId);
        setActiveRound(round);
      } else {
        setActiveRound(null);
      }

      // Load all rounds for stats
      const allRounds = await DatabaseService.getRounds();
      
      // Get recent completed rounds
      const completed = allRounds
        .filter(r => r.holes.filter(h => h.strokes > 0).length === 18)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 3);
      setRecentRounds(completed);

      // Calculate statistics
      if (allRounds.length > 0) {
        const completedRounds = allRounds.filter(r => 
          r.holes.filter(h => h.strokes > 0).length === 18
        );

        if (completedRounds.length > 0) {
          const totalScores = completedRounds.map(r => r.totalScore || 0);
          const avgScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;
          const bestScore = Math.min(...totalScores);

          // Count birdies and eagles
          let birdies = 0;
          let eagles = 0;
          let totalPutts = 0;
          let totalFairways = 0;
          let totalGreens = 0;
          let roundCount = 0;

          completedRounds.forEach(round => {
            roundCount++;
            totalPutts += round.totalPutts || 0;
            totalFairways += round.fairwaysHit || 0;
            totalGreens += round.greensInRegulation || 0;

            round.holes.forEach(hole => {
              const diff = hole.strokes - (hole.par || 4);
              if (diff === -1) birdies++;
              if (diff === -2) eagles++;
            });
          });

          setStats({
            totalRounds: completedRounds.length,
            averageScore: Math.round(avgScore),
            bestScore: bestScore,
            totalBirdies: birdies,
            totalEagles: eagles,
            averagePutts: Math.round(totalPutts / roundCount),
            fairwayAccuracy: Math.round((totalFairways / (roundCount * 14)) * 100), // Assuming 14 fairways
            greenAccuracy: Math.round((totalGreens / (roundCount * 18)) * 100),
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      
      const subscription = RoundDeletionManager.subscribe(() => {
        loadData();
      });

      return () => subscription();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const startQuickRound = () => {
    navigation.navigate('Scoring' as never, {
      screen: 'RoundTracker',
      params: { quickStart: true }
    } as never);
  };

  const continueRound = () => {
    if (activeRound) {
      navigation.navigate('Scoring' as never, {
        screen: 'RoundTracker',
        params: { roundId: activeRound.id }
      } as never);
    }
  };

  const goToTournaments = () => {
    navigation.navigate('Tournaments' as never);
  };

  const handleDeleteRound = async (round: GolfRound) => {
    Alert.alert(
      'Delete Round?',
      `Are you sure you want to delete the round at ${round.courseName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteRound(round.id);
              console.log(`✅ Round ${round.id} deleted`);
              // Refresh the data
              loadRecentRounds();
              loadStats();
            } catch (error) {
              console.error('❌ Failed to delete round:', error);
              Alert.alert('Error', 'Failed to delete round');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/daddy_caddy_logo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Daddy Caddy</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {activeRound ? (
            <TouchableOpacity style={styles.primaryButton} onPress={continueRound}>
              <MaterialCommunityIcons name="golf" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Continue Round</Text>
              <Text style={styles.primaryButtonSubtext}>
                Hole {activeRound.holes.filter(h => h.strokes > 0).length + 1}/18
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={goToTournaments}>
              <FontAwesome5 name="plus-circle" size={24} color="#fff" />
              <Text style={styles.primaryButtonText}>Start New Round</Text>
              <Text style={styles.primaryButtonSubtext}>Create a tournament first</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.secondaryActions}>
            <TouchableOpacity style={styles.secondaryButton} onPress={goToTournaments}>
              <FontAwesome5 name="trophy" size={20} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>Tournaments</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => navigation.navigate('Stats' as never)}
            >
              <Icon name="bar-chart" size={20} color="#4CAF50" />
              <Text style={styles.secondaryButtonText}>Statistics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Performance Dashboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Performance</Text>
        {stats.totalRounds > 0 ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <FontAwesome5 name="chart-line" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{stats.averageScore}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome5 name="medal" size={24} color="#FFD700" />
              <Text style={styles.statValue}>{stats.bestScore}</Text>
              <Text style={styles.statLabel}>Best Score</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialCommunityIcons name="bird" size={24} color="#2196F3" />
              <Text style={styles.statValue}>{stats.totalBirdies}</Text>
              <Text style={styles.statLabel}>Total Birdies</Text>
            </View>
            <View style={styles.statCard}>
              <FontAwesome5 name="bullseye" size={24} color="#FF6B6B" />
              <Text style={styles.statValue}>{stats.fairwayAccuracy}%</Text>
              <Text style={styles.statLabel}>Fairways</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyStats}>
            <FontAwesome5 name="chart-bar" size={48} color="#ccc" />
            <Text style={styles.emptyStatsText}>No completed rounds yet</Text>
            <Text style={styles.emptyStatsSubtext}>
              Complete your first 18-hole round to see your stats
            </Text>
          </View>
        )}
      </View>

      {/* Achievements */}
      {stats.totalRounds > 0 && (stats.totalEagles > 0 || stats.totalBirdies >= 10) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.achievementsRow}>
            {stats.totalEagles > 0 && (
              <View style={styles.achievement}>
                <View style={styles.achievementIcon}>
                  <MaterialCommunityIcons name="bird" size={28} color="#FFD700" />
                </View>
                <Text style={styles.achievementText}>Eagle Hunter</Text>
                <Text style={styles.achievementCount}>{stats.totalEagles} Eagles</Text>
              </View>
            )}
            {stats.totalBirdies >= 10 && (
              <View style={styles.achievement}>
                <View style={styles.achievementIcon}>
                  <FontAwesome5 name="star" size={28} color="#4CAF50" />
                </View>
                <Text style={styles.achievementText}>Birdie Machine</Text>
                <Text style={styles.achievementCount}>{stats.totalBirdies} Birdies</Text>
              </View>
            )}
            {stats.bestScore <= 80 && (
              <View style={styles.achievement}>
                <View style={styles.achievementIcon}>
                  <FontAwesome5 name="fire" size={28} color="#FF6B6B" />
                </View>
                <Text style={styles.achievementText}>Breaking 80</Text>
                <Text style={styles.achievementCount}>Best: {stats.bestScore}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Recent Activity */}
      {recentRounds.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Rounds</Text>
          {recentRounds.map((round, index) => (
            <View key={round.id} style={styles.recentRound}>
              <View style={styles.recentRoundLeft}>
                <Text style={styles.recentRoundCourse}>{round.courseName}</Text>
                <Text style={styles.recentRoundDate}>
                  {new Date(round.date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.recentRoundMiddle}>
                <Text style={styles.recentRoundScore}>{round.totalScore}</Text>
                <Text style={styles.recentRoundPar}>
                  {round.totalScore - 72 > 0 ? '+' : ''}{round.totalScore - 72}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteRound(round)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="delete" size={20} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerLogo: {
    width: 50,
    height: 50,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActions: {
    gap: 15,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    gap: 5,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  primaryButtonSubtext: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f8f0',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    gap: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  emptyStats: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyStatsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 15,
  },
  emptyStatsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  achievementsRow: {
    flexDirection: 'row',
    gap: 15,
  },
  achievement: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  achievementIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  achievementCount: {
    fontSize: 11,
    color: '#666',
  },
  recentRound: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentRoundLeft: {
    flex: 1,
  },
  recentRoundCourse: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  recentRoundDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  recentRoundMiddle: {
    alignItems: 'flex-end',
    marginRight: 15,
  },
  deleteButton: {
    padding: 5,
    justifyContent: 'center',
  },
  recentRoundScore: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  recentRoundPar: {
    fontSize: 14,
    color: '#666',
  },
  // Removed tipCard and tipText styles - Quick Tips section deleted
});

export default HomeScreen;