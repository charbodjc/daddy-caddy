/**
 * TournamentsScreenNew.tsx
 * 
 * Migration template for Tournaments screen using new architecture.
 * Replace old TournamentsScreen.tsx with this when ready.
 * 
 * Demonstrates:
 * - Tournament management with useTournamentStore
 * - TournamentCard component usage
 * - Modal for creating tournaments
 * - Empty state handling
 */

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTournaments } from '../hooks/useTournaments';
import { useTournamentStore } from '../stores/tournamentStore';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorScreen } from '../components/common/ErrorScreen';
import { Button } from '../components/common/Button';
import { TournamentCard } from '../components/tournament/TournamentCard';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import Tournament from '../database/watermelon/models/Tournament';
import { TournamentStackParamList } from '../types/navigation';

type TournamentsScreenNavigationProp = StackNavigationProp<TournamentStackParamList, 'TournamentsList'>;

const TournamentsScreenNew: React.FC = () => {
  const navigation = useNavigation<TournamentsScreenNavigationProp>();
  const { tournaments, loading, error, reload } = useTournaments();
  const { createTournament, deleteTournament } = useTournamentStore();
  
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
    } catch (error) {
      Alert.alert('Error', 'Failed to create tournament');
    } finally {
      setCreating(false);
    }
  };
  
  const handleDelete = (tournament: Tournament) => {
    Alert.alert(
      'Delete Tournament',
      `Are you sure you want to delete "${tournament.name}"? This will also delete all rounds in this tournament.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTournament(tournament.id);
              Alert.alert('Success', 'Tournament deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tournament');
            }
          },
        },
      ]
    );
  };
  
  const handleTournamentPress = async (tournament: Tournament) => {
    navigation.navigate('TournamentRounds', {
      tournamentId: tournament.id,
      tournamentName: tournament.name,
    });
  };
  
  if (loading) {
    return <LoadingScreen message="Loading tournaments..." />;
  }
  
  if (error) {
    return <ErrorScreen error={error} onRetry={reload} />;
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tournaments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
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
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              onPress={() => handleTournamentPress(item)}
              roundCount={0} // TODO: Calculate from rounds
            />
          )}
          keyExtractor={(item) => item.id}
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Tournament Name"
              value={formData.name}
              onChangeText={(name) => setFormData({ ...formData, name })}
              autoCapitalize="words"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Course Name"
              value={formData.courseName}
              onChangeText={(courseName) => setFormData({ ...formData, courseName })}
              autoCapitalize="words"
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
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

export default TournamentsScreenNew;

