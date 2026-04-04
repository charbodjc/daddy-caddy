import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActionSheetIOS,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../components/common/ScreenHeader';
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

import * as ImagePicker from 'expo-image-picker';
import RNFS from 'react-native-fs';

const GolfersScreen: React.FC = () => {
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
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
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
    setAvatarUri(golfer.avatarUri || null);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingGolfer || !name.trim()) return;
    setSaving(true);
    try {
      const savedUri = await persistAvatar(avatarUri, editingGolfer.id);
      await updateGolfer(editingGolfer.id, {
        name: name.trim(),
        avatarUri: savedUri,
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
      const trimmedName = name.trim();
      // Create golfer first to get the ID, then persist avatar
      const newGolfer = await createGolfer({ name: trimmedName });
      const savedUri = await persistAvatar(avatarUri, newGolfer.id);
      if (savedUri) {
        await updateGolfer(newGolfer.id, { avatarUri: savedUri });
      }
      setName('');
      setAvatarUri(null);
      setAddModalVisible(false);
      Alert.alert(
        'Golfer Created',
        `Would you like to add SMS contacts for ${trimmedName}?`,
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Add Contacts',
            onPress: () => navigation.navigate('GolferContacts', {
              golferId: newGolfer.id,
              golferName: trimmedName,
            }),
          },
        ],
      );
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

  /** Copy a picked image to a persistent location and return the saved URI. */
  const persistAvatar = async (uri: string | null, golferId: string): Promise<string | null> => {
    const avatarDir = `${RNFS.DocumentDirectoryPath}/avatars`;
    if (!uri) {
      // Clean up existing avatar file when removed
      try {
        const files = await RNFS.readDir(avatarDir).catch(() => []);
        for (const f of files) {
          if (f.name.startsWith(golferId)) await RNFS.unlink(f.path);
        }
      } catch { /* ignore cleanup errors */ }
      return null;
    }
    // If already in our avatar directory, skip copy
    if (uri.startsWith(avatarDir)) return uri;
    await RNFS.mkdir(avatarDir);
    const ext = uri.split('.').pop() || 'jpg';
    const dest = `${avatarDir}/${golferId}.${ext}`;
    // Remove old avatar file if format changed
    try {
      const files = await RNFS.readDir(avatarDir).catch(() => []);
      for (const f of files) {
        if (f.name.startsWith(golferId) && f.path !== dest) await RNFS.unlink(f.path);
      }
    } catch { /* ignore cleanup errors */ }
    await RNFS.copyFile(uri, dest);
    return dest;
  };

  const pickImageFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const showImagePicker = () => {
    if (Platform.OS === 'ios') {
      const options = avatarUri
        ? ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel']
        : ['Take Photo', 'Choose from Library', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: avatarUri ? 2 : undefined },
        (index) => {
          if (index === 0) takePhoto();
          else if (index === 1) pickImageFromLibrary();
          else if (index === 2 && avatarUri) setAvatarUri(null);
        },
      );
    } else {
      Alert.alert('Change Photo', undefined, [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImageFromLibrary },
        ...(avatarUri ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setAvatarUri(null) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
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

  const dismissModal = () => {
    setEditModalVisible(false);
    setAddModalVisible(false);
    setName('');
    setAvatarUri(null);
  };

  const renderGolferForm = (onSave: () => void, title: string) => (
    <View style={styles.modalOverlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismissModal}>
        <View style={styles.modalBackdrop} />
      </Pressable>
      <KeyboardAvoidingView
        style={styles.modalOverlayInner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentInner}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
        <Text style={styles.modalTitle}>{title}</Text>

        <TouchableOpacity
          style={styles.avatarPicker}
          onPress={showImagePicker}
          accessibilityRole="button"
          accessibilityLabel="Change photo"
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>{'\u{1F3CC}\u{FE0F}'}</Text>
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Icon name="camera-alt" size={16} color="#fff" />
          </View>
        </TouchableOpacity>

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

        {editingGolfer && (
          <TouchableOpacity
            style={styles.smsContactsButton}
            onPress={() => handleManageContacts(editingGolfer)}
            accessibilityRole="button"
            accessibilityLabel={`SMS Contacts, ${getContactCount(editingGolfer)} configured, tap to edit`}
          >
            <Icon name="sms" size={22} color="#2E7D32" />
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
              setAvatarUri(null);
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
    </View>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Manage Golfers" leftAction="back" />

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
            <GolferAvatar name={golfer.name} color={golfer.color} emoji={golfer.emoji} avatarUri={golfer.avatarUri} size={44} />
            <View style={styles.golferInfo}>
              <Text style={styles.golferName}>
                {golfer.name}
                {golfer.isDefault && <Text style={styles.defaultBadge}> (Default)</Text>}
              </Text>
              <Text style={styles.golferMeta}>
                {roundCounts[golfer.id] ?? 0} round{(roundCounts[golfer.id] ?? 0) !== 1 ? 's' : ''}
              </Text>
              {getContactCount(golfer) > 0 && (
                <View style={styles.smsCountRow}>
                  <Icon name="sms" size={14} color="#2E7D32" />
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
            setAvatarUri(null);
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlayInner: {
    flex: 1,
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
  avatarPicker: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c8e6c9',
    borderStyle: 'dashed',
  },
  avatarEmoji: {
    fontSize: 44,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
    color: '#2E7D32',
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
