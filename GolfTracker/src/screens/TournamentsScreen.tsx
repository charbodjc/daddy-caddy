import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../types/navigation';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useTournaments } from '../hooks/useTournaments';
import { useTournamentStore } from '../stores/tournamentStore';
import { useGolferStore } from '../stores/golferStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import { GolferAvatar } from '../components/golfer/GolferAvatar';
import { TournamentCard } from '../components/tournament/TournamentCard';
import Tournament from '../database/watermelon/models/Tournament';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { parseTournamentGolferIds } from '../utils/tournamentGolfers';
import { formatDateShort } from '../utils/dateFormatting';
import {
  TeeTimeMap,
  MAX_TOURNAMENT_ROUNDS,
  parseTournamentTeeTimes,
  formatTeeTime,
  parseTeeTimeToDate,
  formatDateAsTeeTime,
} from '../utils/tournamentTeeTimes';
import type { GolferInfo } from '../types';

const TournamentsScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { tournaments, loading, error, reload } = useTournaments();
  const { createTournament, updateTournament, deleteTournament } = useTournamentStore();
  const { golfers, loadGolfers, loading: golfersLoading } = useGolferStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    courseName: '',
    leaderboardUrl: '',
    startDate: new Date(),
    endDate: new Date(),
  });
  const [selectedGolferIds, setSelectedGolferIds] = useState<string[]>([]);
  const [numberOfRounds, setNumberOfRounds] = useState(1);
  const [teeTimes, setTeeTimes] = useState<TeeTimeMap>({});
  const [creating, setCreating] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTeeTimePicker, setShowTeeTimePicker] = useState<number | null>(null);

  // Load golfers for tournament card avatars and modal selection
  useEffect(() => {
    loadGolfers();
  }, [loadGolfers]);

  // Build golfer lookup for tournament cards
  const golferById = React.useMemo(() => {
    const map: Record<string, GolferInfo> = {};
    for (const g of golfers) {
      map[g.id] = { id: g.id, name: g.name, color: g.color, emoji: g.emoji, avatarUri: g.avatarUri };
    }
    return map;
  }, [golfers]);
  
  const resetForm = () => {
    setFormData({ name: '', courseName: '', leaderboardUrl: '', startDate: new Date(), endDate: new Date() });
    setSelectedGolferIds([]);
    setNumberOfRounds(1);
    setTeeTimes({});
    setEditingTournamentId(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowTeeTimePicker(null);
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.courseName.trim()) {
      Alert.alert('Error', 'Please enter tournament name and course name');
      return;
    }

    if (formData.endDate < formData.startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setCreating(true);

    try {
      if (editingTournamentId) {
        await updateTournament(editingTournamentId, {
          name: formData.name.trim(),
          courseName: formData.courseName.trim(),
          leaderboardUrl: formData.leaderboardUrl.trim() || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          golferIds: selectedGolferIds,
          numberOfRounds,
          teeTimes,
        });
      } else {
        await createTournament({
          name: formData.name.trim(),
          courseName: formData.courseName.trim(),
          leaderboardUrl: formData.leaderboardUrl.trim() || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          golferIds: selectedGolferIds,
          numberOfRounds,
          teeTimes,
        });
      }

      setModalVisible(false);
      resetForm();
    } catch {
      Alert.alert('Error', editingTournamentId ? 'Failed to update tournament' : 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = useCallback((tournament: Tournament) => {
    const ids = parseTournamentGolferIds(tournament.golferIdsRaw);
    setEditingTournamentId(tournament.id);
    setFormData({
      name: tournament.name,
      courseName: tournament.courseName,
      leaderboardUrl: tournament.leaderboardUrl || '',
      startDate: tournament.startDate,
      endDate: tournament.endDate,
    });
    setSelectedGolferIds(ids);
    setNumberOfRounds(tournament.numberOfRounds || 1);
    setTeeTimes(parseTournamentTeeTimes(tournament.teeTimesRaw));
    setModalVisible(true);
  }, []);

  const handleDelete = useCallback((tournament: Tournament) => {
    Alert.alert(
      'Delete Tournament?',
      `Delete "${tournament.name}"? All rounds in this tournament will also be deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTournament(tournament.id);
            } catch {
              Alert.alert('Error', 'Failed to delete tournament');
            }
          },
        },
      ],
    );
  }, [deleteTournament]);

  const toggleGolfer = useCallback((golferId: string) => {
    setSelectedGolferIds((prev) =>
      prev.includes(golferId)
        ? prev.filter((id) => id !== golferId)
        : [...prev, golferId],
    );
  }, []);

  const handleTournamentPress = useCallback((tournament: Tournament) => {
    navigation.navigate('TournamentRounds', {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    } );
  }, [navigation]);

  const renderTournamentItem = useCallback(({ item }: { item: Tournament }) => {
    const ids = parseTournamentGolferIds(item.golferIdsRaw);
    const cardGolfers = ids
      .map((id) => golferById[id])
      .filter((g): g is GolferInfo => g !== undefined);

    return (
      <TournamentCard
        tournament={item}
        onPress={() => handleTournamentPress(item)}
        onEdit={() => handleEdit(item)}
        onDelete={() => handleDelete(item)}
        roundCount={0}
        golfers={cardGolfers}
      />
    );
  }, [handleTournamentPress, handleEdit, handleDelete, golferById]);

  const tournamentKeyExtractor = useCallback((item: Tournament) => item.id, []);

  if (loading && !modalVisible) {
    return <LoadingScreen message="Loading tournaments..." />;
  }
  
  if (error) {
    return <ErrorScreen error={error} onRetry={reload} />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title="Tournaments"
        leftAction="menu"
        rightContent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => { resetForm(); setModalVisible(true); }}
            accessibilityLabel="Create tournament"
            accessibilityRole="button"
          >
            <Icon name="add" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />
      
      {/* Tournament List */}
      {tournaments.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="emoji-events" size={80} color="#ddd" />
          <Text style={styles.emptyTitle}>No Tournaments Yet</Text>
          <Text style={styles.emptyText}>
            Create a tournament to track multiple rounds in competition.
          </Text>
          <Button
            title="Create Tournament"
            onPress={() => { resetForm(); setModalVisible(true); }}
            style={styles.createButton}
          />
        </View>
      ) : (
        <FlatList
          data={tournaments}
          renderItem={renderTournamentItem}
          keyExtractor={tournamentKeyExtractor}
          contentContainerStyle={styles.list}
        />
      )}
      
      {/* Create Tournament Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); resetForm(); }}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingTournamentId ? 'Edit Tournament' : 'Create Tournament'}</Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); resetForm(); }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.input}
                placeholder="Tournament Name"
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(name) => setFormData({ ...formData, name })}
                autoCapitalize="words"
                accessibilityLabel="Tournament name"
              />

              <TextInput
                style={styles.input}
                placeholder="Golf Course Name"
                placeholderTextColor="#999"
                value={formData.courseName}
                onChangeText={(courseName) => setFormData({ ...formData, courseName })}
                autoCapitalize="words"
                accessibilityLabel="Course name"
              />

              <TextInput
                style={styles.input}
                placeholder="Leaderboard URL (optional)"
                placeholderTextColor="#999"
                value={formData.leaderboardUrl}
                onChangeText={(leaderboardUrl) => setFormData({ ...formData, leaderboardUrl })}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel="Leaderboard URL"
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartPicker(true)}
                    accessibilityLabel="Select start date"
                    accessibilityRole="button"
                  >
                    <Icon name="calendar-today" size={18} color="#2E7D32" />
                    <Text style={styles.dateButtonText}>
                      {formatDateShort(formData.startDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndPicker(true)}
                    accessibilityLabel="Select end date"
                    accessibilityRole="button"
                  >
                    <Icon name="calendar-today" size={18} color="#2E7D32" />
                    <Text style={styles.dateButtonText}>
                      {formatDateShort(formData.endDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showStartPicker && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={(_event, date) => {
                    setShowStartPicker(false);
                    if (date) setFormData((prev) => ({ ...prev, startDate: date }));
                  }}
                />
              )}
              {showEndPicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={(_event, date) => {
                    setShowEndPicker(false);
                    if (date) setFormData((prev) => ({ ...prev, endDate: date }));
                  }}
                />
              )}

              {/* Number of Rounds */}
              <View style={styles.roundsSection}>
                <Text style={styles.sectionLabel}>Number of Rounds</Text>
                <View style={styles.roundsRow} accessibilityRole="radiogroup" accessibilityLabel="Number of rounds">
                  {Array.from({ length: MAX_TOURNAMENT_ROUNDS }, (_, i) => i + 1).map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.roundsOption,
                        numberOfRounds === num && styles.roundsOptionSelected,
                      ]}
                      onPress={() => {
                        setNumberOfRounds(num);
                        // Clear tee times for rounds beyond the new count
                        setTeeTimes((prev) => {
                          const cleaned: TeeTimeMap = {};
                          for (let i = 1; i <= num; i++) {
                            if (prev[i]) cleaned[i] = prev[i];
                          }
                          return cleaned;
                        });
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: numberOfRounds === num }}
                      accessibilityLabel={`${num} round${num > 1 ? 's' : ''}`}
                    >
                      <Text
                        style={[
                          styles.roundsOptionText,
                          numberOfRounds === num && styles.roundsOptionTextSelected,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Tee Times */}
              <View style={styles.teeTimesSection}>
                <Text style={styles.sectionLabel}>Tee Times (optional)</Text>
                {Array.from({ length: numberOfRounds }, (_, i) => i + 1).map((roundNum) => (
                  <View key={roundNum} style={styles.teeTimeRow}>
                    <Text style={styles.teeTimeLabel}>Round {roundNum}</Text>
                    <TouchableOpacity
                      style={styles.teeTimeButton}
                      onPress={() => setShowTeeTimePicker(roundNum)}
                      accessibilityLabel={`Set tee time for round ${roundNum}`}
                      accessibilityRole="button"
                    >
                      <Icon name="schedule" size={18} color="#2E7D32" />
                      <Text style={styles.teeTimeButtonText}>
                        {teeTimes[roundNum]
                          ? formatTeeTime(teeTimes[roundNum])
                          : 'Not set'}
                      </Text>
                    </TouchableOpacity>
                    {teeTimes[roundNum] && (
                      <TouchableOpacity
                        style={styles.teeTimeClearButton}
                        onPress={() =>
                          setTeeTimes((prev) => {
                            const next = { ...prev };
                            delete next[roundNum];
                            return next;
                          })
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`Clear tee time for round ${roundNum}`}
                        accessibilityRole="button"
                      >
                        <Icon name="close" size={20} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {showTeeTimePicker !== null && (
                  <DateTimePicker
                    value={
                      teeTimes[showTeeTimePicker]
                        ? parseTeeTimeToDate(teeTimes[showTeeTimePicker], formData.startDate)
                        : formData.startDate
                    }
                    mode="datetime"
                    display="default"
                    onChange={(_event, date) => {
                      const roundNum = showTeeTimePicker;
                      setShowTeeTimePicker(null);
                      if (date && roundNum !== null) {
                        setTeeTimes((prev) => ({
                          ...prev,
                          [roundNum]: formatDateAsTeeTime(date),
                        }));
                      }
                    }}
                  />
                )}
              </View>

              {/* Golfer Selection */}
              <View style={styles.golferSection}>
                <View style={styles.golferSectionHeader}>
                  <Text style={styles.golferSectionTitle}>Golfers</Text>
                  {selectedGolferIds.length > 0 && (
                    <View style={styles.golferCountBadge}>
                      <Text style={styles.golferCountText}>{selectedGolferIds.length}</Text>
                    </View>
                  )}
                </View>

                {golfersLoading ? (
                  <ActivityIndicator size="small" color="#2E7D32" style={styles.golferLoading} />
                ) : golfers.length === 0 ? (
                  <Text style={styles.noGolfersText}>
                    No golfers yet — add golfers in Settings
                  </Text>
                ) : (
                  golfers.map((golfer) => {
                    const isSelected = selectedGolferIds.includes(golfer.id);
                    return (
                      <TouchableOpacity
                        key={golfer.id}
                        style={[styles.golferRow, isSelected && styles.golferRowSelected]}
                        onPress={() => toggleGolfer(golfer.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isSelected }}
                        accessibilityLabel={`${golfer.name}${golfer.isDefault ? ' (default)' : ''}`}
                      >
                        <GolferAvatar
                          name={golfer.name}
                          color={golfer.color}
                          emoji={golfer.emoji}
                          avatarUri={golfer.avatarUri}
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
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => { setModalVisible(false); resetForm(); }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title={editingTournamentId ? 'Save' : 'Create'}
                onPress={handleCreate}
                loading={creating}
                style={styles.modalButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 30,
  },
  createButton: {
    minWidth: 200,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '85%',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  dateField: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  roundsSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  roundsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roundsOption: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roundsOptionSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  roundsOptionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  roundsOptionTextSelected: {
    color: '#fff',
  },
  teeTimesSection: {
    marginBottom: 4,
  },
  teeTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  teeTimeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    width: 70,
  },
  teeTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 10,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  teeTimeButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  teeTimeClearButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  golferSection: {
    marginTop: 8,
  },
  golferSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  golferSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  golferCountBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  golferCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  golferLoading: {
    paddingVertical: 16,
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
  },
  golferRowSelected: {
    backgroundColor: '#f0f9f0',
  },
  golferRowName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
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
});

export default TournamentsScreen;

