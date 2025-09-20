import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import DatabaseService from '../services/database';
import { Tournament } from '../types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

const TournamentsScreen = () => {
  const navigation = useNavigation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      const tournamentsList = await DatabaseService.getTournaments();
      setTournaments(tournamentsList);
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  };

  const openAddModal = () => {
    setName('');
    setCourseName('');
    setStartDate(new Date());
    setEndDate(new Date());
    setModalVisible(true);
  };

  const saveTournament = async () => {
    if (!name.trim() || !courseName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    try {
      const tournament: Tournament = {
        id: Date.now().toString(),
        name: name.trim(),
        courseName: courseName.trim(),
        startDate,
        endDate,
        rounds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await DatabaseService.saveTournament(tournament);
      setModalVisible(false);
      loadTournaments();
      
      Alert.alert('Success', 'Tournament created successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save tournament');
      console.error('Save tournament error:', error);
    }
  };

  const startRound = (tournament: Tournament) => {
    navigation.navigate('RoundTracker' as never, {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    } as never);
  };

  const formatDateRange = (start: Date, end: Date) => {
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    if (start.toDateString() === end.toDateString()) {
      return end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    return `${startStr} - ${endStr}`;
  };

  const renderTournament = ({ item }: { item: Tournament }) => {
    const isActive = new Date() >= item.startDate && new Date() <= item.endDate;
    const isPast = new Date() > item.endDate;
    
    return (
      <TouchableOpacity
        style={styles.tournamentCard}
        onPress={() => startRound(item)}
      >
        <View style={styles.tournamentHeader}>
          <Icon 
            name="emoji-events" 
            size={24} 
            color={isActive ? '#4CAF50' : isPast ? '#999' : '#FF9800'}
          />
          <View style={styles.tournamentInfo}>
            <Text style={styles.tournamentName}>{item.name}</Text>
            <Text style={styles.courseName}>{item.courseName}</Text>
            <Text style={styles.dateRange}>{formatDateRange(item.startDate, item.endDate)}</Text>
          </View>
        </View>
        
        <View style={styles.tournamentStats}>
          <View style={styles.statBadge}>
            <Text style={styles.statCount}>{item.rounds.length}</Text>
            <Text style={styles.statLabel}>Rounds</Text>
          </View>
          
          {isActive && (
            <View style={[styles.statusBadge, styles.activeBadge]}>
              <Text style={styles.statusText}>Active</Text>
            </View>
          )}
          {!isActive && !isPast && (
            <View style={[styles.statusBadge, styles.upcomingBadge]}>
              <Text style={styles.statusText}>Upcoming</Text>
            </View>
          )}
          {isPast && (
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => startRound(item)}
        >
          <Icon name="play-arrow" size={20} color="#fff" />
          <Text style={styles.playButtonText}>Track Round</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tournaments</Text>
        <Text style={styles.subtitle}>Track your tournament rounds</Text>
      </View>

      {tournaments.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="emoji-events" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>No tournaments yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a tournament to track multiple rounds
          </Text>
          <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
            <Icon name="add" size={24} color="#fff" />
            <Text style={styles.addFirstButtonText}>Create Tournament</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tournaments}
          renderItem={renderTournament}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {tournaments.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={openAddModal}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Add Tournament Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Tournament</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tournament Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Summer Championship"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Course Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Pine Valley Golf Club"
                  value={courseName}
                  onChangeText={setCourseName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.dateGroup}>
                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Icon name="calendar-today" size={20} color="#666" />
                    <Text style={styles.dateText}>
                      {startDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dateInput}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Icon name="calendar-today" size={20} color="#666" />
                    <Text style={styles.dateText}>
                      {endDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showStartPicker && Platform.OS === 'ios' && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}

              {showEndPicker && Platform.OS === 'ios' && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveTournament}
                >
                  <Icon name="check" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  listContainer: {
    padding: 15,
  },
  tournamentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tournamentHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  tournamentInfo: {
    flex: 1,
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  courseName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  dateRange: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  tournamentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 15,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
  },
  statCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  upcomingBadge: {
    backgroundColor: '#FFF3E0',
  },
  completedBadge: {
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addFirstButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateGroup: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  dateInput: {
    flex: 1,
  },
  dateButton: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default TournamentsScreen;
