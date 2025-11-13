import SQLite from 'react-native-sqlite-storage';
import { GolfRound, GolfHole, MediaItem, Contact, Tournament } from '../types';
import RoundDeletionManager from '../utils/RoundDeletionManager';

// Enable promise-based API
SQLite.enablePromise(true);

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;
  private dbName: string = 'GolfTracker.db';

  async init() {
    if (this.initialized && this.db) {
      console.log('Database already initialized');
      return;
    }

    try {
      console.log('🔄 Starting database initialization...');
      
      // Enable debug mode for troubleshooting
      SQLite.DEBUG(true);
      
      // Open database with error callback
      this.db = await SQLite.openDatabase(
        {
          name: 'GolfTracker.db',
          location: 'default',
        },
        () => {
          console.log('✅ Database opened successfully');
        },
        (error) => {
          console.error('❌ Database open error:', error);
          throw error;
        }
      );

      if (!this.db) {
        throw new Error('Database object is null after opening');
      }

      console.log('✅ Database opened successfully');
      
      // Ensure tables exist
      console.log('🔄 Creating tables...');
      await this.createTables();
      console.log('✅ Tables created successfully');
      
      // Test database
      await this.testDatabase();
      
      // Verify holes table structure
      const holesTableValid = await this.verifyHolesTable();
      if (!holesTableValid) {
        console.error('❌ Holes table structure is invalid, attempting to recreate...');
        // Try to recreate the holes table
        await this.db.executeSql('DROP TABLE IF EXISTS holes');
        await this.db.executeSql(
          `CREATE TABLE holes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            roundId TEXT NOT NULL,
            holeNumber INTEGER NOT NULL,
            par INTEGER NOT NULL,
            strokes INTEGER NOT NULL,
            fairwayHit INTEGER,
            greenInRegulation INTEGER,
            putts INTEGER,
            notes TEXT,
            shotData TEXT,
            FOREIGN KEY (roundId) REFERENCES rounds(id)
          )`
        );
        console.log('✅ Holes table recreated');
      }
      
      this.initialized = true;
      console.log('✅ Database fully initialized and ready');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      this.initialized = false;
      this.db = null;
      throw error; // Re-throw to handle at app level
    }
  }

  private async testDatabase() {
    if (!this.db) {
      console.error('❌ Cannot test database - db is null');
      return;
    }
    
    try {
      // Test if we can query the rounds table
      const [results] = await this.db.executeSql('SELECT COUNT(*) as count FROM rounds');
      console.log('📊 Rounds in database:', results.rows.item(0).count);
      
      // Test if we can query the holes table  
      const [holeResults] = await this.db.executeSql('SELECT COUNT(*) as count FROM holes');
      console.log('📊 Holes in database:', holeResults.rows.item(0).count);
      
      // List all tables
      const [tables] = await this.db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      const tableNames = [];
      for (let i = 0; i < tables.rows.length; i++) {
        tableNames.push(tables.rows.item(i).name);
      }
      console.log('📋 Database tables:', tableNames.join(', '));
    } catch (error) {
      console.error('❌ Database test failed:', error);
    }
  }

  private async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const queries = [
      `CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        startDate INTEGER NOT NULL,
        endDate INTEGER NOT NULL,
        courseName TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        name TEXT,
        tournamentId TEXT,
        tournamentName TEXT,
        courseName TEXT NOT NULL,
        date INTEGER NOT NULL,
        totalScore INTEGER,
        totalPutts INTEGER,
        fairwaysHit INTEGER,
        greensInRegulation INTEGER,
        aiAnalysis TEXT,
        isFinished INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (tournamentId) REFERENCES tournaments(id)
      )`,
      `CREATE TABLE IF NOT EXISTS holes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        roundId TEXT NOT NULL,
        holeNumber INTEGER NOT NULL,
        par INTEGER NOT NULL,
        strokes INTEGER NOT NULL,
        fairwayHit INTEGER,
        greenInRegulation INTEGER,
        putts INTEGER,
        notes TEXT,
        shotData TEXT,
        FOREIGN KEY (roundId) REFERENCES rounds(id)
      )`,
      `CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        isActive INTEGER DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS media (
        id TEXT PRIMARY KEY,
        uri TEXT NOT NULL,
        type TEXT NOT NULL,
        roundId TEXT,
        holeNumber INTEGER,
        timestamp INTEGER NOT NULL,
        description TEXT,
        FOREIGN KEY (roundId) REFERENCES rounds(id)
      )`,
      `CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT
      )`
    ];

    try {
      for (const query of queries) {
        await this.db.executeSql(query);
      }
      console.log('✅ All tables created successfully');
    } catch (error) {
      console.error('❌ Error creating tables:', error);
      throw error;
    }
    
    // Run migrations for existing databases
    await this.runMigrations();
  }
  
  private async runMigrations() {
    if (!this.db) return;
    
    try {
      // Check if 'name' column exists in rounds table
      const [result] = await this.db.executeSql("PRAGMA table_info(rounds)");
      let hasNameColumn = false;
      let hasIsFinishedColumn = false;
      
      for (let i = 0; i < result.rows.length; i++) {
        const column = result.rows.item(i);
        if (column.name === 'name') hasNameColumn = true;
        if (column.name === 'isFinished') hasIsFinishedColumn = true;
      }
      
      // Add 'name' column if it doesn't exist
      if (!hasNameColumn) {
        await this.db.executeSql('ALTER TABLE rounds ADD COLUMN name TEXT');
        console.log('Added name column to rounds table');
      }
      
      // Add 'isFinished' column if it doesn't exist
      if (!hasIsFinishedColumn) {
        await this.db.executeSql('ALTER TABLE rounds ADD COLUMN isFinished INTEGER DEFAULT 0');
        console.log('Added isFinished column to rounds table');
      }
    } catch (error) {
      console.error('Migration error:', error);
    }
  }

  // Round operations
  async saveRound(round: GolfRound): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    console.log('💾 Saving round:', round.id, 'with', round.holes?.length || 0, 'holes');
    console.log('Total score:', round.totalScore);
    console.log('Holes to save:', JSON.stringify(round.holes?.map(h => ({ 
      holeNumber: h.holeNumber, 
      strokes: h.strokes, 
      par: h.par 
    }))));
    
    try {
      await this.db.transaction(async (tx) => {
        console.log('🔄 Transaction started');
        
        // Ensure we have valid dates, use current date as fallback
        const createdAt = round.createdAt || new Date();
        const updatedAt = round.updatedAt || new Date();
        
        // Insert round
        await tx.executeSql(
          `INSERT OR REPLACE INTO rounds 
           (id, name, tournamentId, tournamentName, courseName, date, totalScore, totalPutts, 
            fairwaysHit, greensInRegulation, aiAnalysis, isFinished, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            round.id,
            round.name || null,
            round.tournamentId || null,
            round.tournamentName || null,
            round.courseName,
            round.date.getTime(),
            round.totalScore ?? null,
            round.totalPutts ?? null,
            round.fairwaysHit ?? null,
            round.greensInRegulation ?? null,
            round.aiAnalysis ?? null,
            round.isFinished ? 1 : 0,
            createdAt.getTime(),
            updatedAt.getTime(),
          ]
        );

        // NO LONGER DELETE HOLES - we manage them individually now
        // Holes are saved separately via saveHole() method
        console.log(`✅ Round metadata saved, holes managed separately`);
        console.log('✅ Transaction completed successfully');
      });
      
      // Verification is now less critical since holes are managed separately
      console.log(`✅ Round saved successfully with ID: ${round.id}`);
    } catch (error) {
      console.error('❌ Error saving round:', error);
      throw error;
    }
  }

  async getRounds(): Promise<GolfRound[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM rounds ORDER BY date DESC'
    );

    const rounds: GolfRound[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const roundRow = results.rows.item(i);
      
      const [holeResults] = await this.db.executeSql(
        'SELECT * FROM holes WHERE roundId = ? ORDER BY holeNumber',
        [roundRow.id]
      );

      // Always start with 18 empty holes
      const holes: GolfHole[] = [];
      for (let h = 1; h <= 18; h++) {
        holes.push({
          holeNumber: h,
          par: 4, // Default par
          strokes: 0,
          fairwayHit: undefined,
          greenInRegulation: undefined,
          putts: undefined,
          notes: undefined,
          shotData: undefined,
        });
      }
      
      // Merge saved hole data
      for (let j = 0; j < holeResults.rows.length; j++) {
        const holeRow = holeResults.rows.item(j);
        let parsedShotData = undefined;
        if (holeRow.shotData) {
          try {
            parsedShotData = typeof holeRow.shotData === 'string' 
              ? JSON.parse(holeRow.shotData) 
              : holeRow.shotData;
          } catch (e) {
            console.error(`Error parsing shotData for hole ${holeRow.holeNumber}:`, e);
            parsedShotData = undefined;
          }
        }
        
        // Find and update the corresponding hole
        const holeIndex = holeRow.holeNumber - 1;
        if (holeIndex >= 0 && holeIndex < 18) {
          holes[holeIndex] = {
            holeNumber: holeRow.holeNumber,
            par: holeRow.par,
            strokes: holeRow.strokes ?? 0,
            fairwayHit: holeRow.fairwayHit === 1,
            greenInRegulation: holeRow.greenInRegulation === 1,
            putts: holeRow.putts ?? 0,
            notes: holeRow.notes,
            shotData: parsedShotData,
          };
        }
      }

      rounds.push({
        id: roundRow.id,
        name: roundRow.name,
        tournamentId: roundRow.tournamentId,
        tournamentName: roundRow.tournamentName,
        courseName: roundRow.courseName,
        date: new Date(roundRow.date),
        holes,
        totalScore: roundRow.totalScore,
        totalPutts: roundRow.totalPutts,
        fairwaysHit: roundRow.fairwaysHit,
        greensInRegulation: roundRow.greensInRegulation,
        aiAnalysis: roundRow.aiAnalysis,
        isFinished: roundRow.isFinished === 1,
        createdAt: new Date(roundRow.createdAt),
        updatedAt: new Date(roundRow.updatedAt),
      });
    }

    return rounds;
  }

  async getRound(id: string): Promise<GolfRound | null> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM rounds WHERE id = ?',
      [id]
    );

    if (results.rows.length === 0) return null;

    const roundRow = results.rows.item(0);
    
    const [holeResults] = await this.db.executeSql(
      'SELECT * FROM holes WHERE roundId = ? ORDER BY holeNumber',
      [roundRow.id]
    );

    // Always start with 18 empty holes
    const holes: GolfHole[] = [];
    for (let i = 1; i <= 18; i++) {
      holes.push({
        holeNumber: i,
        par: 4, // Default par
        strokes: 0,
        fairwayHit: undefined,
        greenInRegulation: undefined,
        putts: undefined,
        notes: undefined,
        shotData: undefined,
      });
    }
    
    console.log(`Loading ${holeResults.rows.length} saved holes for round ${id}`);
    
    // Merge saved hole data into the 18-hole array
    for (let j = 0; j < holeResults.rows.length; j++) {
      const holeRow = holeResults.rows.item(j);
      let parsedShotData = undefined;
      if (holeRow.shotData) {
        try {
          parsedShotData = typeof holeRow.shotData === 'string' 
            ? JSON.parse(holeRow.shotData) 
            : holeRow.shotData;
        } catch (e) {
          console.error(`Error parsing shotData for hole ${holeRow.holeNumber}:`, e);
          parsedShotData = undefined;
        }
      }
      
      // Find and update the corresponding hole in our 18-hole array
      const holeIndex = holeRow.holeNumber - 1;
      if (holeIndex >= 0 && holeIndex < 18) {
        holes[holeIndex] = {
          holeNumber: holeRow.holeNumber,
          par: holeRow.par,
          strokes: holeRow.strokes ?? 0,
          fairwayHit: holeRow.fairwayHit === 1,
          greenInRegulation: holeRow.greenInRegulation === 1,
          putts: holeRow.putts ?? 0,
          notes: holeRow.notes,
          shotData: parsedShotData,
        };
      }
    }
    console.log(`Merged ${holeResults.rows.length} saved holes into 18 total holes`);

    return {
      id: roundRow.id,
      name: roundRow.name,
      tournamentId: roundRow.tournamentId,
      tournamentName: roundRow.tournamentName,
      courseName: roundRow.courseName,
      date: new Date(roundRow.date),
      holes,
      totalScore: roundRow.totalScore,
      totalPutts: roundRow.totalPutts,
      fairwaysHit: roundRow.fairwaysHit,
      greensInRegulation: roundRow.greensInRegulation,
      aiAnalysis: roundRow.aiAnalysis,
      isFinished: roundRow.isFinished === 1,
      createdAt: new Date(roundRow.createdAt),
      updatedAt: new Date(roundRow.updatedAt),
    };
  }

  async deleteRound(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    console.log(`🗑️ Deleting round: ${id}`);
    
    try {
      // Delete in reverse dependency order (children first, then parent)
      // Execute deletes individually like clearAllData for better error tracking
      const [holesResult] = await this.db.executeSql('DELETE FROM holes WHERE roundId = ?', [id]);
      console.log(`✅ Deleted ${holesResult.rowsAffected} holes for round ${id}`);
      
      const [mediaResult] = await this.db.executeSql('DELETE FROM media WHERE roundId = ?', [id]);
      console.log(`✅ Deleted ${mediaResult.rowsAffected} media items for round ${id}`);
      
      const [roundsResult] = await this.db.executeSql('DELETE FROM rounds WHERE id = ?', [id]);
      console.log(`✅ Deleted ${roundsResult.rowsAffected} round(s) with id ${id}`);
      
      if (roundsResult.rowsAffected === 0) {
        console.warn(`⚠️ No round found with id ${id} to delete`);
      }
      
      console.log(`✅ Round ${id} deletion completed`);
    } catch (error) {
      console.error(`❌ Error deleting round ${id}:`, error);
      throw error;
    }
    
    // Notify listeners about the deletion AFTER successful delete
    RoundDeletionManager.notifyRoundDeleted(id);
  }

  // Media operations
  async saveMedia(media: MediaItem): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      `INSERT OR REPLACE INTO media (id, uri, type, roundId, holeNumber, timestamp, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        media.id,
        media.uri,
        media.type,
        media.roundId || null,
        media.holeNumber || null,
        media.timestamp.getTime(),
        media.description || null,
      ]
    );
  }

  async getMediaForRound(roundId: string): Promise<MediaItem[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM media WHERE roundId = ? ORDER BY holeNumber, timestamp',
      [roundId]
    );

    const media: MediaItem[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      media.push({
        id: row.id,
        uri: row.uri,
        type: row.type,
        roundId: row.roundId,
        holeNumber: row.holeNumber,
        timestamp: new Date(row.timestamp),
        description: row.description,
      });
    }

    return media;
  }

  async getMediaForHole(roundId: string, holeNumber: number): Promise<MediaItem[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM media WHERE roundId = ? AND holeNumber = ? ORDER BY timestamp',
      [roundId, holeNumber]
    );

    const media: MediaItem[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      media.push({
        id: row.id,
        uri: row.uri,
        type: row.type,
        roundId: row.roundId,
        holeNumber: row.holeNumber,
        timestamp: new Date(row.timestamp),
        description: row.description,
      });
    }

    return media;
  }

  async deleteMedia(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql('DELETE FROM media WHERE id = ?', [id]);
  }

  // Contact operations
  async saveContact(contact: Contact): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      `INSERT OR REPLACE INTO contacts (id, name, phoneNumber, isActive)
       VALUES (?, ?, ?, ?)`,
      [contact.id, contact.name, contact.phoneNumber, contact.isActive ? 1 : 0]
    );
  }

  async getContacts(): Promise<Contact[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM contacts WHERE isActive = 1 ORDER BY name'
    );

    const contacts: Contact[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      contacts.push({
        id: row.id,
        name: row.name,
        phoneNumber: row.phoneNumber,
        isActive: row.isActive === 1,
      });
    }

    return contacts;
  }

  async deleteContact(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql('UPDATE contacts SET isActive = 0 WHERE id = ?', [id]);
  }

  // Tournament operations
  async saveTournament(tournament: Tournament): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      `INSERT OR REPLACE INTO tournaments 
       (id, name, startDate, endDate, courseName, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tournament.id,
        tournament.name,
        tournament.startDate.getTime(),
        tournament.endDate.getTime(),
        tournament.courseName,
        tournament.createdAt.getTime(),
        tournament.updatedAt.getTime(),
      ]
    );
  }

  async getTournaments(): Promise<Tournament[]> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT * FROM tournaments ORDER BY startDate DESC'
    );

    const tournaments: Tournament[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      
      // Get rounds for this tournament
      const rounds = await this.getRounds();
      const tournamentRounds = rounds.filter(r => r.tournamentId === row.id);
      
      tournaments.push({
        id: row.id,
        name: row.name,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        courseName: row.courseName,
        rounds: tournamentRounds,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });
    }

    return tournaments;
  }

  async deleteTournament(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    // Get all rounds for this tournament
    const rounds = await this.getRounds();
    const tournamentRounds = rounds.filter(r => r.tournamentId === id);
    
    // Delete all rounds and their associated data
    for (const round of tournamentRounds) {
      await this.deleteRound(round.id);
    }
    
    // Delete the tournament
    await this.db.executeSql('DELETE FROM tournaments WHERE id = ?', [id]);
  }

  // Preferences
  async setPreference(key: string, value: string): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    await this.db.executeSql(
      'INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)',
      [key, value]
    );
  }

  async getPreference(key: string): Promise<string | null> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const [results] = await this.db.executeSql(
      'SELECT value FROM preferences WHERE key = ?',
      [key]
    );

    if (results.rows.length > 0) {
      return results.rows.item(0).value;
    }
    return null;
  }

  // Export/Import functionality
  async exportData(): Promise<any> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const tournaments = await this.getTournaments();
    const rounds = await this.getRounds();
    const contacts = await this.getContacts();
    
    // Get all media
    const [mediaResults] = await this.db.executeSql('SELECT * FROM media');
    const media = [];
    for (let i = 0; i < mediaResults.rows.length; i++) {
      media.push(mediaResults.rows.item(i));
    }
    
    return {
      version: 1,
      exportDate: new Date().toISOString(),
      tournaments,
      rounds,
      contacts,
      media,
    };
  }

  async importData(data: any): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    try {
      // Import tournaments
      if (data.tournaments && Array.isArray(data.tournaments)) {
        for (const tournament of data.tournaments) {
          await this.saveTournament({
            ...tournament,
            startDate: new Date(tournament.startDate),
            endDate: new Date(tournament.endDate),
            createdAt: new Date(tournament.createdAt),
            updatedAt: new Date(tournament.updatedAt),
          });
        }
      }

      // Import rounds
      if (data.rounds && Array.isArray(data.rounds)) {
        for (const round of data.rounds) {
          await this.saveRound({
            ...round,
            date: new Date(round.date),
            createdAt: new Date(round.createdAt),
            updatedAt: new Date(round.updatedAt),
          });
        }
      }

      // Import contacts
      if (data.contacts && Array.isArray(data.contacts)) {
        for (const contact of data.contacts) {
          await this.saveContact(contact);
        }
      }

      // Import media
      if (data.media && Array.isArray(data.media)) {
        for (const mediaItem of data.media) {
          await this.saveMedia({
            ...mediaItem,
            timestamp: new Date(mediaItem.timestamp),
          });
        }
      }

      console.log('Data import completed successfully');
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Check if database has data
  async hasData(): Promise<boolean> {
    if (!this.db) {
      await this.init();
      if (!this.db) return false;
    }

    try {
      const [result] = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM rounds'
      );
      return result.rows.item(0).count > 0;
    } catch (error) {
      console.error('Error checking database data:', error);
      return false;
    }
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    console.log('🗑️ Starting to clear all data...');
    
    try {
      // Clear SQLite database (legacy)
      const [holesResult] = await this.db.executeSql('DELETE FROM holes');
      console.log(`✅ Deleted ${holesResult.rowsAffected} holes from SQLite`);
      
      const [mediaResult] = await this.db.executeSql('DELETE FROM media');
      console.log(`✅ Deleted ${mediaResult.rowsAffected} media items from SQLite`);
      
      const [roundsResult] = await this.db.executeSql('DELETE FROM rounds');
      console.log(`✅ Deleted ${roundsResult.rowsAffected} rounds from SQLite`);
      
      const [contactsResult] = await this.db.executeSql('DELETE FROM contacts');
      console.log(`✅ Deleted ${contactsResult.rowsAffected} contacts from SQLite`);
      
      const [tournamentsResult] = await this.db.executeSql('DELETE FROM tournaments');
      console.log(`✅ Deleted ${tournamentsResult.rowsAffected} tournaments from SQLite`);
      
      const [preferencesResult] = await this.db.executeSql('DELETE FROM preferences');
      console.log(`✅ Deleted ${preferencesResult.rowsAffected} preferences from SQLite`);
      
      // CRITICAL: Also clear WatermelonDB database (new) - PII compliance requirement
      try {
        const { database } = require('../database/watermelon/database');
        console.log('🗑️ Clearing WatermelonDB data...');
        
        await database.write(async () => {
          await database.unsafeResetDatabase();
        });
        
        console.log('✅ Cleared all WatermelonDB data including contacts');
      } catch (watermelonError) {
        console.error('❌ Error clearing WatermelonDB:', watermelonError);
        // Still throw the error - we must clear all PII data
        throw new Error(`Failed to clear WatermelonDB contacts (PII compliance): ${watermelonError}`);
      }
      
      // Clear AsyncStorage items that might cache data
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('active_round_id');
      await AsyncStorage.removeItem('onboarding_completed');
      console.log('✅ Cleared AsyncStorage cached data');
      
      console.log('✅ All data cleared successfully (SQLite + WatermelonDB + AsyncStorage)');
    } catch (error) {
      console.error('❌ Error clearing data:', error);
      throw error;
    }
  }
  
  // Save or update a single hole
  async saveHole(roundId: string, hole: GolfHole): Promise<boolean> {
    if (!this.db) {
      await this.init();
      if (!this.db) return false;
    }
    
    const strokesValue = hole.strokes || 0;
    console.log(`💾 Saving/updating hole ${hole.holeNumber} for round ${roundId} with ${strokesValue} strokes`);
    
    try {
      // Check if hole already exists
      const [existing] = await this.db.executeSql(
        'SELECT id FROM holes WHERE roundId = ? AND holeNumber = ?',
        [roundId, hole.holeNumber]
      );
      
      let shotDataToSave = hole.shotData;
      if (shotDataToSave && typeof shotDataToSave !== 'string') {
        shotDataToSave = JSON.stringify(shotDataToSave);
      }
      
      if (existing.rows.length > 0) {
        // Update existing hole
        const holeId = existing.rows.item(0).id;
        await this.db.executeSql(
          `UPDATE holes 
           SET par = ?, strokes = ?, fairwayHit = ?, greenInRegulation = ?, 
               putts = ?, notes = ?, shotData = ?
           WHERE id = ?`,
          [
            hole.par || 4,
            strokesValue,
            hole.fairwayHit === true ? 1 : (hole.fairwayHit === false ? 0 : null),
            hole.greenInRegulation === true ? 1 : (hole.greenInRegulation === false ? 0 : null),
            hole.putts || null,
            hole.notes || null,
            shotDataToSave || null,
            holeId
          ]
        );
        console.log(`✅ Hole ${hole.holeNumber} updated successfully`);
      } else {
        // Insert new hole
        await this.db.executeSql(
          `INSERT INTO holes 
           (roundId, holeNumber, par, strokes, fairwayHit, greenInRegulation, putts, notes, shotData)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            roundId,
            hole.holeNumber,
            hole.par || 4,
            strokesValue,
            hole.fairwayHit === true ? 1 : (hole.fairwayHit === false ? 0 : null),
            hole.greenInRegulation === true ? 1 : (hole.greenInRegulation === false ? 0 : null),
            hole.putts || null,
            hole.notes || null,
            shotDataToSave || null
          ]
        );
        console.log(`✅ Hole ${hole.holeNumber} inserted successfully`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error saving hole ${hole.holeNumber}:`, error);
      return false;
    }
  }
  
  // Test method to save a single hole directly
  // Get database instance for testing
  async getDb() {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  async testSaveHole(roundId: string, holeNumber: number): Promise<boolean> {
    if (!this.db) {
      await this.init();
      if (!this.db) return false;
    }
    
    console.log(`🧪 Testing direct hole save for round ${roundId}, hole ${holeNumber}`);
    console.log(`📱 Database instance:`, this.db ? 'exists' : 'null');
    console.log(`📍 Database name:`, this.dbName);
    
    try {
      // First check if holes table exists
      const [tableCheck] = await this.db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='holes'"
      );
      console.log(`📋 Holes table exists: ${tableCheck.rows.length > 0}`);
      
      // Check current count in holes table
      const [countBefore] = await this.db.executeSql('SELECT COUNT(*) as count FROM holes');
      console.log(`📊 Holes count before insert: ${countBefore.rows.item(0).count}`);
      
      // Try to insert with non-zero strokes
      const [insertResult] = await this.db.executeSql(
        `INSERT INTO holes 
         (roundId, holeNumber, par, strokes, fairwayHit, greenInRegulation, putts, notes, shotData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          roundId,
          holeNumber,
          4,  // Default par
          3,  // Non-zero strokes to test
          1,  // fairwayHit
          0,  // greenInRegulation  
          2,  // putts
          'Test hole with strokes',
          null
        ]
      );
      
      console.log(`✅ Insert result - insertId: ${insertResult.insertId}, rowsAffected: ${insertResult.rowsAffected}`);
      
      // Check count after insert
      const [countAfter] = await this.db.executeSql('SELECT COUNT(*) as count FROM holes');
      console.log(`📊 Holes count after insert: ${countAfter.rows.item(0).count}`);
      
      // Verify the specific hole was saved
      const [result] = await this.db.executeSql(
        'SELECT * FROM holes WHERE roundId = ? AND holeNumber = ?',
        [roundId, holeNumber]
      );
      
      if (result.rows.length > 0) {
        const hole = result.rows.item(0);
        console.log('✅ Test hole verified in database:', {
          id: hole.id,
          roundId: hole.roundId,
          holeNumber: hole.holeNumber,
          strokes: hole.strokes,
          par: hole.par
        });
        return true;
      } else {
        console.error('❌ Test hole not found after save');
        return false;
      }
    } catch (error) {
      console.error('❌ Test hole save failed:', error);
      return false;
    }
  }
  
  // Verify holes table structure
  async verifyHolesTable(): Promise<boolean> {
    if (!this.db) {
      await this.init();
      if (!this.db) return false;
    }
    
    try {
      const [result] = await this.db.executeSql("PRAGMA table_info(holes)");
      console.log('🔍 Holes table schema verification:');
      const requiredColumns = ['id', 'roundId', 'holeNumber', 'par', 'strokes'];
      const foundColumns: string[] = [];
      
      for (let i = 0; i < result.rows.length; i++) {
        const column = result.rows.item(i);
        foundColumns.push(column.name);
        console.log(`  ${column.name}: ${column.type} ${column.notnull ? 'NOT NULL' : 'NULL'} ${column.pk ? '(PRIMARY KEY)' : ''}`);
      }
      
      // Check if all required columns exist
      const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));
      if (missingColumns.length > 0) {
        console.error('❌ Missing required columns in holes table:', missingColumns);
        return false;
      }
      
      console.log('✅ Holes table structure verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Error verifying holes table:', error);
      return false;
    }
  }
  
  // Diagnostic function to check database contents
  async getDatabaseDiagnostics(): Promise<any> {
    if (!this.db) {
      await this.init();
      if (!this.db) return { error: 'Database not initialized' };
    }

    try {
      const diagnostics: any = {
        database: 'GolfTracker.db',
        location: 'default',
        tables: {},
        timestamp: new Date().toISOString()
      };

      // Get all tables
      const [tables] = await this.db.executeSql(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );
      
      for (let i = 0; i < tables.rows.length; i++) {
        const tableName = tables.rows.item(i).name;
        
        // Get row count for each table
        const [countResult] = await this.db.executeSql(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        
        // Get table schema
        const [schemaResult] = await this.db.executeSql(
          `PRAGMA table_info(${tableName})`
        );
        
        const columns = [];
        for (let j = 0; j < schemaResult.rows.length; j++) {
          const col = schemaResult.rows.item(j);
          columns.push({
            name: col.name,
            type: col.type,
            notNull: col.notnull === 1,
            defaultValue: col.dflt_value,
            primaryKey: col.pk === 1
          });
        }
        
        // Get sample data (first 3 rows)
        const [sampleData] = await this.db.executeSql(
          `SELECT * FROM ${tableName} LIMIT 3`
        );
        
        const samples = [];
        for (let k = 0; k < sampleData.rows.length; k++) {
          samples.push(sampleData.rows.item(k));
        }
        
        diagnostics.tables[tableName] = {
          rowCount: countResult.rows.item(0).count,
          columns: columns,
          sampleData: samples
        };
      }
      
      console.log('📊 DATABASE DIAGNOSTICS:');
      console.log('========================');
      console.log(JSON.stringify(diagnostics, null, 2));
      console.log('========================');
      
      return diagnostics;
    } catch (error) {
      console.error('❌ Error running diagnostics:', error);
      return { error: error.toString() };
    }
  }
}

export default new DatabaseService();