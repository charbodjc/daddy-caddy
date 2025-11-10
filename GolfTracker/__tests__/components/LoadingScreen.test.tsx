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
    const { UNSAFE_getByType } = render(<LoadingScreen />);
    
    expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
  });
  
  it('should have correct styling', () => {
    const { getByText } = render(<LoadingScreen message="Test" />);
    
    const container = getByText('Test').parent;
    expect(container?.props.style).toContainEqual(
      expect.objectContaining({ flex: 1 })
    );
  });
});

