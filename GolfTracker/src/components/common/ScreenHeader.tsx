import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, type TextStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: 'menu' | 'back';
  onLeftPress?: () => void;
  rightContent?: React.ReactNode;
  backgroundColor?: string;
  centered?: boolean;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
}

const HEADER_PADDING = 16;
const SAFE_AREA_OFFSET = 8;

export const ScreenHeader: React.FC<ScreenHeaderProps> = React.memo(({
  title,
  subtitle,
  leftAction,
  onLeftPress,
  rightContent,
  backgroundColor = '#2E7D32',
  centered = false,
  titleStyle,
  subtitleStyle,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleLeftPress = () => {
    if (onLeftPress) {
      onLeftPress();
    } else if (leftAction === 'menu') {
      navigation.dispatch(DrawerActions.toggleDrawer());
    } else if (leftAction === 'back') {
      navigation.goBack();
    }
  };

  const renderLeftButton = () => {
    if (!leftAction) return null;

    const iconName = leftAction === 'menu' ? 'menu' : 'arrow-back';
    const iconSize = leftAction === 'menu' ? 28 : 24;
    const label = leftAction === 'menu' ? 'Open menu' : 'Go back';

    return (
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleLeftPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={label}
        accessibilityRole="button"
      >
        <Icon name={iconName} size={iconSize} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderTitleContent = () => (
    <View style={[styles.titleContainer, centered && styles.titleCentered]}>
      <Text style={[styles.title, titleStyle]} numberOfLines={1}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, subtitleStyle]} numberOfLines={1}>{subtitle}</Text>}
      {children}
    </View>
  );

  if (centered) {
    return (
      <View style={[styles.container, { backgroundColor, paddingTop: insets.top + SAFE_AREA_OFFSET }]}>
        <View style={styles.centeredRow}>
          {leftAction ? renderLeftButton() : <View style={styles.actionButton} />}
          {renderTitleContent()}
          {rightContent ?? <View style={styles.actionButton} />}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor, paddingTop: insets.top + SAFE_AREA_OFFSET }]}>
      <View style={styles.row}>
        {renderLeftButton()}
        {renderTitleContent()}
        {rightContent}
      </View>
    </View>
  );
});

ScreenHeader.displayName = 'ScreenHeader';

const styles = StyleSheet.create({
  container: {
    padding: HEADER_PADDING,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  centeredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 5,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  titleCentered: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
});
