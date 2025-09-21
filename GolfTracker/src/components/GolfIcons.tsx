import React from 'react';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface IconProps {
  size?: number;
  color?: string;
}

// Golf-themed icon components
export const GolfBallIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="golf-ball" size={size} color={color} />
);

export const FlagIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="flag" size={size} color={color} />
);

export const TrophyIcon = ({ size = 24, color = '#FFD700' }: IconProps) => (
  <FontAwesome5 name="trophy" size={size} color={color} />
);

export const CameraIcon = ({ size = 24, color = '#2196F3' }: IconProps) => (
  <FontAwesome5 name="camera" size={size} color={color} />
);

export const ChartIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="chart-line" size={size} color={color} />
);

export const CheckIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="check-circle" size={size} color={color} />
);

export const TimesIcon = ({ size = 24, color = '#f44336' }: IconProps) => (
  <FontAwesome5 name="times-circle" size={size} color={color} />
);

export const ShareIcon = ({ size = 24, color = '#2196F3' }: IconProps) => (
  <FontAwesome5 name="share-alt" size={size} color={color} />
);

export const MapPinIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="map-pin" size={size} color={color} />
);

export const BullseyeIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="bullseye" size={size} color={color} />
);

export const TreeIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="tree" size={size} color={color} />
);

export const MountainIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <Icon name="terrain" size={size} color={color} />
);

export const WindIcon = ({ size = 24, color = '#87CEEB' }: IconProps) => (
  <FontAwesome5 name="wind" size={size} color={color} />
);

export const SunIcon = ({ size = 24, color = '#FFD700' }: IconProps) => (
  <FontAwesome5 name="sun" size={size} color={color} />
);

export const ClockIcon = ({ size = 24, color = '#666' }: IconProps) => (
  <FontAwesome5 name="clock" size={size} color={color} />
);

export const UserGroupIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="users" size={size} color={color} />
);

export const MessageIcon = ({ size = 24, color = '#2196F3' }: IconProps) => (
  <FontAwesome5 name="sms" size={size} color={color} />
);

export const LocationIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <Ionicons name="location-sharp" size={size} color={color} />
);

export const HomeIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="home" size={size} color={color} />
);

export const SettingsIcon = ({ size = 24, color = '#666' }: IconProps) => (
  <Ionicons name="settings-sharp" size={size} color={color} />
);

// Shot type icons
export const TeeShotIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="rocket" size={size} color={color} solid />
);

export const ApproachIcon = ({ size = 24, color = '#2196F3' }: IconProps) => (
  <FontAwesome5 name="arrow-down" size={size} color={color} />
);

export const ChipIcon = ({ size = 24, color = '#FF9800' }: IconProps) => (
  <FontAwesome5 name="angle-double-up" size={size} color={color} />
);

export const BunkerIcon = ({ size = 24, color = '#D2691E' }: IconProps) => (
  <FontAwesome5 name="mountain" size={size} color={color} />
);

export const PuttIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="bullseye" size={size} color={color} />
);

// Score icons
export const EagleIcon = ({ size = 24, color = '#FFD700' }: IconProps) => (
  <FontAwesome5 name="dove" size={size} color={color} />
);

export const BirdieIcon = ({ size = 24, color = '#4CAF50' }: IconProps) => (
  <FontAwesome5 name="crow" size={size} color={color} />
);

export const ParIcon = ({ size = 24, color = '#2196F3' }: IconProps) => (
  <FontAwesome5 name="equals" size={size} color={color} />
);

export const BogeyIcon = ({ size = 24, color = '#FF9800' }: IconProps) => (
  <FontAwesome5 name="plus" size={size} color={color} />
);

export const DoubleBogeyIcon = ({ size = 24, color = '#f44336' }: IconProps) => (
  <FontAwesome5 name="plus-circle" size={size} color={color} />
);
