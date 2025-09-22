import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import DatabaseService from '../services/database';

const SettingsScreen = () => {
  const [groupRecipients, setGroupRecipients] = useState('');
  const [savedValue, setSavedValue] = useState('');

  useEffect(() => {
    (async () => {
      const raw = await DatabaseService.getPreference('default_sms_group');
      setGroupRecipients(raw || '');
      setSavedValue(raw || '');
    })();
  }, []);

  const normalize = (value: string) => {
    return value
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .join(', ');
  };

  const save = async () => {
    try {
      const normalized = normalize(groupRecipients);
      await DatabaseService.setPreference('default_sms_group', normalized);
      setSavedValue(normalized);
      Alert.alert('Saved', 'Default SMS group updated');
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Settings</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="sms" size={18} color="#4CAF50" />
            <Text style={styles.cardTitle}>Default SMS Group</Text>
          </View>
          <Text style={styles.description}>
            Enter the recipients for your golf notifications. You can paste a group message header
            (comma or newline separated) like: +15551234567, +15559876543
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="+1 555-123-4567, +1 555-987-6543"
            value={groupRecipients}
            onChangeText={setGroupRecipients}
            autoCapitalize="none"
            keyboardType="default"
          />
          <Text style={styles.helper}>Saved: {savedValue || 'None'}</Text>
          <TouchableOpacity style={styles.saveButton} onPress={save}>
            <Icon name="save" size={16} color="#fff" />
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  description: { color: '#666', fontSize: 13 },
  textArea: {
    minHeight: 100,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  helper: { color: '#999', fontSize: 12 },
  saveButton: { backgroundColor: '#4CAF50', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default SettingsScreen;


