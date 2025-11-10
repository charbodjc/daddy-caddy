import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';

describe('Hole Model', () => {
  let testRound: Round;

  beforeEach(async () => {
    await database.write(async () => {
      testRound = await database.collections.get<Round>('rounds').create((r) => {
        r.courseName = 'Test Course';
        r.date = new Date();
        r.isFinished = false;
      });
    });
  });

  it('should create a hole with basic properties', async () => {
    const hole = await database.write(async () => {
      return await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 4;
      });
    });

    expect(hole.holeNumber).toBe(1);
    expect(hole.par).toBe(4);
    expect(hole.strokes).toBe(4);
    expect(hole.roundId).toBe(testRound.id);
  });

  it('should create hole with optional statistics', async () => {
    const hole = await database.write(async () => {
      return await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 5;
        h.fairwayHit = true;
        h.greenInRegulation = false;
        h.putts = 2;
        h.notes = 'Hit tree on approach';
      });
    });

    expect(hole.fairwayHit).toBe(true);
    expect(hole.greenInRegulation).toBe(false);
    expect(hole.putts).toBe(2);
    expect(hole.notes).toBe('Hit tree on approach');
  });

  it('should store shot data as JSON string', async () => {
    const shotData = {
      teeShot: 'Fairway',
      approach: 'Green',
      putts: ['Long', 'In Hole'],
    };

    const hole = await database.write(async () => {
      return await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 4;
        h.shotData = JSON.stringify(shotData);
      });
    });

    expect(hole.shotData).toBeDefined();
    const parsedData = JSON.parse(hole.shotData!);
    expect(parsedData.teeShot).toBe('Fairway');
    expect(parsedData.putts).toHaveLength(2);
  });

  it('should create multiple holes for a round', async () => {
    await database.write(async () => {
      for (let i = 1; i <= 18; i++) {
        await database.collections.get<Hole>('holes').create((h) => {
          h.roundId = testRound.id;
          h.holeNumber = i;
          h.par = i % 3 === 0 ? 3 : i % 5 === 0 ? 5 : 4;
          h.strokes = 0;
        });
      }
    });

    const holes = await testRound.holes.fetch();
    expect(holes.length).toBe(18);
    
    // Verify hole numbers are correct
    const holeNumbers = holes.map(h => h.holeNumber).sort((a, b) => a - b);
    expect(holeNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('should update hole data', async () => {
    let holeId: string;

    await database.write(async () => {
      const hole = await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 0;
      });
      holeId = hole.id;
    });

    await database.write(async () => {
      const hole = await database.collections.get<Hole>('holes').find(holeId);
      await hole.update((h) => {
        h.strokes = 5;
        h.putts = 2;
        h.fairwayHit = true;
        h.greenInRegulation = false;
      });
    });

    const updatedHole = await database.collections.get<Hole>('holes').find(holeId);
    expect(updatedHole.strokes).toBe(5);
    expect(updatedHole.putts).toBe(2);
    expect(updatedHole.fairwayHit).toBe(true);
    expect(updatedHole.greenInRegulation).toBe(false);
  });

  it('should belong to a round', async () => {
    const hole = await database.write(async () => {
      return await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 4;
      });
    });

    const round = await hole.round.fetch();
    expect(round).toBeDefined();
    expect(round!.id).toBe(testRound.id);
    expect(round!.courseName).toBe('Test Course');
  });

  it('should calculate score relative to par', async () => {
    const hole = await database.write(async () => {
      return await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = testRound.id;
        h.holeNumber = 1;
        h.par = 4;
        h.strokes = 3; // Birdie
      });
    });

    const scoreToPar = hole.strokes - hole.par;
    expect(scoreToPar).toBe(-1); // Birdie
  });
});

