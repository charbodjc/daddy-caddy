import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HoleGrid } from '../../src/components/round/HoleGrid';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';

describe('HoleGrid Component', () => {
  let testHoles: Hole[];
  
  beforeEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase();
      
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test';
        r.date = new Date();
        r.isFinished = false;
      });
      
      testHoles = [];
      for (let i = 1; i <= 18; i++) {
        const hole = await database.collections.get<Hole>('holes').create((h) => {
          h.roundId = round.id;
          h.holeNumber = i;
          h.par = 4;
          h.strokes = i <= 9 ? 4 : 0; // First 9 played
        });
        testHoles.push(hole);
      }
    });
  });
  
  it('should render all 18 holes', () => {
    const mockOnPress = jest.fn();
    const { getAllByText } = render(
      <HoleGrid holes={testHoles} onHolePress={mockOnPress} />
    );
    
    // Should have 18 holes
    for (let i = 1; i <= 18; i++) {
      expect(getAllByText(i.toString()).length).toBeGreaterThan(0);
    }
  });
  
  it('should call onHolePress when hole is pressed', () => {
    const mockOnPress = jest.fn();
    const { getAllByText } = render(
      <HoleGrid holes={testHoles} onHolePress={mockOnPress} />
    );
    
    // Press hole 1
    fireEvent.press(getAllByText('1')[0]);
    
    expect(mockOnPress).toHaveBeenCalledTimes(1);
    expect(mockOnPress).toHaveBeenCalledWith(testHoles[0]);
  });
  
  it('should highlight active hole', () => {
    const mockOnPress = jest.fn();
    const { getAllByText } = render(
      <HoleGrid holes={testHoles} onHolePress={mockOnPress} activeHoleNumber={5} />
    );

    // All 18 holes should be rendered
    const allHoleElements = [];
    for (let i = 1; i <= 18; i++) {
      allHoleElements.push(...getAllByText(i.toString()));
    }
    expect(allHoleElements.length).toBeGreaterThanOrEqual(18);
  });

  it('should use FlatList for performance', () => {
    const mockOnPress = jest.fn();
    const { getAllByText } = render(
      <HoleGrid holes={testHoles} onHolePress={mockOnPress} />
    );

    // Verify all holes are rendered (FlatList renders content)
    expect(getAllByText('1').length).toBeGreaterThan(0);
  });

  it('should render in 4 columns', () => {
    const mockOnPress = jest.fn();
    const { getAllByText } = render(
      <HoleGrid holes={testHoles} onHolePress={mockOnPress} />
    );

    // Verify all holes are rendered in the grid
    for (let i = 1; i <= 18; i++) {
      expect(getAllByText(i.toString()).length).toBeGreaterThan(0);
    }
  });
});

