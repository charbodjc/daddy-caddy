/**
 * SMSBottomSheet — Modal overlay for SMS preview and send.
 * Used for both mid-hole "Update" and hole-complete summary.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCORING_COLORS } from './colors';
import type { SmsContact } from '../../types';

interface SMSBottomSheetProps {
  visible: boolean;
  message: string;
  recipients: SmsContact[];
  onSend: () => void;
  onSkip: () => void;
}

export const SMSBottomSheet = React.memo(function SMSBottomSheet({
  visible,
  message,
  recipients,
  onSend,
  onSkip,
}: SMSBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay} accessibilityViewIsModal>
        <Pressable style={styles.backdrop} onPress={onSkip} accessible={false} importantForAccessibility="no" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={styles.title}>Send Update</Text>

          <View style={styles.preview}>
            <View style={styles.toRow}>
              <Text style={styles.toLabel}>To:</Text>
              <Text style={styles.toNames} numberOfLines={2}>
                {recipients.map(c => c.name).join(', ') || 'No recipients configured'}
              </Text>
            </View>
            <ScrollView style={styles.messageBox} nestedScrollEnabled>
              <Text style={styles.messageText}>{message}</Text>
            </ScrollView>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.sendBtn]}
              onPress={onSend}
              accessibilityLabel="Send SMS"
              accessibilityRole="button"
            >
              <Icon name="send" size={24} color={SCORING_COLORS.white} />
              <Text style={styles.actionText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.skipBtn]}
              onPress={onSkip}
              accessibilityLabel="Skip sending SMS"
              accessibilityRole="button"
            >
              <Icon name="skip-next" size={24} color={SCORING_COLORS.white} />
              <Text style={styles.actionText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: SCORING_COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  preview: {
    backgroundColor: SCORING_COLORS.bg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    maxHeight: 300,
  },
  toRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  toLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  toNames: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  messageBox: {
    minHeight: 80,
    maxHeight: 200,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    elevation: 2,
  },
  sendBtn: {
    backgroundColor: SCORING_COLORS.green,
  },
  skipBtn: {
    backgroundColor: SCORING_COLORS.skip,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: SCORING_COLORS.white,
  },
});
