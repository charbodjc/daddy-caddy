import { holeToGolfHole, roundToGolfRound } from '../../src/services/adapters';

describe('holeToGolfHole', () => {
  it('maps all Hole fields to GolfHole', () => {
    const mockHole = {
      holeNumber: 1,
      par: 4,
      strokes: 5,
      fairwayHit: true,
      greenInRegulation: false,
      putts: 2,
      notes: 'pulled tee shot',
      shotData: null,
    } as any;

    const result = holeToGolfHole(mockHole);

    expect(result).toEqual({
      holeNumber: 1,
      par: 4,
      strokes: 5,
      fairwayHit: true,
      greenInRegulation: false,
      putts: 2,
      notes: 'pulled tee shot',
      shotData: undefined,
    });
  });

  it('parses shotData JSON when present', () => {
    const shotDataObj = {
      par: 4,
      shots: [{ stroke: 1, type: 'Tee Shot', results: ['center'] }],
      currentStroke: 2,
    };
    const mockHole = {
      holeNumber: 3,
      par: 4,
      strokes: 4,
      fairwayHit: true,
      greenInRegulation: true,
      putts: 1,
      notes: '',
      shotData: JSON.stringify(shotDataObj),
    } as any;

    const result = holeToGolfHole(mockHole);

    expect(result.shotData).toEqual(shotDataObj);
  });
});

describe('roundToGolfRound', () => {
  it('maps Round and Holes to GolfRound', () => {
    const now = new Date();
    const mockRound = {
      id: 'round-1',
      courseName: 'Pebble Beach',
      tournamentId: 'tourney-1',
      tournamentName: 'Weekend Classic',
      date: now,
      totalScore: 82,
      totalPutts: 30,
      fairwaysHit: 9,
      greensInRegulation: 7,
      aiAnalysis: 'Good round overall',
      isFinished: true,
      createdAt: now,
      updatedAt: now,
    } as any;

    const mockHoles = [
      {
        holeNumber: 1,
        par: 4,
        strokes: 5,
        fairwayHit: true,
        greenInRegulation: false,
        putts: 2,
        notes: '',
        shotData: null,
      },
      {
        holeNumber: 2,
        par: 3,
        strokes: 3,
        fairwayHit: false,
        greenInRegulation: true,
        putts: 1,
        notes: '',
        shotData: null,
      },
    ] as any[];

    const result = roundToGolfRound(mockRound, mockHoles);

    expect(result.id).toBe('round-1');
    expect(result.courseName).toBe('Pebble Beach');
    expect(result.tournamentId).toBe('tourney-1');
    expect(result.tournamentName).toBe('Weekend Classic');
    expect(result.totalScore).toBe(82);
    expect(result.totalPutts).toBe(30);
    expect(result.fairwaysHit).toBe(9);
    expect(result.greensInRegulation).toBe(7);
    expect(result.aiAnalysis).toBe('Good round overall');
    expect(result.isFinished).toBe(true);
    expect(result.holes).toHaveLength(2);
    expect(result.holes[0].holeNumber).toBe(1);
    expect(result.holes[1].holeNumber).toBe(2);
  });
});
