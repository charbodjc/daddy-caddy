import React from 'react';
import { render } from '@testing-library/react-native';
import { RoundHeader } from '../../src/components/round/RoundHeader';
import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';

describe('RoundHeader Component', () => {
  let testRound: Round;
  
  beforeEach(async () => {
    await database.write(async () => {
      await database.unsafeResetDatabase();
      
      testRound = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Pebble Beach';
        r.date = new Date('2025-01-15');
        r.isFinished = false;
        r.totalScore = 85;
        r.totalPutts = 32;
      });
    });
  });
  
  it('should render course name', () => {
    const { getByText } = render(<RoundHeader round={testRound} />);
    
    expect(getByText('Pebble Beach')).toBeTruthy();
  });
  
  it('should render date', () => {
    const { getByText } = render(<RoundHeader round={testRound} />);
    
    // Date should be formatted
    expect(getByText(/Jan/)).toBeTruthy();
  });
  
  it('should display score relative to par for played holes', () => {
    // totalPar represents par for played holes only (e.g. 72 for 18 holes played)
    const { getByText } = render(<RoundHeader round={testRound} totalPar={72} />);

    // 85 - 72 = +13
    expect(getByText('+13')).toBeTruthy();
  });

  it('should display E for even par', async () => {
    await database.write(async () => {
      await testRound.update((r) => {
        r.totalScore = 72;
      });
    });

    const { getByText } = render(<RoundHeader round={testRound} totalPar={72} />);

    expect(getByText('E')).toBeTruthy();
  });

  it('should display -- when totalPar not provided', () => {
    const { getByText } = render(<RoundHeader round={testRound} />);

    // Without totalPar, score cannot be calculated
    expect(getByText('--')).toBeTruthy();
  });
  
  it('should display tournament name when present', async () => {
    await database.write(async () => {
      await testRound.update((r) => {
        r.tournamentName = 'Masters Tournament';
      });
    });
    
    const { getByText } = render(<RoundHeader round={testRound} />);
    
    expect(getByText('Masters Tournament')).toBeTruthy();
  });
  
  it('should not display tournament name when absent', () => {
    const { queryByText } = render(<RoundHeader round={testRound} />);
    
    // Should not have tournament name
    expect(queryByText(/Tournament/)).toBeNull();
  });
  
  it('should display -- when no score', async () => {
    await database.write(async () => {
      await testRound.update((r) => {
        r.totalScore = undefined;
      });
    });
    
    const { getByText } = render(<RoundHeader round={testRound} />);
    
    expect(getByText('--')).toBeTruthy();
  });
});

