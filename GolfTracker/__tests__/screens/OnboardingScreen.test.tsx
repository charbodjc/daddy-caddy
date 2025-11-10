import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../../src/screens/OnboardingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('OnboardingScreen', () => {
  const mockOnComplete = jest.fn();
  
  beforeEach(() => {
    mockOnComplete.mockClear();
    jest.clearAllMocks();
  });
  
  it('should render first slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    expect(getByText('Welcome to Daddy Caddy!')).toBeTruthy();
    expect(getByText(/Your personal golf companion/)).toBeTruthy();
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
    
    // Press Next
    fireEvent.press(getByText('Next'));
    
    // Should show second slide
    expect(getByText('Track Every Round')).toBeTruthy();
  });
  
  it('should skip to completion when Skip is pressed', async () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Press Skip
    fireEvent.press(getByText('Skip'));
    
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
  
  it('should show all 6 slides', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Navigate through all slides
    fireEvent.press(getByText('Next')); // Slide 2
    expect(getByText('Track Every Round')).toBeTruthy();
    
    fireEvent.press(getByText('Next')); // Slide 3
    expect(getByText('Manage Tournaments')).toBeTruthy();
    
    fireEvent.press(getByText('Next')); // Slide 4
    expect(getByText('Analyze Your Game')).toBeTruthy();
    
    fireEvent.press(getByText('Next')); // Slide 5
    expect(getByText('Capture Memories')).toBeTruthy();
    
    fireEvent.press(getByText('Next')); // Slide 6
    expect(getByText("Let's Get Started!")).toBeTruthy();
  });
  
  it('should show Get Started button on last slide', () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Navigate to last slide
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }
    
    expect(getByText('Get Started')).toBeTruthy();
  });
  
  it('should not show Skip button on last slide', () => {
    const { getByText, queryByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Navigate to last slide
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }
    
    expect(queryByText('Skip')).toBeNull();
  });
  
  it('should mark onboarding complete and call callback on Get Started', async () => {
    const { getByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Navigate to last slide
    for (let i = 0; i < 5; i++) {
      fireEvent.press(getByText(/Next|Get Started/));
    }
    
    // Press Get Started
    fireEvent.press(getByText('Get Started'));
    
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboarding_completed', 'true');
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });
  
  it('should display correct number of dots', () => {
    const { UNSAFE_getAllByType } = render(<OnboardingScreen onComplete={mockOnComplete} />);
    
    // Should have 6 dots for 6 slides
    const dots = UNSAFE_getAllByType('View').filter(
      view => view.props.style && view.props.style.width === 8
    );
    
    expect(dots.length).toBeGreaterThanOrEqual(6);
  });
});

