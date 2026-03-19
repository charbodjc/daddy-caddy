import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppNavigationProp } from '../types/navigation';
import { format } from 'date-fns';
import { useTournaments } from '../hooks/useTournaments';
import { useTournamentStore } from '../stores/tournamentStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
// Tournament type used via useTournaments hook
import { TournamentCard } from '../components/tournament/TournamentCard';
import Tournament from '../database/watermelon/models/Tournament';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';

const TournamentsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigationProp>();
  const { tournaments, loading, error, reload } = useTournaments();
  const { createTournament, deleteTournament: _deleteTournament } = useTournamentStore();
  
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    courseName: '',
    startDate: new Date(),
    endDate: new Date(),
  });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  
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
      });
      
      setModalVisible(false);
      setFormData({
        name: '',
        courseName: '',
        startDate: new Date(),
        endDate: new Date(),
      });
      
      Alert.alert('Success', 'Tournament created successfully');
    } catch {
      Alert.alert('Error', 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };

  const handleTournamentPress = useCallback(async (tournament: Tournament) => {
    navigation.navigate('TournamentRounds', {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    } );
  }, [navigation]);

  const renderTournamentItem = useCallback(({ item }: { item: Tournament }) => (
    <TournamentCard
      tournament={item}
      onPress={() => handleTournamentPress(item)}
      roundCount={0}
    />
  ), [handleTournamentPress]);

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
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityLabel="Create tournament"
          accessibilityRole="button"
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
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
            >
              <Icon name="event" size={20} color="#666" />
              <Text style={styles.dateInputText}>
                Start: {format(formData.startDate, 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndPicker(true)}
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
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuButton: {
    padding: 5,
    marginRight: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
});

export default TournamentsScreen;

