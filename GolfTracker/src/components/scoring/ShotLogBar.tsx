/**
 * ShotLogBar — Emoji trail of shots taken on this hole.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SHOT_RESULTS } from '../../types';
import type { TrackedShot } from '../../types';

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

export function buildShotSummary(shots: TrackedShot[], par: number): string {
  if (shots.length === 0) return '';
  const lines = shots.map((s, i) => {
    const emoji = shotResultEmoji(s.results[0]);
    const penalty = s.penaltyStrokes ? ` (+${s.penaltyStrokes} penalty)` : '';
    return `${i + 1}. ${s.type} ${emoji}${penalty}`;
  });
  return `Par ${par} - Shots so far:\n${lines.join('\n')}`;
}

interface ShotLogBarProps {
  shots: TrackedShot[];
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
      accessibilityRole="summary"
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
