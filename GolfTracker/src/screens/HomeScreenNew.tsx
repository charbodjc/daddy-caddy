/**
 * HomeScreenNew.tsx
 * 
 * This is a TEMPLATE showing how to migrate screens to the new architecture.
 * When ready, replace the old HomeScreen.tsx with this approach.
 * 
 * Key patterns demonstrated:
 * 1. Use custom hooks for data
 * 2. Use stores for actions
 * 3. Use reusable components
 * 4. Loading/Error/Content pattern
 * 5. React.memo for optimization
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRound } from '../hooks/useRound';
import { useRoundStore } from '../stores/roundStore';
import { useStats } from '../hooks/useStats';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const HomeScreenNew: React.FC = () => {
  const navigation = useNavigation();
  const { round: activeRound, loading: roundLoading, reload: reloadRound } = useRound();
  const { stats, loading: statsLoading, refresh: refreshStats } = useStats();
  const { loadAllRounds } = useRoundStore();
  
  const [refreshing, setRefreshing] = React.useState(false);
  
  const loading = roundLoading || statsLoading;
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      reloadRound(),
      refreshStats(),
      loadAllRounds(),
    ]);
    setRefreshing(false);
  };
  
  const handleStartQuickRound = () => {
    navigation.navigate('Scoring' as never, {
      screen: 'RoundTracker',
      params: { quickStart: true }
    } as never);
  };
  
  const handleContinueRound = () => {
    if (activeRound) {
      navigation.navigate('Scoring' as never, {
        screen: 'RoundTracker',
        params: { roundId: activeRound.id }
      } as never);
    }
  };
  
  const handleGoToTournaments = () => {
    navigation.navigate('Tournaments' as never);
  };
  
  if (loading && !activeRound && !stats) {
    return <LoadingScreen message="Loading your golf data..." />;
  }
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/daddy_caddy_logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Daddy Caddy</Text>
          <Text style={styles.subtitle}>Your Golf Companion</Text>
        </View>
      </View>
      
      {/* Active Round Card */}
      {activeRound ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="golf-course" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Active Round</Text>
          </View>
          <Text style={styles.courseName}>{activeRound.courseName}</Text>
          {activeRound.tournamentName && (
            <Text style={styles.tournamentName}>🏆 {activeRound.tournamentName}</Text>
          )}
          <Text style={styles.dateText}>
            {activeRound.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <Button
            title="Continue Round"
            onPress={handleContinueRound}
            style={styles.continueButton}
          />
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="add-circle" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Start New Round</Text>
          </View>
          <Text style={styles.cardText}>
            Ready to hit the course? Start tracking a new round.
          </Text>
          <Button
            title="Quick Start"
            onPress={handleStartQuickRound}
            style={styles.startButton}
          />
        </View>
      )}
      
      {/* Statistics Card */}
      {stats && stats.totalRounds > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="bar-chart" size={24} color="#4CAF50" />
            <Text style={styles.cardTitle}>Your Statistics</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalRounds}</Text>
              <Text style={styles.statLabel}>Rounds</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.averageScore)}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.bestScore}</Text>
              <Text style={styles.statLabel}>Best Round</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(stats.fairwayAccuracy)}%</Text>
              <Text style={styles.statLabel}>Fairways</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Stats' as never)}
          >
            <Text style={styles.viewAllText}>View All Stats</Text>
            <Icon name="chevron-right" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Quick Actions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="explore" size={24} color="#4CAF50" />
          <Text style={styles.cardTitle}>Quick Actions</Text>
        </View>
        
        <TouchableOpacity style={styles.actionItem} onPress={handleGoToTournaments}>
          <FontAwesome5 name="trophy" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Tournaments</Text>
          <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Stats' as never)}
        >
          <FontAwesome5 name="chart-line" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Statistics</Text>
          <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Settings' as never)}
        >
          <Icon name="settings" size={20} color="#4CAF50" />
          <Text style={styles.actionText}>Settings</Text>
          <Icon name="chevron-right" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
      
      {/* Empty State */}
      {!activeRound && stats && stats.totalRounds === 0 && (
        <View style={styles.emptyState}>
          <FontAwesome5 name="golf-ball" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>Welcome to Daddy Caddy!</Text>
          <Text style={styles.emptyText}>
            Start your first round to begin tracking your golf game.
          </Text>
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
  content: {
    paddingBottom: 30,
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  courseName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  tournamentName: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  continueButton: {
    marginTop: 10,
  },
  startButton: {
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  statItem: {
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
    marginTop: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  viewAllText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 5,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 15,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreenNew;

