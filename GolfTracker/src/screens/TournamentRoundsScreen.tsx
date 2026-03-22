import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AppNavigationProp } from '../types/navigation';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useTournamentStore } from '../stores/tournamentStore';
import { useGolferStore } from '../stores/golferStore';
import { useRoundStore } from '../stores/roundStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import { GolferAvatar } from '../components/golfer/GolferAvatar';
import Tournament from '../database/watermelon/models/Tournament';
import Round from '../database/watermelon/models/Round';
import Golfer from '../database/watermelon/models/Golfer';
import Hole from '../database/watermelon/models/Hole';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { format } from 'date-fns';
import { database } from '../database/watermelon/database';
import { formatScoreVsPar } from '../utils/scoreCalculations';
import { formatDateRange } from '../utils/dateFormatting';
import { parseTournamentGolferIds } from '../utils/tournamentGolfers';
import { Q } from '@nozbe/watermelondb';
import type { GolferInfo } from '../types';

interface RouteParams {
  tournamentId: string;
}

const TournamentRoundsScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { tournamentId } = (route.params as RouteParams) || {};

  const { getTournamentRounds, getTournamentGolfers, updateTournamentGolfers } = useTournamentStore();
  const { golfers: allGolfers, loadGolfers } = useGolferStore();
  const { createRound } = useRoundStore();

  const [tournament, setTournament] = React.useState<Tournament | null>(null);
  const [rounds, setRounds] = React.useState<Round[]>([]);
  const [tournamentGolfers, setTournamentGolfers] = React.useState<Golfer[]>([]);
  const [golferLookup, setGolferLookup] = React.useState<Record<string, GolferInfo>>({});
  const [parByRound, setParByRound] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | null>(null);

  // Edit golfers modal state
  const [editGolfersVisible, setEditGolfersVisible] = useState(false);
  const [editGolferIds, setEditGolferIds] = useState<string[]>([]);
  const [savingGolfers, setSavingGolfers] = useState(false);

  // Round-start golfer picker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedGolferId, setSelectedGolferId] = useState<string | null>(null);

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

      const [tournamentRounds, golfers] = await Promise.all([
        getTournamentRounds(tournamentId),
        getTournamentGolfers(tournamentId),
      ]);
      setRounds(tournamentRounds);
      setTournamentGolfers(golfers);

      // Build golfer lookup from tournament golfers
      const lookup: Record<string, GolferInfo> = {};
      for (const g of golfers) {
        lookup[g.id] = { id: g.id, name: g.name, color: g.color, emoji: g.emoji };
      }

      // Also fetch golfers from rounds that aren't in the tournament list
      // (e.g., golfer removed from tournament after round was created)
      const roundGolferIds = tournamentRounds
        .map((r) => r.golferId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0 && !lookup[id]);
      const uniqueRoundGolferIds = [...new Set(roundGolferIds)];
      if (uniqueRoundGolferIds.length > 0) {
        const extraGolfers = await database.collections
          .get<Golfer>('golfers')
          .query(Q.where('id', Q.oneOf(uniqueRoundGolferIds)))
          .fetch();
        for (const g of extraGolfers) {
          lookup[g.id] = { id: g.id, name: g.name, color: g.color, emoji: g.emoji };
        }
      }
      setGolferLookup(lookup);

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
    } catch (err) {
      console.error('Failed to load tournament/rounds:', err);
      setLoadError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // --- Edit Golfers ---

  const handleOpenEditGolfers = useCallback(async () => {
    await loadGolfers();
    if (tournament) {
      setEditGolferIds(parseTournamentGolferIds(tournament.golferIdsRaw));
    }
    setEditGolfersVisible(true);
  }, [loadGolfers, tournament]);

  const toggleEditGolfer = useCallback((golferId: string) => {
    setEditGolferIds((prev) =>
      prev.includes(golferId)
        ? prev.filter((id) => id !== golferId)
        : [...prev, golferId],
    );
  }, []);

  const handleSaveGolfers = async () => {
    if (!tournamentId) return;
    setSavingGolfers(true);
    try {
      await updateTournamentGolfers(tournamentId, editGolferIds);
      setEditGolfersVisible(false);
      await loadTournamentAndRounds();
    } catch {
      Alert.alert('Error', 'Failed to update golfers');
    } finally {
      setSavingGolfers(false);
    }
  };

  // --- Start New Round ---

  const handleStartNewRound = async () => {
    if (!tournament) return;

    if (tournamentGolfers.length === 0) {
      // Legacy tournament or no golfers — use active golfer (existing behavior)
      await startRound();
    } else if (tournamentGolfers.length === 1) {
      // Single golfer — auto-select
      await startRound(tournamentGolfers[0].id);
    } else {
      // Multiple golfers — show picker
      setSelectedGolferId(null);
      setPickerVisible(true);
    }
  };

  const handleConfirmPicker = async () => {
    if (!selectedGolferId) return;
    setPickerVisible(false);
    await startRound(selectedGolferId);
  };

  const startRound = async (golferId?: string) => {
    if (!tournament) return;
    setCreating(true);

    try {
      const round = await createRound({
        courseName: tournament.courseName,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        golferId,
      });

      navigation.navigate('Scoring', {
        screen: 'RoundTracker',
        params: { roundId: round.id },
      });
    } catch {
      Alert.alert('Error', 'Failed to start round');
    } finally {
      setCreating(false);
    }
  };

  const handleRoundPress = useCallback((round: Round) => {
    navigation.navigate('RoundSummary', {
      roundId: round.id,
    });
  }, [navigation]);

  const renderRoundItem = useCallback(({ item }: { item: Round }) => (
    <RoundCard
      round={item}
      totalPar={parByRound[item.id]}
      golfer={item.golferId ? golferLookup[item.golferId] : undefined}
      onPress={() => handleRoundPress(item)}
    />
  ), [handleRoundPress, parByRound, golferLookup]);

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
      <ScreenHeader
        title={tournament.name}
        subtitle={tournament.courseName}
        leftAction="back"
        rightContent={
          <TouchableOpacity
            style={styles.editGolfersButton}
            onPress={handleOpenEditGolfers}
            accessibilityLabel="Edit tournament golfers"
            accessibilityRole="button"
          >
            <Icon name="group" size={22} color="#fff" />
          </TouchableOpacity>
        }
      >
        <Text style={styles.headerDates}>
          {formatDateRange(tournament.startDate, tournament.endDate)}
        </Text>
      </ScreenHeader>

      {/* Round Count Summary */}
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryText}>
            {rounds.length} {rounds.length === 1 ? 'Round' : 'Rounds'}
          </Text>
          {tournamentGolfers.length > 0 && (
            <Text style={styles.summaryGolfers}>
              {tournamentGolfers.length} {tournamentGolfers.length === 1 ? 'Golfer' : 'Golfers'}
            </Text>
          )}
        </View>
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

      {/* Edit Golfers Modal */}
      <Modal
        visible={editGolfersVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditGolfersVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tournament Golfers</Text>
              <TouchableOpacity
                onPress={() => setEditGolfersVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {allGolfers.length === 0 ? (
                <Text style={styles.noGolfersText}>
                  No golfers yet — add golfers in Settings
                </Text>
              ) : (
                allGolfers.map((golfer) => {
                  const isSelected = editGolferIds.includes(golfer.id);
                  return (
                    <TouchableOpacity
                      key={golfer.id}
                      style={[styles.golferRow, isSelected && styles.golferRowSelected]}
                      onPress={() => toggleEditGolfer(golfer.id)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={golfer.name}
                    >
                      <GolferAvatar
                        name={golfer.name}
                        color={golfer.color}
                        emoji={golfer.emoji}
                        size={36}
                      />
                      <Text style={styles.golferRowName}>{golfer.name}</Text>
                      <Icon
                        name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                        size={24}
                        color={isSelected ? '#2E7D32' : '#ccc'}
                      />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => setEditGolfersVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Save"
                onPress={handleSaveGolfers}
                loading={savingGolfers}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Round-Start Golfer Picker Modal */}
      <Modal
        visible={pickerVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Score Round For</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {tournamentGolfers.map((golfer) => {
                const isSelected = selectedGolferId === golfer.id;
                return (
                  <TouchableOpacity
                    key={golfer.id}
                    style={[styles.golferRow, isSelected && styles.pickerRowSelected]}
                    onPress={() => setSelectedGolferId(golfer.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={golfer.name}
                  >
                    <GolferAvatar
                      name={golfer.name}
                      color={golfer.color}
                      emoji={golfer.emoji}
                      size={40}
                    />
                    <View style={styles.pickerGolferInfo}>
                      <Text style={styles.golferRowName}>{golfer.name}</Text>
                      {golfer.handicap !== undefined && golfer.handicap !== null && (
                        <Text style={styles.golferHandicap}>HCP {golfer.handicap}</Text>
                      )}
                    </View>
                    <Icon
                      name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={24}
                      color={isSelected ? '#2E7D32' : '#ccc'}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Button
              title="Start Round"
              onPress={handleConfirmPicker}
              loading={creating}
              style={styles.pickerStartButton}
              disabled={!selectedGolferId}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Round Card Component
const RoundCard: React.FC<{
  round: Round;
  totalPar?: number;
  golfer?: GolferInfo;
  onPress: () => void;
}> = React.memo(({ round, totalPar, golfer, onPress }) => {
  const getScoreDisplay = () => {
    if (!round.totalScore || !totalPar) return '--';
    const toPar = round.totalScore - totalPar;
    return formatScoreVsPar(toPar);
  };

  return (
    <TouchableOpacity
      style={styles.roundCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`Round by ${golfer?.name ?? 'Unknown'}, ${round.courseName}, ${format(round.date, 'MMM d, yyyy')}${round.totalScore ? `, score ${round.totalScore}` : ''}`}
      accessibilityRole="button"
    >
      <View style={styles.roundHeader}>
        <View style={styles.roundInfo}>
          {golfer && (
            <View style={styles.roundGolfer}>
              <GolferAvatar
                name={golfer.name}
                color={golfer.color}
                emoji={golfer.emoji}
                size={28}
              />
              <Text style={styles.roundGolferName}>{golfer.name}</Text>
            </View>
          )}
          <Text style={styles.roundDate}>
            {format(round.date, 'EEEE, MMM d, yyyy')}
          </Text>
        </View>

        {round.totalScore ? (
          <View style={styles.roundScore}>
            <Text style={styles.scoreValue}>{round.totalScore}</Text>
            <Text style={styles.scoreToPar}>{getScoreDisplay()}</Text>
          </View>
        ) : null}
      </View>

      {round.isFinished && (
        <View style={styles.statusBadge}>
          <Icon name="check-circle" size={16} color="#2E7D32" />
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
  editGolfersButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  summaryGolfers: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
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
  // Round Card
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
  roundInfo: {
    flex: 1,
    marginRight: 12,
  },
  roundGolfer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  roundGolferName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    color: '#2E7D32',
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
    color: '#2E7D32',
    fontWeight: '500',
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScroll: {
    flexGrow: 0,
  },
  noGolfersText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    gap: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  golferRowSelected: {
    backgroundColor: '#f0f9f0',
  },
  pickerRowSelected: {
    backgroundColor: '#f0f9f0',
    borderColor: '#2E7D32',
  },
  golferRowName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  pickerGolferInfo: {
    flex: 1,
  },
  golferHandicap: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
  },
  pickerStartButton: {
    marginTop: 16,
  },
});

export default TournamentRoundsScreen;
