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
import { format } from 'date-fns';
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
import type { GolferInfo } from '../types';

const TournamentsScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { tournaments, loading, error, reload } = useTournaments();
  const { createTournament } = useTournamentStore();
  const { golfers, loadGolfers, loading: golfersLoading } = useGolferStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    courseName: '',
    startDate: new Date(),
    endDate: new Date(),
  });
  const [selectedGolferIds, setSelectedGolferIds] = useState<string[]>([]);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load golfers for tournament card avatars and modal selection
  useEffect(() => {
    loadGolfers();
  }, [loadGolfers]);

  // Build golfer lookup for tournament cards
  const golferById = React.useMemo(() => {
    const map: Record<string, { id: string; name: string; color: string; emoji?: string }> = {};
    for (const g of golfers) {
      map[g.id] = { id: g.id, name: g.name, color: g.color, emoji: g.emoji };
    }
    return map;
  }, [golfers]);
  
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
      await createTournament({
        name: formData.name.trim(),
        courseName: formData.courseName.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        golferIds: selectedGolferIds,
      });

      setModalVisible(false);
      setFormData({
        name: '',
        courseName: '',
        startDate: new Date(),
        endDate: new Date(),
      });
      setSelectedGolferIds([]);
      
      Alert.alert('Success', 'Tournament created successfully');
    } catch {
      Alert.alert('Error', 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

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
        roundCount={0}
        golfers={cardGolfers}
      />
    );
  }, [handleTournamentPress, golferById]);

  const tournamentKeyExtractor = useCallback((item: Tournament) => item.id, []);

  if (loading) {
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
            onPress={() => setModalVisible(true)}
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
            onPress={() => setModalVisible(true)}
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
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Tournament</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
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
                value={formData.name}
                onChangeText={(name) => setFormData({ ...formData, name })}
                autoCapitalize="words"
                accessibilityLabel="Tournament name"
              />

              <TextInput
                style={styles.input}
                placeholder="Course Name"
                value={formData.courseName}
                onChangeText={(courseName) => setFormData({ ...formData, courseName })}
                autoCapitalize="words"
                accessibilityLabel="Course name"
              />

              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`Start date: ${format(formData.startDate, 'MMM d, yyyy')}`}
                accessibilityHint="Opens date picker"
              >
                <Icon name="event" size={20} color="#666" />
                <Text style={styles.dateInputText}>
                  Start: {format(formData.startDate, 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
                accessibilityRole="button"
                accessibilityLabel={`End date: ${format(formData.endDate, 'MMM d, yyyy')}`}
                accessibilityHint="Opens date picker"
              >
                <Icon name="event" size={20} color="#666" />
                <Text style={styles.dateInputText}>
                  End: {format(formData.endDate, 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>

              {showStartPicker && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setFormData({ ...formData, startDate: date });
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setFormData({ ...formData, endDate: date });
                  }}
                />
              )}

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
                onPress={() => setModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Create"
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
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10,
  },
  dateInputText: {
    fontSize: 16,
    color: '#333',
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

