import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../src/screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('OnboardingScreen', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    jest.clearAllMocks();
  });

  it('should render first slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByText('Welcome to Daddy Caddy!')).toBeTruthy();
    expect(getByText(/perfect tool for parents/)).toBeTruthy();
  });

  it('should show Next button on first slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByText('Next')).toBeTruthy();
  });

  it('should show Skip button on first slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByText('Skip')).toBeTruthy();
  });

  it('should advance to next slide when Next is pressed', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByText('Next'));

    expect(getByText('Follow the Action Live')).toBeTruthy();
  });

  it('should skip to completion when Skip is pressed', async () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByText('Skip'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show all 6 slides', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByText('Next')); // Slide 2
    expect(getByText('Follow the Action Live')).toBeTruthy();

    fireEvent.press(getByText('Next')); // Slide 3
    expect(getByText('Capture Every Moment')).toBeTruthy();

    fireEvent.press(getByText('Next')); // Slide 4
    expect(getByText('Share with Everyone')).toBeTruthy();

    fireEvent.press(getByText('Next')); // Slide 5
    expect(getByText('Complete Tournament Coverage')).toBeTruthy();

    fireEvent.press(getByText('Next')); // Slide 6
    expect(getByText("Let's Get Started!")).toBeTruthy();
  });

  it('should show Get Started button on last slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }

    expect(getByText('Get Started')).toBeTruthy();
  });

  it('should not show Skip button on last slide', () => {
    const { getByText, queryByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }

    expect(queryByText('Skip')).toBeNull();
  });

  it('should mark onboarding complete and call callback on Get Started', async () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }

    fireEvent.press(getByText('Get Started'));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
});
