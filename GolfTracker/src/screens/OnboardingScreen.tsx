import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_SLIDES = [
  {
    id: 1,
    title: 'Welcome to Daddy Caddy!',
    description: 'Your personal golf companion for tracking rounds, tournaments, and improving your game.',
    icon: 'golf-ball',
    iconType: 'FontAwesome5' as const,
    color: '#4CAF50',
  },
  {
    id: 2,
    title: 'Track Every Round',
    description: 'Record your scores hole-by-hole, track statistics like fairways hit and greens in regulation.',
    icon: 'golf-course',
    iconType: 'MaterialIcons' as const,
    color: '#2196F3',
  },
  {
    id: 3,
    title: 'Manage Tournaments',
    description: 'Create tournaments and track multiple rounds. See your performance across competition days.',
    icon: 'trophy',
    iconType: 'FontAwesome5' as const,
    color: '#FFD700',
  },
  {
    id: 4,
    title: 'Analyze Your Game',
    description: 'View detailed statistics, identify strengths and weaknesses, and get AI-powered insights.',
    icon: 'chart-line',
    iconType: 'FontAwesome5' as const,
    color: '#9C27B0',
  },
  {
    id: 5,
    title: 'Capture Memories',
    description: 'Take photos and videos during your rounds to remember great shots and share with friends.',
    icon: 'camera',
    iconType: 'MaterialIcons' as const,
    color: '#FF5722',
  },
  {
    id: 6,
    title: "Let's Get Started!",
    description: "You're ready to start tracking your golf game. Tap the button below to begin your first round.",
    icon: 'check-circle',
    iconType: 'MaterialIcons' as const,
    color: '#4CAF50',
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    // Mark onboarding as complete
    await AsyncStorage.setItem('onboarding_completed', 'true');
    onComplete();
  };

  const slide = ONBOARDING_SLIDES[currentSlide];
  const isLastSlide = currentSlide === ONBOARDING_SLIDES.length - 1;

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Main content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${slide.color}20` }]}>
          {slide.iconType === 'FontAwesome5' ? (
            <FontAwesome5 name={slide.icon} size={80} color={slide.color} />
          ) : (
            <Icon name={slide.icon} size={80} color={slide.color} />
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && styles.dotActive,
                { backgroundColor: index === currentSlide ? slide.color : '#ddd' },
              ]}
            />
          ))}
        </View>

        {/* Next/Get Started button */}
        <Button
          title={isLastSlide ? 'Get Started' : 'Next'}
          onPress={handleNext}
          style={[styles.nextButton, { backgroundColor: slide.color }]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  navigation: {
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    width: '100%',
  },
});

export default OnboardingScreen;

