import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HoleCard } from '../../src/components/round/HoleCard';

describe('HoleCard Component', () => {
  const mockOnPress = jest.fn();
  
  beforeEach(() => {
    mockOnPress.mockClear();
  });
  
  it('should render hole information', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={4}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('1')).toBeTruthy();
    expect(getByText('Par 4')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
  });
  
  it('should call onPress when pressed', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={4}
        onPress={mockOnPress}
      />
    );
    
    fireEvent.press(getByText('1'));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
  
  it('should show pending state when no strokes', () => {
    const { queryByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={0}
        onPress={mockOnPress}
      />
    );

    // With 0 strokes, the score text should not display a numeric score
    // (pending state shows an icon instead of a number)
    expect(queryByText('0')).toBeNull();
  });
  
  it('should display correct score for par', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={4}
        onPress={mockOnPress}
      />
    );
    
    // Score should be visible
    expect(getByText('4')).toBeTruthy();
  });
  
  it('should display correct score for birdie', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={3}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('3')).toBeTruthy();
  });
  
  it('should display correct score for eagle', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={5}
        strokes={3}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('3')).toBeTruthy();
  });
  
  it('should display correct score for bogey', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={5}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('5')).toBeTruthy();
  });
  
  it('should display correct score for double bogey', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={6}
        onPress={mockOnPress}
      />
    );
    
    expect(getByText('6')).toBeTruthy();
  });
  
  it('should highlight active hole', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={4}
        onPress={mockOnPress}
        isActive={true}
      />
    );
    
    const card = getByText('1').parent?.parent?.parent;
    expect(card?.props.style).toMatchObject({ borderWidth: 2 });
  });
  
  it('should not highlight inactive hole', () => {
    const { getByText } = render(
      <HoleCard
        holeNumber={1}
        par={4}
        strokes={4}
        onPress={mockOnPress}
        isActive={false}
      />
    );
    
    const card = getByText('1').parent?.parent?.parent;
    expect(card?.props.style).toMatchObject({ borderWidth: 1 });
  });
});

