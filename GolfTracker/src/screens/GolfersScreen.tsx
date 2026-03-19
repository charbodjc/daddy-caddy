import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { GolferAvatar } from '../components/golfer/GolferAvatar';
import { Button } from '../components/common/Button';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { useGolferStore, parseGolferContacts } from '../stores/golferStore';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { SettingsStackParamList } from '../types/navigation';
import { useStatsStore } from '../stores/statsStore';
import type Golfer from '../database/watermelon/models/Golfer';
import { database } from '../database/watermelon/database';
import Round from '../database/watermelon/models/Round';
import { Q } from '@nozbe/watermelondb';

const COLORS = [
  { hex: '#2E7D32', name: 'Green' },
  { hex: '#1565C0', name: 'Blue' },
  { hex: '#6A1B9A', name: 'Purple' },
  { hex: '#C62828', name: 'Red' },
  { hex: '#EF6C00', name: 'Orange' },
  { hex: '#00838F', name: 'Teal' },
  { hex: '#4E342E', name: 'Brown' },
  { hex: '#37474F', name: 'Grey' },
];

const GolfersScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<SettingsStackParamList>>();
  const {
    golfers,
    loading,
    loadGolfers,
    createGolfer,
    updateGolfer,
    deleteGolfer,
  } = useGolferStore();
  const { clearStats } = useStatsStore();

  const [roundCounts, setRoundCounts] = useState<Record<string, number>>({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingGolfer, setEditingGolfer] = useState<Golfer | null>(null);
  const [name, setName] = useState('');
  const [handicap, setHandicap] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadGolfers();
  }, [loadGolfers]);

  // Load round counts for each golfer
  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<string, number> = {};
      for (const golfer of golfers) {
        const count = await database.collections
          .get<Round>('rounds')
          .query(Q.where('golfer_id', golfer.id))
          .fetchCount();
        counts[golfer.id] = count;
      }
      setRoundCounts(counts);
    };
    if (golfers.length > 0) loadCounts();
  }, [golfers]);

  const handleEditGolfer = (golfer: Golfer) => {
    setEditingGolfer(golfer);
    setName(golfer.name);
    setHandicap(golfer.handicap !== undefined ? String(golfer.handicap) : '');
    setSelectedColor(golfer.color);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGolfer || !name.trim()) return;
    setSaving(true);
    try {
      const parsedHandicap = handicap ? parseFloat(handicap) : undefined;
      await updateGolfer(editingGolfer.id, {
        name: name.trim(),
        handicap: parsedHandicap,
        color: selectedColor,
      });
      setEditModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to update golfer');
    } finally {
      setSaving(false);
    }
  };

  const handleAddGolfer = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }
    setSaving(true);
    try {
      const parsedHandicap = handicap ? parseFloat(handicap) : undefined;
      await createGolfer({
        name: name.trim(),
        handicap: parsedHandicap,
        color: selectedColor,
      });
      setName('');
      setHandicap('');
      setSelectedColor(COLORS[0].hex);
      setAddModalVisible(false);
    } catch {
      Alert.alert('Error', 'Failed to add golfer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGolfer = (golfer: Golfer) => {
    if (golfer.isDefault) return;
    const count = roundCounts[golfer.id] || 0;
    Alert.alert(
      `Delete ${golfer.name}?`,
      `Their ${count} round${count !== 1 ? 's' : ''} will be reassigned to your default profile. This will affect your statistics.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGolfer(golfer.id);
              clearStats();
            } catch {
              Alert.alert('Error', 'Failed to delete golfer');
            }
          },
        },
      ],
    );
  };

  const handleManageContacts = (golfer: Golfer) => {
    setEditModalVisible(false);
    navigation.navigate('GolferContacts', {
      golferId: golfer.id,
      golferName: golfer.name,
    });
  };

  const contactCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const golfer of golfers) {
      counts[golfer.id] = parseGolferContacts(golfer.smsContactsRaw).length;
    }
    return counts;
  }, [golfers]);

  const getContactCount = (golfer: Golfer): number => contactCounts[golfer.id] ?? 0;

  if (loading && golfers.length === 0) {
    return <LoadingScreen message="Loading golfers..." />;
  }

  const renderGolferForm = (onSave: () => void, title: string) => (
    <KeyboardAvoidingView
      style={styles.modalOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.modalContent}
        contentContainerStyle={styles.modalContentInner}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={styles.modalTitle}>{title}</Text>

        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Golfer name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoFocus
          maxLength={50}
          accessibilityLabel="Golfer name"
        />

        <Text style={styles.fieldLabel}>Handicap (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 14.3"
          value={handicap}
          onChangeText={setHandicap}
          keyboardType="decimal-pad"
          accessibilityLabel="Handicap"
        />

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {COLORS.map(({ hex, name: colorName }) => (
            <TouchableOpacity
              key={hex}
              style={[
                styles.colorSwatch,
                { backgroundColor: hex },
                selectedColor === hex && styles.colorSwatchSelected,
              ]}
              onPress={() => setSelectedColor(hex)}
              accessibilityRole="button"
              accessibilityLabel={colorName}
              accessibilityState={{ selected: selectedColor === hex }}
            />
          ))}
        </View>

        {editingGolfer && (
          <TouchableOpacity
            style={styles.smsContactsButton}
            onPress={() => handleManageContacts(editingGolfer)}
            accessibilityRole="button"
            accessibilityLabel={`SMS Contacts, ${getContactCount(editingGolfer)} configured, tap to edit`}
          >
            <Icon name="sms" size={22} color="#4CAF50" />
            <View style={styles.smsContactsInfo}>
              <Text style={styles.smsContactsLabel}>SMS Contacts</Text>
              <Text style={styles.smsContactsCount}>
                {getContactCount(editingGolfer)} contact{getContactCount(editingGolfer) !== 1 ? 's' : ''} configured
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        )}

        <View style={styles.modalButtons}>
          <Button
            title="Cancel"
            onPress={() => {
              setEditModalVisible(false);
              setAddModalVisible(false);
              setName('');
              setHandicap('');
            }}
            variant="secondary"
            style={styles.modalButton}
          />
          <Button
            title="Save"
            onPress={onSave}
            loading={saving}
            style={styles.modalButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Golfers</Text>
      </View>

      <ScrollView style={styles.content}>
        {golfers.length === 1 && (
          <View style={styles.emptyPrompt}>
            <Icon name="group-add" size={40} color="#ccc" />
            <Text style={styles.emptyText}>
              Add golfers to track separate round histories
            </Text>
          </View>
        )}

        {golfers.map((golfer) => (
          <TouchableOpacity
            key={golfer.id}
            style={styles.golferItem}
            onPress={() => handleEditGolfer(golfer)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${golfer.name}`}
          >
            <GolferAvatar name={golfer.name} color={golfer.color} size={44} />
            <View style={styles.golferInfo}>
              <Text style={styles.golferName}>
                {golfer.name}
                {golfer.isDefault && <Text style={styles.defaultBadge}> (Default)</Text>}
              </Text>
              <Text style={styles.golferMeta}>
                {golfer.handicap !== undefined ? `Handicap: ${golfer.handicap}` : 'No handicap set'}
                {' · '}
                {roundCounts[golfer.id] ?? 0} round{(roundCounts[golfer.id] ?? 0) !== 1 ? 's' : ''}
              </Text>
              {getContactCount(golfer) > 0 && (
                <View style={styles.smsCountRow}>
                  <Icon name="sms" size={14} color="#4CAF50" />
                  <Text style={styles.smsCountText}>
                    {getContactCount(golfer)} SMS contact{getContactCount(golfer) !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
            {!golfer.isDefault && (
              <TouchableOpacity
                onPress={() => handleDeleteGolfer(golfer)}
                style={styles.deleteButton}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${golfer.name}`}
              >
                <Icon name="delete" size={22} color="#f44336" />
              </TouchableOpacity>
            )}
            <Icon name="chevron-right" size={24} color="#ccc" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Add Golfer"
          onPress={() => {
            setName('');
            setHandicap('');
            setSelectedColor(COLORS[0].hex);
            setAddModalVisible(true);
          }}
        />
      </View>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        {renderGolferForm(handleSaveEdit, 'Edit Golfer')}
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        {renderGolferForm(handleAddGolfer, 'Add Golfer')}
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
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  emptyPrompt: {
    alignItems: 'center',
    padding: 30,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  golferItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
    minHeight: 72,
  },
  golferInfo: {
    flex: 1,
  },
  golferName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  defaultBadge: {
    fontSize: 13,
    fontWeight: '400',
    color: '#767676',
  },
  golferMeta: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 11,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalContentInner: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSwatchSelected: {
    borderColor: '#333',
  },
  smsContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  smsContactsInfo: {
    flex: 1,
  },
  smsContactsLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  smsContactsCount: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
  },
  smsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  smsCountText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});

export default GolfersScreen;
