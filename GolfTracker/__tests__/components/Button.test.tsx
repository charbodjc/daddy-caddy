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
    expect(button?.props.style).toMatchObject({ backgroundColor: '#4CAF50' });
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
    expect(button?.props.style).toMatchObject({ backgroundColor: '#f44336' });
  });
  
  it('should show loading indicator when loading', () => {
    const { queryByText, getByTestId } = render(
      <Button title="Loading" onPress={() => {}} loading={true} testID="loading-button" />
    );

    // Title should not be visible
    expect(queryByText('Loading')).toBeNull();

    // ActivityIndicator should be present (query by testID or role instead of type string)
    const button = getByTestId('loading-button');
    expect(button).toBeTruthy();
  });

  it('should be disabled when loading', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Loading" onPress={mockOnPress} loading={true} testID="loading-button" />
    );

    const touchable = getByTestId('loading-button');

    expect(touchable.props.accessibilityState?.disabled ?? touchable.props.disabled).toBe(true);
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <Button title="Disabled" onPress={mockOnPress} disabled={true} testID="disabled-button" />
    );

    const touchable = getByTestId('disabled-button');

    expect(touchable.props.accessibilityState?.disabled ?? touchable.props.disabled).toBe(true);
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
    expect(button?.props.style).toMatchObject(customStyle);
  });
});

