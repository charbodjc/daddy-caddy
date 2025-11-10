import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TournamentCard } from '../../src/components/tournament/TournamentCard';
import { database } from '../../src/database/watermelon/database';
import Tournament from '../../src/database/watermelon/models/Tournament';

describe('TournamentCard Component', () => {
  let testTournament: Tournament;
  
  beforeEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase();
      
      testTournament = await database.collections.get<Tournament>('tournaments').create((t) => {
        t.name = 'Masters Tournament';
        t.courseName = 'Augusta National';
        t.startDate = new Date('2025-04-10');
        t.endDate = new Date('2025-04-13');
      });
    });
  });
  
  it('should render tournament name', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard tournament={testTournament} onPress={mockOnPress} />
    );
    
    expect(getByText('Masters Tournament')).toBeTruthy();
  });
  
  it('should render course name', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard tournament={testTournament} onPress={mockOnPress} />
    );
    
    expect(getByText('Augusta National')).toBeTruthy();
  });
  
  it('should render date range', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard tournament={testTournament} onPress={mockOnPress} />
    );
    
    // Should show formatted date range
    expect(getByText(/Apr 10/)).toBeTruthy();
    expect(getByText(/Apr 13, 2025/)).toBeTruthy();
  });
  
  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard tournament={testTournament} onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Masters Tournament'));
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
  
  it('should display round count', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard 
        tournament={testTournament} 
        onPress={mockOnPress}
        roundCount={3}
      />
    );
    
    expect(getByText('3 Rounds')).toBeTruthy();
  });
  
  it('should display singular Round for count of 1', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard 
        tournament={testTournament} 
        onPress={mockOnPress}
        roundCount={1}
      />
    );
    
    expect(getByText('1 Round')).toBeTruthy();
  });
  
  it('should display 0 Rounds when not provided', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <TournamentCard tournament={testTournament} onPress={mockOnPress} />
    );
    
    expect(getByText('0 Rounds')).toBeTruthy();
  });
});

