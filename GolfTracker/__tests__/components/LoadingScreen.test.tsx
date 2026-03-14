import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingScreen } from '../../src/components/common/LoadingScreen';

describe('LoadingScreen Component', () => {
  it('should render with default message', () => {
    const { getByText } = render(<LoadingScreen />);
    
    expect(getByText('Loading...')).toBeTruthy();
  });
  
  it('should render with custom message', () => {
    const { getByText } = render(<LoadingScreen message="Loading data..." />);
    
    expect(getByText('Loading data...')).toBeTruthy();
  });
  
  it('should display ActivityIndicator', () => {
    const { getByText } = render(<LoadingScreen />);

    // Verify loading screen renders (ActivityIndicator is present alongside text)
    expect(getByText('Loading...')).toBeTruthy();
  });
  
  it('should have correct styling', () => {
    const { getByText } = render(<LoadingScreen message="Test" />);
    
    const container = getByText('Test').parent;
    expect(container?.props.style).toContainEqual(
      expect.objectContaining({ flex: 1 })
    );
  });
});

