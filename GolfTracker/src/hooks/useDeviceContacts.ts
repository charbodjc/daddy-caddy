import { useState, useCallback, useRef } from 'react';
import * as Contacts from 'expo-contacts';
import { Alert, Linking } from 'react-native';
import type { SmsContact } from '../types';
import type { ContactsPermissionResponse } from 'expo-contacts';

type AccessPrivileges = ContactsPermissionResponse['accessPrivileges'] | null;

interface UseDeviceContactsResult {
  contacts: SmsContact[];
  loading: boolean;
  hasPermission: boolean | null;
  accessPrivileges: AccessPrivileges;
  loadContacts: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  expandAccess: () => Promise<void>;
}

export function useDeviceContacts(): UseDeviceContactsResult {
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [accessPrivileges, setAccessPrivileges] = useState<AccessPrivileges>(null);
  const loadRequestId = useRef(0);

  const loadContacts = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      setLoading(true);

      const permissionResponse = await Contacts.getPermissionsAsync();
      const granted = permissionResponse.status === 'granted';

      // Bail if a newer request has started
      if (requestId !== loadRequestId.current) return;

      setHasPermission(granted);
      setAccessPrivileges(permissionResponse.accessPrivileges ?? null);

      if (!granted) {
        setLoading(false);
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      // Bail if a newer request has started
      if (requestId !== loadRequestId.current) return;

      const contactsWithPhones: SmsContact[] = data
        .filter(
          (contact) =>
            contact.id &&
            contact.phoneNumbers &&
            contact.phoneNumbers.length > 0,
        )
        .map((contact) => {
          const mobileNumber = contact.phoneNumbers?.find(
            (phone) =>
              phone.label?.toLowerCase().includes('mobile') ||
              phone.label?.toLowerCase().includes('cell') ||
              phone.label?.toLowerCase().includes('iphone'),
          );

          const phoneNumber =
            mobileNumber?.number || contact.phoneNumbers?.[0]?.number || '';

          return {
            id: contact.id ?? '',
            name: contact.name || 'Unknown',
            phoneNumber,
          };
        })
        .filter((c) => c.phoneNumber.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));

      setContacts(contactsWithPhones);
    } catch {
      Alert.alert('Error', 'Failed to load contacts from your phone');
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const permissionResponse = await Contacts.requestPermissionsAsync();
    const granted = permissionResponse.status === 'granted';
    setHasPermission(granted);
    setAccessPrivileges(permissionResponse.accessPrivileges ?? null);

    if (granted) {
      await loadContacts();
    } else {
      Alert.alert(
        'Permission Required',
        'Please grant contacts permission in your device Settings to manage SMS contacts.',
        [{ text: 'OK' }],
      );
    }

    return granted;
  }, [loadContacts]);

  const expandAccess = useCallback(async () => {
    try {
      // iOS 18+: present the native picker to grant access to additional contacts
      await Contacts.presentAccessPickerAsync();
      // Reload contacts after the picker is dismissed (user may have added more)
      await loadContacts();
    } catch {
      // Fallback for iOS < 18, Android, or if the picker is unavailable
      Alert.alert(
        'Update Contact Access',
        'Open Settings to change which contacts this app can access.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }
  }, [loadContacts]);

  return { contacts, loading, hasPermission, accessPrivileges, loadContacts, requestPermission, expandAccess };
}
