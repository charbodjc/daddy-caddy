import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../src/components/common/Button';

describe('Button Component', () => {
  it('should render with title', () => {
    const { getByText } = render(
      <Button title="Click Me" onPress={() => {}} />
    );
    
    expect(getByText('Click Me')).toBeTruthy();
  });
  
  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Click Me'));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
  
  it('should render primary variant by default', () => {
    const { getByText } = render(
      <Button title="Primary" onPress={() => {}} />
    );
    
    const button = getByText('Primary').parent?.parent;
    expect(button?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#4CAF50' })
    );
  });
  
  it('should render secondary variant', () => {
    const { getByText } = render(
      <Button title="Secondary" onPress={() => {}} variant="secondary" />
    );
    
    const text = getByText('Secondary');
    expect(text.props.style).toContainEqual(
      expect.objectContaining({ color: '#4CAF50' })
    );
  });
  
  it('should render danger variant', () => {
    const { getByText } = render(
      <Button title="Danger" onPress={() => {}} variant="danger" />
    );
    
    const button = getByText('Danger').parent?.parent;
    expect(button?.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#f44336' })
    );
  });
  
  it('should show loading indicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Loading" onPress={() => {}} loading={true} />
    );
    
    // Title should not be visible
    expect(queryByText('Loading')).toBeNull();
    
    // ActivityIndicator should be present
    expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
  });
  
  it('should be disabled when loading', () => {
    const mockOnPress = jest.fn();
    const { getByTestId, UNSAFE_getByType } = render(
      <Button title="Loading" onPress={mockOnPress} loading={true} />
    );
    
    const touchable = UNSAFE_getByType('TouchableOpacity');
    
    expect(touchable.props.disabled).toBe(true);
  });
  
  it('should be disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { UNSAFE_getByType } = render(
      <Button title="Disabled" onPress={mockOnPress} disabled={true} />
    );
    
    const touchable = UNSAFE_getByType('TouchableOpacity');
    
    expect(touchable.props.disabled).toBe(true);
  });
  
  it('should not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled" onPress={mockOnPress} disabled={true} />
    );
    
    fireEvent.press(getByText('Disabled'));
    
    expect(mockOnPress).not.toHaveBeenCalled();
  });
  
  it('should apply custom style', () => {
    const customStyle = { marginTop: 20 };
    const { getByText } = render(
      <Button title="Custom" onPress={() => {}} style={customStyle} />
    );
    
    const button = getByText('Custom').parent?.parent;
    expect(button?.props.style).toContainEqual(customStyle);
  });
});

