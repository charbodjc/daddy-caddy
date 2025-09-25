import DatabaseService from '../database';
import SQLite from 'react-native-sqlite-storage';
import { GolfRound, GolfHole } from '../../types';

// Mock SQLite
jest.mock('react-native-sqlite-storage', () => ({
  enablePromise: jest.fn(),
  DEBUG: jest.fn(),
  openDatabase: jest.fn(),
}));

describe('DatabaseService - Shot Data', () => {
  let mockDb: any;
  let mockTx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock transaction
    mockTx = {
      executeSql: jest.fn(),
    };

    // Mock database
    mockDb = {
      transaction: jest.fn((callback) => {
        callback(mockTx);
        return Promise.resolve();
      }),
      executeSql: jest.fn(),
    };

    // Mock openDatabase to return our mock database
    (SQLite.openDatabase as jest.Mock).mockResolvedValue(mockDb);
    
    // Reset the DatabaseService singleton
    (DatabaseService as any).db = null;
  });

  describe('saveRound - Shot Data Handling', () => {
    it('should save shot data as string when provided as object', async () => {
      const shotData = {
        par: 4,
        shots: [
          { stroke: 1, type: 'Tee Shot', results: ['Fairway'] },
          { stroke: 2, type: 'Approach', results: ['Green'] },
          { stroke: 3, type: 'Putt', results: ['Holed'] }
        ],
        currentStroke: 4
      };

      const testRound: GolfRound = {
        id: 'test-round-1',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 3,
            shotData: shotData, // Pass as object
          } as GolfHole,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      await DatabaseService.saveRound(testRound);

      // Check that the holes insert was called with stringified shotData
      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeDefined();
      expect(holesInsertCall[1][8]).toBe(JSON.stringify(shotData)); // shotData should be stringified
    });

    it('should preserve shot data when already a string', async () => {
      const shotData = {
        par: 4,
        shots: [
          { stroke: 1, type: 'Tee Shot', results: ['Fairway'] }
        ],
        currentStroke: 2
      };
      const shotDataString = JSON.stringify(shotData);

      const testRound: GolfRound = {
        id: 'test-round-2',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 1,
            shotData: shotDataString, // Pass as string
          } as any,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      await DatabaseService.saveRound(testRound);

      // Check that the holes insert was called with the string as-is
      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeDefined();
      expect(holesInsertCall[1][8]).toBe(shotDataString); // Should not be double-stringified
    });

    it('should handle null shot data', async () => {
      const testRound: GolfRound = {
        id: 'test-round-3',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 4,
            shotData: null,
          } as any,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      await DatabaseService.saveRound(testRound);

      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeDefined();
      expect(holesInsertCall[1][8]).toBeNull(); // shotData should be null
    });
  });

  describe('getRound - Shot Data Retrieval', () => {
    it('should parse shot data from string', async () => {
      const shotData = {
        par: 4,
        shots: [
          { stroke: 1, type: 'Tee Shot', results: ['Fairway'] },
          { stroke: 2, type: 'Approach', results: ['Green'] },
        ],
        currentStroke: 3
      };
      const shotDataString = JSON.stringify(shotData);

      // Mock round query result
      mockDb.executeSql.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM rounds')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                id: 'test-round-1',
                courseName: 'Test Course',
                date: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
            }
          }]);
        } else if (query.includes('SELECT * FROM holes')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                holeNumber: 1,
                par: 4,
                strokes: 2,
                fairwayHit: 1,
                greenInRegulation: 0,
                putts: 1,
                notes: 'Test note',
                shotData: shotDataString,
              })
            }
          }]);
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      await DatabaseService.init();
      const round = await DatabaseService.getRound('test-round-1');

      expect(round).toBeDefined();
      expect(round?.holes).toHaveLength(1);
      expect(round?.holes[0].shotData).toEqual(shotData); // Should be parsed object
    });

    it('should handle invalid JSON in shot data gracefully', async () => {
      // Mock round query result
      mockDb.executeSql.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM rounds')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                id: 'test-round-1',
                courseName: 'Test Course',
                date: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
            }
          }]);
        } else if (query.includes('SELECT * FROM holes')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                holeNumber: 1,
                par: 4,
                strokes: 4,
                fairwayHit: 0,
                greenInRegulation: 0,
                putts: 2,
                notes: null,
                shotData: 'invalid json {broken',
              })
            }
          }]);
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      await DatabaseService.init();
      const round = await DatabaseService.getRound('test-round-1');

      expect(round).toBeDefined();
      expect(round?.holes).toHaveLength(1);
      expect(round?.holes[0].shotData).toBeUndefined(); // Should be undefined when parse fails
    });

    it('should handle null shot data', async () => {
      // Mock round query result
      mockDb.executeSql.mockImplementation((query: string) => {
        if (query.includes('SELECT * FROM rounds')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                id: 'test-round-1',
                courseName: 'Test Course',
                date: Date.now(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              })
            }
          }]);
        } else if (query.includes('SELECT * FROM holes')) {
          return Promise.resolve([{
            rows: {
              length: 1,
              item: () => ({
                holeNumber: 1,
                par: 4,
                strokes: 4,
                fairwayHit: 0,
                greenInRegulation: 0,
                putts: 2,
                notes: null,
                shotData: null,
              })
            }
          }]);
        }
        return Promise.resolve([{ rows: { length: 0 } }]);
      });

      await DatabaseService.init();
      const round = await DatabaseService.getRound('test-round-1');

      expect(round).toBeDefined();
      expect(round?.holes).toHaveLength(1);
      expect(round?.holes[0].shotData).toBeUndefined();
    });
  });

  describe('Missing Fields Handling', () => {
    it('should handle missing createdAt and updatedAt fields gracefully', async () => {
      const testRound: any = {
        id: 'test-round-missing-dates',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 3,
          },
        ],
        // Intentionally missing createdAt and updatedAt
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      
      // Should not throw even with missing dates
      await expect(DatabaseService.saveRound(testRound)).resolves.not.toThrow();
      
      // Check that the round insert was called with default dates
      const roundInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT OR REPLACE INTO rounds')
      );
      
      expect(roundInsertCall).toBeDefined();
      // createdAt and updatedAt should be timestamps (not null/undefined)
      expect(roundInsertCall[1][12]).toBeGreaterThan(0); // createdAt timestamp
      expect(roundInsertCall[1][13]).toBeGreaterThan(0); // updatedAt timestamp
    });

    it('should handle null/undefined holes array', async () => {
      const testRound: any = {
        id: 'test-round-no-holes',
        courseName: 'Test Course',
        date: new Date(),
        holes: undefined, // No holes array
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 0 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      
      // Should not throw even with undefined holes
      await expect(DatabaseService.saveRound(testRound)).resolves.not.toThrow();
      
      // Check that no holes insert was attempted
      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeUndefined();
    });

    it('should handle empty holes array', async () => {
      const testRound: GolfRound = {
        id: 'test-round-empty-holes',
        courseName: 'Test Course',
        date: new Date(),
        holes: [], // Empty holes array
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 0 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      
      // Should not throw even with empty holes
      await expect(DatabaseService.saveRound(testRound)).resolves.not.toThrow();
      
      // Check that no holes insert was attempted
      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeUndefined();
    });
  });

  describe('Score Preservation', () => {
    it('should preserve existing strokes when saving hole with no new shots', async () => {
      const testRound: GolfRound = {
        id: 'test-round-4',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 3, // Existing score
            shotData: JSON.stringify({
              par: 4,
              shots: [], // No new shots recorded
              currentStroke: 1
            }),
          } as any,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      await DatabaseService.saveRound(testRound);

      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeDefined();
      expect(holesInsertCall[1][3]).toBe(3); // strokes should be preserved as 3
    });

    it('should save 0 strokes for unplayed holes', async () => {
      const testRound: GolfRound = {
        id: 'test-round-5',
        courseName: 'Test Course',
        date: new Date(),
        holes: [
          {
            holeNumber: 1,
            par: 4,
            strokes: 0, // Unplayed hole
          } as GolfHole,
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTx.executeSql.mockResolvedValue([{ rows: { length: 0 } }]);
      mockDb.executeSql.mockResolvedValue([{ 
        rows: { 
          item: () => ({ count: 1 }),
          length: 1 
        } 
      }]);

      await DatabaseService.init();
      await DatabaseService.saveRound(testRound);

      const holesInsertCall = mockTx.executeSql.mock.calls.find(
        (call: any[]) => call[0].includes('INSERT INTO holes')
      );
      
      expect(holesInsertCall).toBeDefined();
      expect(holesInsertCall[1][3]).toBe(0); // strokes should be 0 for unplayed hole
    });
  });
});
