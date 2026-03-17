import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ShotTrackingScreen from '../ShotTrackingScreen';
import { database } from '../../database/watermelon/database';
import Round from '../../database/watermelon/models/Round';
import Hole from '../../database/watermelon/models/Hole';

// Mock navigation
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, any> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock roundStore
const mockUpdateHole = jest.fn().mockResolvedValue(undefined);
jest.mock('../../stores/roundStore', () => ({
  useRoundStore: () => ({
    updateHole: mockUpdateHole,
  }),
}));

describe('ShotTrackingScreen', () => {
  let testRound: Round;
  let testHole: Hole;

  beforeEach(async () => {
    jest.clearAllMocks();

    await database.write(async () => {
      await database.unsafeResetDatabase();

      testRound = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });

      testHole = await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 0;
      });
    });

    mockRouteParams = {
      holeId: testHole.id,
      roundId: testRound.id,
    };
  });

  it('should render hole information', async () => {
    const { getByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      expect(getByText('Hole 1')).toBeTruthy();
      expect(getByText('Par 4')).toBeTruthy();
    });
  });

  it('should display context-aware shot type buttons', async () => {
    const { getByText, queryByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      // For shot 1, only Tee Shot and Penalty are available
      expect(getByText('Tee Shot')).toBeTruthy();
      expect(getByText('Penalty')).toBeTruthy();
      // Approach and Putt not shown until after tee shot
      expect(queryByText('Approach')).toBeNull();
    });
  });

  it('should display context-aware result options for tee shot', async () => {
    const { getByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      // Par 4 tee shot includes Fairway, On Green (driveable), and others
      expect(getByText('Fairway')).toBeTruthy();
      expect(getByText('On Green')).toBeTruthy();
      expect(getByText('Left')).toBeTruthy();
      expect(getByText('Right')).toBeTruthy();
      expect(getByText('OB')).toBeTruthy();
    });
  });

  it('should add shot when result button is pressed', async () => {
    const { getByText, queryByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      expect(getByText('Tee Shot')).toBeTruthy();
    });

    // Record a tee shot to fairway
    fireEvent.press(getByText('Fairway'));

    // Shot log should appear
    await waitFor(() => {
      expect(queryByText('Shot Log')).toBeTruthy();
    });
  });

  it('should show penalty stroke selector when Penalty type selected', async () => {
    const { getByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      expect(getByText('Penalty')).toBeTruthy();
    });

    // Select penalty type
    fireEvent.press(getByText('Penalty'));

    // Should show penalty stroke options
    await waitFor(() => {
      expect(getByText('1 stroke')).toBeTruthy();
      expect(getByText('2 strokes')).toBeTruthy();
    });
  });

  it('should load existing shot data', async () => {
    const existingShotData = {
      par: 4,
      shots: [
        { stroke: 1, type: 'Tee Shot', results: ['center'] },
        { stroke: 2, type: 'Approach', results: ['green'] },
        { stroke: 3, type: 'Putt', results: ['made'] },
      ],
      currentStroke: 4,
    };

    // Update hole with existing shot data
    await database.write(async () => {
      await testHole.update((h) => {
        h.shotData = JSON.stringify(existingShotData);
        h.strokes = 3;
      });
    });

    const { getByText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      expect(getByText('Hole 1')).toBeTruthy();
      // Should show shot log with existing shots
      expect(getByText('Shot Log')).toBeTruthy();
    });
  });

  it('should navigate back when back button is pressed', async () => {
    const { getByLabelText } = render(<ShotTrackingScreen />);

    await waitFor(() => {
      expect(getByLabelText('Go back')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Go back'));

    expect(mockGoBack).toHaveBeenCalled();
  });
});
