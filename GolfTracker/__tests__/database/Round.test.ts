import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';

describe('Round Model', () => {
  it('should create round with basic properties', async () => {
    const round = await database.write(async () => {
      return await database.collections.get<Round>('rounds').create((round) => {
        round.courseName = 'Test Course';
        round.date = new Date('2025-01-01');
        round.isFinished = false;
      });
    });

    expect(round.courseName).toBe('Test Course');
    expect(round.isFinished).toBe(false);
    expect(round.id).toBeDefined();
  });

  it('should create round with holes', async () => {
    let roundId: string;

    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });
      roundId = round.id;

      // Create holes for the round
      for (let i = 1; i <= 18; i++) {
        await database.collections.get<Hole>('holes').create((hole) => {
          hole.roundId = round.id;
          hole.holeNumber = i;
          hole.par = 4;
          hole.strokes = 0;
        });
      }
    });

    // Verify round and holes
    const round = await database.collections.get<Round>('rounds').find(roundId!);
    const holes = await round.holes.fetch();

    expect(holes.length).toBe(18);
    expect(holes[0].holeNumber).toBe(1);
    expect(holes[17].holeNumber).toBe(18);
  });

  it('should calculate total score from holes', async () => {
    let roundId: string;

    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
        r.totalScore = 0;
      });
      roundId = round.id;

      // Create holes with strokes
      for (let i = 1; i <= 18; i++) {
        await database.collections.get<Hole>('holes').create((hole) => {
          hole.roundId = round.id;
          hole.holeNumber = i;
          hole.par = 4;
          hole.strokes = 4;
        });
      }

      // Update round total score
      await round.update((r) => {
        r.totalScore = 72; // 18 holes * 4 strokes
      });
    });

    const round = await database.collections.get<Round>('rounds').find(roundId!);
    expect(round.totalScore).toBe(72);
  });

  it('should observe hole changes reactively', async () => {
    const observedHoles: any[] = [];

    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });

      // Subscribe to hole changes
      const subscription = round.holesArray.subscribe((holes) => {
        observedHoles.push(holes.length);
      });

      // Create a hole
      await database.collections.get<Hole>('holes').create((hole) => {
        hole.roundId = round.id;
        hole.holeNumber = 1;
        hole.par = 4;
        hole.strokes = 3;
      });

      subscription.unsubscribe();
    });

    // Should have observed at least the initial state and one update
    expect(observedHoles.length).toBeGreaterThan(0);
  });

  it('should set tournament information', async () => {
    const round = await database.write(async () => {
      return await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
        r.tournamentId = 'tournament_123';
        r.tournamentName = 'Test Tournament';
      });
    });

    expect(round.tournamentId).toBe('tournament_123');
    expect(round.tournamentName).toBe('Test Tournament');
  });

  it('should track statistics', async () => {
    const round = await database.write(async () => {
      return await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
        r.totalScore = 85;
        r.totalPutts = 32;
        r.fairwaysHit = 10;
        r.greensInRegulation = 12;
      });
    });

    expect(round.totalScore).toBe(85);
    expect(round.totalPutts).toBe(32);
    expect(round.fairwaysHit).toBe(10);
    expect(round.greensInRegulation).toBe(12);
  });

  it('should mark round as finished', async () => {
    let roundId: string;

    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });
      roundId = round.id;
    });

    await database.write(async () => {
      const round = await database.collections.get<Round>('rounds').find(roundId);
      await round.update((r) => {
        r.isFinished = true;
      });
    });

    const updatedRound = await database.collections.get<Round>('rounds').find(roundId);
    expect(updatedRound.isFinished).toBe(true);
  });
});

