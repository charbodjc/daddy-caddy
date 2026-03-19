import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigationProp } from '../types/navigation';
import { useTournamentStore } from '../stores/tournamentStore';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import Hole from '../database/watermelon/models/Hole';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { database } from '../database/watermelon/database';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import { formatDateRange } from '../utils/dateFormatting';

interface RouteParams {
  tournamentId: string;
  tournamentName?: string;
}

const TournamentRoundsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { tournamentId, tournamentName: _tournamentName } = (route.params as RouteParams) || {};

  const { getTournamentRounds } = useTournamentStore();
  const { createRound } = useRoundStore();

  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [parByRound, setParByRound] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    loadTournamentAndRounds();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on tournamentId
  }, [tournamentId]);

  const loadTournamentAndRounds = async () => {
    if (!tournamentId) return;

    setLoading(true);
    setLoadError(null);
    try {
      const t = await database.collections.get<Tournament>('tournaments').find(tournamentId);
      setTournament(t);
      const tournamentRounds = await getTournamentRounds(tournamentId);
      setRounds(tournamentRounds);

      // Calculate actual par for each round from its holes
      const parMap: Record<string, number> = {};
      await Promise.all(
        tournamentRounds.map(async (r) => {
          const holes: Hole[] = await r.holes.fetch();
          const scoredHoles = holes.filter((h) => h.strokes > 0);
          if (scoredHoles.length > 0) {
            parMap[r.id] = scoredHoles.reduce((sum, h) => sum + h.par, 0);
          }
        }),
      );
      setParByRound(parMap);
    } catch (error) {
      console.error('Failed to load tournament/rounds:', error);
      setLoadError(error as Error);
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
      navigation.navigate('Scoring', {
        screen: 'RoundTracker',
        params: { roundId: round.id }
      } );
    } catch (error) {
      Alert.alert('Error', 'Failed to start round');
    } finally {
      setCreating(false);
    }
  };
  
  const handleRoundPress = useCallback((round: Round) => {
    navigation.navigate('RoundSummary', {
      roundId: round.id,
    } );
  }, [navigation]);

  const renderRoundItem = useCallback(({ item }: { item: Round }) => (
    <RoundCard round={item} totalPar={parByRound[item.id]} onPress={() => handleRoundPress(item)} />
  ), [handleRoundPress, parByRound]);

  const keyExtractor = useCallback((item: Round) => item.id, []);

  if (loading) {
    return <LoadingScreen message="Loading rounds..." />;
  }

  if (loadError || !tournament) {
    return <ErrorScreen error={loadError || new Error('Tournament not found')} onRetry={loadTournamentAndRounds} />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{tournament.name}</Text>
          <Text style={styles.headerSubtitle}>{tournament.courseName}</Text>
          <Text style={styles.headerDates}>
            {formatDateRange(tournament.startDate, tournament.endDate)}
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
          renderItem={renderRoundItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
};

// Round Card Component
const RoundCard: React.FC<{
  round: Round;
  totalPar?: number;
  onPress: () => void;
}> = React.memo(({ round, totalPar, onPress }) => {
  const getScoreDisplay = () => {
    if (!round.totalScore || !totalPar) return '--';
    const toPar = round.totalScore - totalPar;
    return formatScoreVsPar(toPar);
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
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

export default TournamentRoundsScreen;

