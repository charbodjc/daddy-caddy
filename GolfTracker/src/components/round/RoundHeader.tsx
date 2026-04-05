import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Round from '../../database/watermelon/models/Round';
import { formatScoreVsPar } from '../../utils/scoreCalculations';
import { formatDateShort } from '../../utils/dateFormatting';
import { GolferAvatar } from '../golfer/GolferAvatar';

interface RoundHeaderProps {
  round: Round;
  totalPar?: number;
  totalScore?: number;
  golferName?: string;
  golferColor?: string;
  golferEmoji?: string;
  golferAvatarUri?: string;
  onMenuPress?: () => void;
}

export const RoundHeader: React.FC<RoundHeaderProps> = React.memo(({ round, totalPar: totalParProp, totalScore: totalScoreProp, golferName, golferColor, golferEmoji, golferAvatarUri, onMenuPress }) => {
  const insets = useSafeAreaInsets();
  const [showTotalScore, setShowTotalScore] = useState(false);

  const toggleScoreDisplay = useCallback(() => {
    setShowTotalScore((prev) => !prev);
  }, []);

  // Prefer the live score derived from observed holes; fall back to round model
  const score = totalScoreProp ?? round.totalScore;
  const hasScore = score != null && score > 0 && totalParProp;

  const toPar = (() => {
    if (!score || !totalParProp || totalParProp <= 0) return 0;
    return score - totalParProp;
  })();

  const scoreDisplay = hasScore
    ? (showTotalScore ? String(score) : formatScoreVsPar(toPar))
    : '--';

  const scoreLabel = hasScore
    ? (showTotalScore ? 'total' : 'to par')
    : undefined;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <View style={styles.topRow}>
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
      </TouchableOpacity>

      <View style={styles.courseInfo}>
        <Text style={styles.courseName} numberOfLines={1}>{round.courseName}</Text>
        {round.tournamentName && (
          <Text style={styles.tournamentName} numberOfLines={1}>{round.tournamentName}</Text>
        )}
        <Text style={styles.date}>{formatDateShort(round.date)}</Text>
      </View>
      </View>

      {golferName && (
        <View style={styles.golferRow}>
          <GolferAvatar
            name={golferName}
            color={golferColor || '#666'}
            emoji={golferEmoji}
            avatarUri={golferAvatarUri}
            size={22}
          />
          <Text style={styles.golferName} numberOfLines={1}>{golferName}</Text>
        </View>
      )}
    </View>
  );
});

RoundHeader.displayName = 'RoundHeader';

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2E7D32',
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuButton: {
    padding: 5,
    marginRight: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  scoreInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
    minHeight: 44,
    marginRight: 12,
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
  courseInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  golferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
  },
  golferName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  courseName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 2,
  },
  tournamentName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
