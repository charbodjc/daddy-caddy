import { database } from '../../src/database/watermelon/database';
import Round from '../../src/database/watermelon/models/Round';
import Hole from '../../src/database/watermelon/models/Hole';
import Tournament from '../../src/database/watermelon/models/Tournament';

export const createTestRound = async (overrides?: Partial<{
  courseName: string;
  date: Date;
  isFinished: boolean;
  tournamentId?: string;
  tournamentName?: string;
}>) => {
  return await database.write(async () => {
    return await database.collections.get<Round>('rounds').create((r) => {
      r.courseName = overrides?.courseName || 'Test Course';
      r.date = overrides?.date || new Date();
      r.isFinished = overrides?.isFinished ?? false;
      if (overrides?.tournamentId) r.tournamentId = overrides.tournamentId;
      if (overrides?.tournamentName) r.tournamentName = overrides.tournamentName;
    });
  });
};

export const createTestHole = async (roundId: string, holeNumber: number, overrides?: Partial<{
  par: number;
  strokes: number;
  fairwayHit?: boolean;
  greenInRegulation?: boolean;
  putts?: number;
}>) => {
  return await database.write(async () => {
    return await database.collections.get<Hole>('holes').create((h) => {
      h.roundId = roundId;
      h.holeNumber = holeNumber;
      h.par = overrides?.par || 4;
      h.strokes = overrides?.strokes || 0;
      if (overrides?.fairwayHit !== undefined) h.fairwayHit = overrides.fairwayHit;
      if (overrides?.greenInRegulation !== undefined) h.greenInRegulation = overrides.greenInRegulation;
      if (overrides?.putts !== undefined) h.putts = overrides.putts;
    });
  });
};

export const createTestTournament = async (overrides?: Partial<{
  name: string;
  courseName: string;
  startDate: Date;
  endDate: Date;
}>) => {
  return await database.write(async () => {
    return await database.collections.get<Tournament>('tournaments').create((t) => {
      t.name = overrides?.name || 'Test Tournament';
      t.courseName = overrides?.courseName || 'Test Course';
      t.startDate = overrides?.startDate || new Date();
      t.endDate = overrides?.endDate || new Date();
    });
  });
};

export const create18Holes = async (roundId: string) => {
  await database.write(async () => {
    for (let i = 1; i <= 18; i++) {
      await database.collections.get<Hole>('holes').create((h) => {
        h.roundId = roundId;
        h.holeNumber = i;
        h.par = i % 3 === 0 ? 3 : i % 5 === 0 ? 5 : 4;
        h.strokes = 0;
      });
    }
  });
};

