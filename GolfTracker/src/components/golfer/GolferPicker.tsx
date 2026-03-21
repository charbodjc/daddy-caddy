import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GolferAvatar } from './GolferAvatar';
import { Button } from '../common/Button';
import type Golfer from '../../database/watermelon/models/Golfer';

interface GolferPickerProps {
  golfers: Golfer[];
  selectedGolferId: string | null;
  onSelectGolfer: (id: string) => void;
  onCreateGolfer: (name: string) => Promise<void>;
  loading?: boolean;
}

export const GolferPicker: React.FC<GolferPickerProps> = ({
  golfers,
  selectedGolferId,
  onSelectGolfer,
  onCreateGolfer,
  loading = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setSaving(true);
    try {
      await onCreateGolfer(trimmed);
      setNewName('');
      setModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to create golfer');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {golfers.map((golfer) => {
          const isSelected = golfer.id === selectedGolferId;
          return (
            <TouchableOpacity
              key={golfer.id}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onSelectGolfer(golfer.id)}
              accessibilityRole="button"
              accessibilityLabel={`${golfer.name}${isSelected ? ', selected' : ''}`}
              accessibilityState={{ selected: isSelected }}
            >
              <GolferAvatar name={golfer.name} color={golfer.color} emoji={golfer.emoji} size={28} />
              <Text
                style={[styles.chipText, isSelected && styles.chipTextSelected]}
                numberOfLines={1}
              >
                {golfer.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Add golfer button — visually distinct */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Add golfer"
          accessibilityHint="Opens a form to create a new golfer"
        >
          <Icon name="add-circle" size={28} color="#2E7D32" />
        </TouchableOpacity>
      </ScrollView>

      {/* Create golfer modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Golfer</Text>
            <TextInput
              style={styles.input}
              placeholder="Golfer name"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
              autoFocus
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              accessibilityLabel="Golfer name"
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                onPress={() => { setModalVisible(false); setNewName(''); }}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Add"
                onPress={handleCreate}
                loading={saving}
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
  scrollView: {
    maxHeight: 56,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: 'center',
  },
  loadingContainer: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 48,
  },
  chipSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#f0f9f0',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    maxWidth: 80,
  },
  chipTextSelected: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#2E7D32',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});
