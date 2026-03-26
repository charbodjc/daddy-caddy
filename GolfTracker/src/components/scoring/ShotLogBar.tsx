/**
 * ShotLogBar — Emoji trail of shots taken on this hole.
 * Supports both V1 (TrackedShot) and V2 (TrackedShotV2) formats.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SHOT_RESULTS, SHOT_OUTCOMES, LIE_TYPES } from '../../types';
import type { TrackedShot, TrackedShotV2 } from '../../types';
import { shotLabelV2 } from '../../utils/shotDataV2Helpers';

function shotResultEmoji(result: string): string {
  switch (result) {
    case SHOT_RESULTS.GREEN:
    case SHOT_RESULTS.MADE: return '\u2705';
    case SHOT_RESULTS.CENTER: return '\u26F3';
    case SHOT_RESULTS.LEFT: return '\u2B05\uFE0F';
    case SHOT_RESULTS.RIGHT: return '\u27A1\uFE0F';
    case SHOT_RESULTS.SHORT: return '\u2B07\uFE0F';
    case SHOT_RESULTS.LONG: return '\u2B06\uFE0F';
    case SHOT_RESULTS.LONG_LEFT: return '\u2196\uFE0F';
    case SHOT_RESULTS.LONG_RIGHT: return '\u2197\uFE0F';
    case SHOT_RESULTS.SHORT_LEFT: return '\u2199\uFE0F';
    case SHOT_RESULTS.SHORT_RIGHT: return '\u2198\uFE0F';
    case SHOT_RESULTS.ROUGH: return '\u{1F33F}';
    case SHOT_RESULTS.SAND: return '\u{1F3D6}\uFE0F';
    case SHOT_RESULTS.FAIRWAY: return '\u26F3';
    case SHOT_RESULTS.WATER: return '\u{1F4A7}';
    case SHOT_RESULTS.HAZARD: return '\u26A0\uFE0F';
    case SHOT_RESULTS.OB: return '\u{1F6AB}';
    case SHOT_RESULTS.LOST: return '\u{1F50D}';
    case SHOT_RESULTS.MISSED: return '\u274C';
    default: return '\u26AA';
  }
}

function shotV2Emoji(shot: TrackedShotV2): string {
  if (shot.outcome === SHOT_OUTCOMES.HOLED) return '\u2705';
  if (shot.outcome === SHOT_OUTCOMES.PENALTY) return '\u{1F6AB}';
  if (shot.outcome === SHOT_OUTCOMES.ON_TARGET) {
    if (shot.resultLie === LIE_TYPES.GREEN) return '\u2705';
    return '\u26F3';
  }
  // Missed — show direction emoji
  if (shot.missDirection) return shotResultEmoji(shot.missDirection);
  if (shot.puttMissDistance === 'long') return '\u2B06\uFE0F';
  if (shot.puttMissDistance === 'short') return '\u2B07\uFE0F';
  return '\u274C';
}

// V1 summary builder
export function buildShotSummary(shots: TrackedShot[], par: number): string {
  if (shots.length === 0) return '';
  const lines = shots.map((s, i) => {
    const emoji = shotResultEmoji(s.results[0]);
    const penalty = s.penaltyStrokes ? ` (+${s.penaltyStrokes} penalty)` : '';
    return `${i + 1}. ${s.type} ${emoji}${penalty}`;
  });
  return `Par ${par} - Shots so far:\n${lines.join('\n')}`;
}

// V2 summary builder
export function buildShotSummaryV2(shots: TrackedShotV2[], par: number): string {
  if (shots.length === 0) return '';
  const lines = shots.map((s) => {
    const emoji = shotV2Emoji(s);
    const penalty = s.penaltyStrokes ? ` (+${s.penaltyStrokes} penalty)` : '';
    return `${s.stroke}. ${shotLabelV2(s)} ${emoji}${penalty}`;
  });
  return `Par ${par} - Shots so far:\n${lines.join('\n')}`;
}

interface ShotLogBarProps {
  shots: TrackedShot[];
}

interface ShotLogBarV2Props {
  shots: TrackedShotV2[];
}

export const ShotLogBar = React.memo(function ShotLogBar({ shots }: ShotLogBarProps) {
  if (shots.length === 0) return null;

  const emojiTrail = shots.map((s) => shotResultEmoji(s.results[0])).join(' ');
  const descriptions = shots.map((s, i) =>
    `Shot ${i + 1}: ${s.type} ${s.results[0]?.replace(/_/g, ' ') ?? ''}`
  ).join(', ');

  return (
    <View
      style={styles.bar}
      accessibilityLabel={`Shot log: ${shots.length} shots. ${descriptions}`}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{emojiTrail}</Text>
    </View>
  );
});

export const ShotLogBarV2 = React.memo(function ShotLogBarV2({ shots }: ShotLogBarV2Props) {
  if (shots.length === 0) return null;

  const emojiTrail = shots.map((s) => shotV2Emoji(s)).join(' ');
  const descriptions = shots.map((s) =>
    `Shot ${s.stroke}: ${shotLabelV2(s)}`
  ).join(', ');

  return (
    <View
      style={styles.bar}
      accessibilityLabel={`Shot log: ${shots.length} shots. ${descriptions}`}
      accessibilityRole="text"
    >
      <Text style={styles.text}>{emojiTrail}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  text: {
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 4,
  },
});
