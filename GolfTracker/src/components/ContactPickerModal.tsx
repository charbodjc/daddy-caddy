import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';

interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
}

interface ContactPickerModalProps {
  visible: boolean;
  contacts: Contact[];
  selectedContactIds: Set<string>;
  onClose: () => void;
  onSave: (selectedIds: Set<string>) => void;
}

const ContactPickerModal: React.FC<ContactPickerModalProps> = ({
  visible,
  contacts,
  selectedContactIds,
  onClose,
  onSave,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelected, setLocalSelected] = useState(new Set(selectedContactIds));

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phoneNumber.includes(searchQuery)
  );

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(localSelected);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setLocalSelected(newSelected);
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelected(new Set(selectedContactIds));
    onClose();
  };

  const selectAll = () => {
    setLocalSelected(new Set(filteredContacts.map((c) => c.id)));
  };

  const clearAll = () => {
    setLocalSelected(new Set());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
            <Icon name="times" size={20} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Contacts</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
            <Icon name="check" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Icon name="search" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="times-circle" size={16} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionBar}>
          <Text style={styles.countText}>
            {localSelected.size} of {contacts.length} selected
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>Select All</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={styles.actionButton}>
              <Text style={[styles.actionButtonText, styles.clearText]}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = localSelected.has(item.id);
            return (
              <TouchableOpacity
                style={[styles.contactRow, isSelected && styles.contactRowSelected]}
                onPress={() => toggleContact(item.id)}
              >
                <View style={styles.contactContent}>
                  <Icon
                    name="user"
                    size={16}
                    color={isSelected ? '#4CAF50' : '#666'}
                  />
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Icon name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="search" size={48} color="#ddd" />
              <Text style={styles.emptyStateText}>No contacts found</Text>
              {searchQuery.length > 0 && (
                <Text style={styles.emptyStateSubtext}>
                  Try a different search term
                </Text>
              )}
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    padding: 8,
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clearText: {
    color: '#f44336',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactRowSelected: {
    backgroundColor: '#f1f8f4',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 4,
  },
});

export default ContactPickerModal;

