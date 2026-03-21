import React, { useState, useCallback } from 'react';
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
  const [showTotalScore, setShowTotalScore] = useState(false);

  const toggleScoreDisplay = useCallback(() => {
    setShowTotalScore((prev) => !prev);
  }, []);

  const hasScore = round.totalScore != null && round.totalScore > 0 && totalParProp;

  const toPar = (() => {
    if (!round.totalScore || !totalParProp || totalParProp <= 0) return 0;
    return round.totalScore - totalParProp;
  })();

  const scoreDisplay = hasScore
    ? (showTotalScore ? String(round.totalScore) : formatScoreVsPar(toPar))
    : '--';

  const scoreLabel = hasScore
    ? (showTotalScore ? 'total' : 'to par')
    : undefined;

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
        <Text style={styles.courseName}>{round.courseName}</Text>
        {round.tournamentName && (
          <Text style={styles.tournamentName}>{round.tournamentName}</Text>
        )}
        <Text style={styles.date}>
          {formatDateShort(round.date)}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.scoreInfo}
        onPress={toggleScoreDisplay}
        disabled={!hasScore}
        activeOpacity={0.7}
        accessibilityLabel={
          hasScore
            ? `Score: ${scoreDisplay} ${scoreLabel}. Tap to show ${showTotalScore ? 'relative to par' : 'total score'}`
            : 'Score: not available'
        }
        accessibilityRole="button"
        accessibilityState={{ disabled: !hasScore }}
      >
        <Text style={styles.scoreValue}>{scoreDisplay}</Text>
        {scoreLabel && <Text style={styles.scoreLabel}>{scoreLabel}</Text>}
        {golferName && <Text style={styles.golferName}>{golferName}</Text>}
      </TouchableOpacity>
    </View>
  );
});

RoundHeader.displayName = 'RoundHeader';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2E7D32',
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
    minHeight: 44,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  golferName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
    marginTop: 4,
  },
});
