/**
 * TournamentRoundsScreenNew.tsx
 * 
 * Migration template for Tournament Rounds screen.
 * Shows all rounds for a specific tournament.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, CompositeNavigationProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTournamentStore } from '../stores/tournamentStore';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { TournamentStackParamList, ScoringStackParamList } from '../types/navigation';

type TournamentRoundsScreenNavigationProp = CompositeNavigationProp<
  StackNavigationProp<TournamentStackParamList, 'TournamentRounds'>,
  StackNavigationProp<ScoringStackParamList>
>;
type TournamentRoundsScreenRouteProp = RouteProp<TournamentStackParamList, 'TournamentRounds'>;

const TournamentRoundsScreenNew: React.FC = () => {
  const navigation = useNavigation<TournamentRoundsScreenNavigationProp>();
  const route = useRoute<TournamentRoundsScreenRouteProp>();
  const { tournamentId, tournamentName } = route.params;
  
  const { getTournamentRounds, getTournament } = useTournamentStore();
  const { createRound } = useRoundStore();
  
  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  
  React.useEffect(() => {
    loadData();
  }, [tournamentId]);
  
  const loadData = async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    try {
      const [tournamentData, tournamentRounds] = await Promise.all([
        getTournament(tournamentId),
        getTournamentRounds(tournamentId),
      ]);
      setTournament(tournamentData);
      setRounds(tournamentRounds);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartNewRound = async () => {
    if (!tournament) return;
    setCreating(true);
    
    try {
      const round = await createRound({
        courseName: tournament.courseName,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
      });
      
      // Navigate to round tracker
      // Note: Cannot navigate to Scoring stack from Tournament stack
      // User will need to go to Scoring tab manually
      Alert.alert('Round Created', 'Go to the Scoring tab to start tracking your round.');
    } catch (error) {
      Alert.alert('Error', 'Failed to start round');
    } finally {
      setCreating(false);
    }
  };
  
  const handleRoundPress = (round: Round) => {
    navigation.navigate('RoundSummary', {
      roundId: round.id,
    });
  };
  
  if (!tournament) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Tournament not found</Text>
      </View>
    );
  }
  
  if (loading) {
    return <LoadingScreen message="Loading rounds..." />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{tournament.name}</Text>
          <Text style={styles.headerSubtitle}>{tournament.courseName}</Text>
          <Text style={styles.headerDates}>
            {format(tournament.startDate, 'MMM d')} - {format(tournament.endDate, 'MMM d, yyyy')}
          </Text>
        </View>
      </View>
      
      {/* Round Count Summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {rounds.length} {rounds.length === 1 ? 'Round' : 'Rounds'}
        </Text>
        <Button
          title="Start New Round"
          onPress={handleStartNewRound}
          loading={creating}
          style={styles.newRoundButton}
        />
      </View>
      
      {/* Rounds List */}
      {rounds.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="golf-course" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>No Rounds Yet</Text>
          <Text style={styles.emptyText}>
            Start your first round for this tournament
          </Text>
        </View>
      ) : (
        <FlatList
          data={rounds}
          renderItem={({ item }) => (
            <RoundCard round={item} onPress={() => handleRoundPress(item)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

// Round Card Component
const RoundCard: React.FC<{
  round: Round;
  onPress: () => void;
}> = React.memo(({ round, onPress }) => {
  const getScoreDisplay = () => {
    if (!round.totalScore) return '--';
    
    const par = 72; // Standard par, should calculate from holes
    const toPar = round.totalScore - par;
    return toPar > 0 ? `+${toPar}` : toPar === 0 ? 'E' : `${toPar}`;
  };
  
  return (
    <TouchableOpacity style={styles.roundCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.roundHeader}>
        <View>
          <Text style={styles.roundCourse}>{round.courseName}</Text>
          <Text style={styles.roundDate}>
            {format(round.date, 'EEEE, MMM d, yyyy')}
          </Text>
        </View>
        
        {round.totalScore && (
          <View style={styles.roundScore}>
            <Text style={styles.scoreValue}>{round.totalScore}</Text>
            <Text style={styles.scoreToPar}>{getScoreDisplay()}</Text>
          </View>
        )}
      </View>
      
      {round.isFinished && (
        <View style={styles.statusBadge}>
          <Icon name="check-circle" size={16} color="#4CAF50" />
          <Text style={styles.statusText}>Completed</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

RoundCard.displayName = 'RoundCard';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  headerDates: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summary: {
    backgroundColor: '#fff',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  newRoundButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  list: {
    padding: 15,
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
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    padding: 20,
  },
  roundCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roundCourse: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roundDate: {
    fontSize: 14,
    color: '#666',
  },
  roundScore: {
    alignItems: 'center',
    backgroundColor: '#f0f9f0',
    padding: 12,
    borderRadius: 8,
    minWidth: 70,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreToPar: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default TournamentRoundsScreenNew;

