import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorScreen } from '../../src/components/common/ErrorScreen';

describe('ErrorScreen Component', () => {
  const mockError = new Error('Test error message');
  const mockOnRetry = jest.fn();
  
  beforeEach(() => {
    mockOnRetry.mockClear();
  });
  
  it('should render error message', () => {
    const { getByText } = render(<ErrorScreen error={mockError} />);
    
    expect(getByText('Test error message')).toBeTruthy();
  });
  
  it('should render title', () => {
    const { getByText } = render(<ErrorScreen error={mockError} />);
    
    expect(getByText('Oops! Something went wrong')).toBeTruthy();
  });
  
  it('should render retry button when onRetry provided', () => {
    const { getByText } = render(
      <ErrorScreen error={mockError} onRetry={mockOnRetry} />
    );
    
    expect(getByText('Try Again')).toBeTruthy();
  });
  
  it('should not render retry button when onRetry not provided', () => {
    const { queryByText } = render(<ErrorScreen error={mockError} />);
    
    expect(queryByText('Try Again')).toBeNull();
  });
  
  it('should call onRetry when retry button pressed', () => {
    const { getByText } = render(
      <ErrorScreen error={mockError} onRetry={mockOnRetry} />
    );
    
    fireEvent.press(getByText('Try Again'));
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });
  
  it('should handle error without message', () => {
    const errorWithoutMessage = new Error();
    const { getByText } = render(<ErrorScreen error={errorWithoutMessage} />);
    
    expect(getByText('An unexpected error occurred')).toBeTruthy();
  });
  
  it('should display error icon', () => {
    const { UNSAFE_getAllByType } = render(<ErrorScreen error={mockError} />);
    
    // Icon component should be present
    expect(UNSAFE_getAllByType('RNSVGPath').length).toBeGreaterThan(0);
  });
});

