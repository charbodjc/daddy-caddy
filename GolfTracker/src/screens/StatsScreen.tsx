/**
 * StatsScreenNew.tsx
 * 
 * Migration template for Statistics screen.
 * Demonstrates: Statistics display, custom hooks, data visualization
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useStats } from '../hooks/useStats';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const StatsScreenNew: React.FC = () => {
  const { stats, loading, error, refresh } = useStats();
  const [refreshing, setRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  
  if (loading && !stats) {
    return <LoadingScreen message="Calculating statistics..." />;
  }
  
  if (error) {
    return <ErrorScreen error={error} onRetry={refresh} />;
  }
  
  if (!stats || stats.totalRounds === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Statistics</Text>
        </View>
        <View style={styles.emptyState}>
          <FontAwesome5 name="chart-line" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>No Statistics Yet</Text>
          <Text style={styles.emptyText}>
            Complete some rounds to see your statistics
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statistics</Text>
        <Text style={styles.headerSubtitle}>{stats.totalRounds} Rounds Played</Text>
      </View>
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Scoring Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scoring Summary</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Icon name="golf-course" size={24} color="#4CAF50" />}
              value={Math.round(stats.averageScore)}
              label="Avg Score"
            />
            <StatCard
              icon={<FontAwesome5 name="star" size={24} color="#FFD700" />}
              value={stats.bestScore}
              label="Best Round"
            />
            <StatCard
              icon={<Icon name="trending-down" size={24} color="#f44336" />}
              value={stats.worstScore}
              label="Worst Round"
            />
            <StatCard
              icon={<FontAwesome5 name="golf-ball" size={24} color="#4CAF50" />}
              value={Math.round(stats.averagePutts)}
              label="Avg Putts"
            />
          </View>
        </View>
        
        {/* Accuracy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accuracy</Text>
          
          <View style={styles.statsGrid}>
            <StatCard
              icon={<Icon name="flag" size={24} color="#4CAF50" />}
              value={`${Math.round(stats.fairwayAccuracy)}%`}
              label="Fairways Hit"
            />
            <StatCard
              icon={<Icon name="adjust" size={24} color="#4CAF50" />}
              value={`${Math.round(stats.girPercentage)}%`}
              label="Greens in Reg"
            />
          </View>
        </View>
        
        {/* Hole Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hole Performance</Text>
          
          <View style={styles.performanceList}>
            <PerformanceItem
              icon="🦅"
              label="Eagles or Better"
              value={stats.eaglesOrBetter}
              color="#FFD700"
            />
            <PerformanceItem
              icon="🐦"
              label="Birdies"
              value={stats.birdies}
              color="#FF0000"
            />
            <PerformanceItem
              icon="✅"
              label="Pars"
              value={stats.pars}
              color="#4CAF50"
            />
            <PerformanceItem
              icon="😐"
              label="Bogeys"
              value={stats.bogeys}
              color="#FFA500"
            />
            <PerformanceItem
              icon="😔"
              label="Double Bogey or Worse"
              value={stats.doubleBogeyOrWorse}
              color="#f44336"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Helper component for stat cards
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
}> = React.memo(({ icon, value, label }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
));

StatCard.displayName = 'StatCard';

// Helper component for performance items
const PerformanceItem: React.FC<{
  icon: string;
  label: string;
  value: number;
  color: string;
}> = React.memo(({ icon, label, value, color }) => (
  <View style={styles.performanceItem}>
    <Text style={styles.performanceIcon}>{icon}</Text>
    <Text style={styles.performanceLabel}>{label}</Text>
    <View style={[styles.performanceValueContainer, { backgroundColor: color }]}>
      <Text style={styles.performanceValue}>{value}</Text>
    </View>
  </View>
));

PerformanceItem.displayName = 'PerformanceItem';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 10,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  performanceList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performanceIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  performanceLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  performanceValueContainer: {
    minWidth: 40,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
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

export default StatsScreenNew;

