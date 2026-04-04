import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Tournament from '../../database/watermelon/models/Tournament';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDateRange } from '../../utils/dateFormatting';
import { GolferAvatar } from '../golfer/GolferAvatar';
import type { GolferInfo } from '../../types';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  roundCount?: number;
  golfers?: GolferInfo[];
}

const MAX_VISIBLE_AVATARS = 4;

export const TournamentCard: React.FC<TournamentCardProps> = React.memo(({
  tournament,
  onPress,
  onEdit,
  onDelete,
  roundCount = 0,
  golfers,
}) => {
  const dateRange = formatDateRange(tournament.startDate, tournament.endDate);
  const visibleGolfers = golfers?.slice(0, MAX_VISIBLE_AVATARS) ?? [];
  const overflowCount = (golfers?.length ?? 0) - MAX_VISIBLE_AVATARS;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${tournament.name} at ${tournament.courseName}, ${roundCount} ${roundCount === 1 ? 'round' : 'rounds'}${golfers?.length ? `, ${golfers.length} golfers` : ''}`}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name="emoji-events" size={28} color="#2E7D32" />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{tournament.name}</Text>
          <Text style={styles.courseName}>{tournament.courseName}</Text>
        </View>
        {(onEdit || onDelete) && (
          <View style={styles.actions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onEdit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Edit tournament"
                accessibilityRole="button"
              >
                <Icon name="edit" size={20} color="#666" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Delete tournament"
                accessibilityRole="button"
              >
                <Icon name="delete" size={20} color="#f44336" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {visibleGolfers.length > 0 && (
        <View style={styles.golferAvatars}>
          {visibleGolfers.map((golfer, index) => (
            <View
              key={golfer.id}
              style={[styles.avatarWrapper, index > 0 && { marginLeft: -8 }]}
            >
              <GolferAvatar
                name={golfer.name}
                color={golfer.color}
                emoji={golfer.emoji}
                avatarUri={golfer.avatarUri}
                size={28}
              />
            </View>
          ))}
          {overflowCount > 0 && (
            <View
              style={styles.overflowBadge}
              accessibilityLabel={`${overflowCount} more ${overflowCount === 1 ? 'golfer' : 'golfers'}`}
            >
              <Text style={styles.overflowText}>+{overflowCount}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Icon name="calendar-today" size={14} color="#666" />
          <Text style={styles.dateText}>{dateRange}</Text>
        </View>

        <View style={styles.roundsContainer}>
          <Icon name="golf-course" size={14} color="#666" />
          <Text style={styles.roundsText}>
            {roundCount} {roundCount === 1 ? 'Round' : 'Rounds'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

TournamentCard.displayName = 'TournamentCard';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  actionButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  courseName: {
    fontSize: 14,
    color: '#666',
  },
  golferAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 4,
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
  },
  overflowBadge: {
    marginLeft: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overflowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  roundsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundsText: {
    fontSize: 13,
    color: '#666',
  },
});

