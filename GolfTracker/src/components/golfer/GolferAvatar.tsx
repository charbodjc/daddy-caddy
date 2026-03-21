import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface GolferAvatarProps {
  name: string;
  color: string;
  emoji?: string;
  size?: number;
}

/** Returns white or black text depending on background luminance. */
function getContrastTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance formula (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/** Two-character initials: first + last initial, or first two letters if single word. */
function getInitials(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export const GolferAvatar: React.FC<GolferAvatarProps> = React.memo(({ name, color, emoji, size = 32 }) => {
  const initials = getInitials(name);
  const textColor = getContrastTextColor(color);
  const fontSize = size * 0.4;
  const emojiSize = size * 0.55;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
      accessibilityLabel={name}
      accessibilityRole="image"
    >
      {emoji ? (
        <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.15 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize, color: textColor }]}>
          {initials}
        </Text>
      )}
    </View>
  );
});

GolferAvatar.displayName = 'GolferAvatar';

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '700',
  },
});
