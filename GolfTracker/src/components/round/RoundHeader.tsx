import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Round from '../../database/watermelon/models/Round';
import { formatScoreVsPar } from '../../utils/scoreCalculations';
import { formatDateShort } from '../../utils/dateFormatting';

interface RoundHeaderProps {
  round: Round;
  totalPar?: number;
  golferName?: string;
  onMenuPress?: () => void;
}

export const RoundHeader: React.FC<RoundHeaderProps> = React.memo(({ round, totalPar: totalParProp, golferName, onMenuPress }) => {
  const insets = useSafeAreaInsets();
  const toPar = (() => {
    if (!round.totalScore) return 0;
    const totalPar = totalParProp && totalParProp > 0 ? totalParProp : 72;
    return round.totalScore - totalPar;
  })();

  const scoreDisplay = round.totalScore != null && round.totalScore > 0 ? formatScoreVsPar(toPar) : '--';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      {onMenuPress && (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      <View style={styles.courseInfo}>
        {golferName && (
          <View style={styles.golferRow}>
            <Text style={styles.golferEmoji}>🏌️</Text>
            <Text style={styles.golferText}>{golferName}</Text>
          </View>
        )}
        <Text style={styles.courseName}>{round.courseName}</Text>
        {round.tournamentName && (
          <Text style={styles.tournamentName}>{round.tournamentName}</Text>
        )}
        <Text style={styles.date}>
          {formatDateShort(round.date)}
        </Text>
      </View>

      <View style={styles.scoreInfo}>
        <Text style={styles.scoreValue}>{scoreDisplay}</Text>
      </View>
    </View>
  );
});

RoundHeader.displayName = 'RoundHeader';

const styles = StyleSheet.create({
  container: {
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
  courseInfo: {
    flex: 1,
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  golferEmoji: {
    fontSize: 18,
  },
  golferText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  courseName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  tournamentName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scoreInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
});
