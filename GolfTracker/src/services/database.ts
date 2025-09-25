import SQLite from 'react-native-sqlite-storage';
import { GolfRound, MediaItem, Contact, Tournament } from '../types';
import RoundDeletionManager from './roundManager';

// Enable promise-based API
SQLite.enablePromise(true);

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;

  private async init() {
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

        // Delete existing holes for this round
        await tx.executeSql('DELETE FROM holes WHERE roundId = ?', [round.id]);

        // Insert holes (only if holes array exists and has items)
        if (round.holes && round.holes.length > 0) {
          console.log(`📝 Inserting ${round.holes.length} holes...`);
          for (const hole of round.holes) {
          const strokesValue = hole.strokes ?? 0;
          console.log(`💾 Saving hole ${hole.holeNumber}: strokes=${strokesValue}, par=${hole.par}`);
          
          // shotData might already be a string if it came from ShotTrackingScreen
          let shotDataToSave = hole.shotData;
          if (shotDataToSave && typeof shotDataToSave !== 'string') {
            shotDataToSave = JSON.stringify(shotDataToSave);
          }
          
          try {
            await tx.executeSql(
              `INSERT INTO holes 
               (roundId, holeNumber, par, strokes, fairwayHit, greenInRegulation, putts, notes, shotData)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                round.id,
                hole.holeNumber,
                hole.par ?? 4,  // Default par to 4 if not set
                strokesValue,  // Ensure strokes is always a number
                hole.fairwayHit ? 1 : 0,
                hole.greenInRegulation ? 1 : 0,
                hole.putts ?? null,
                hole.notes ?? null,
                shotDataToSave,
              ]
            );
            console.log(`✅ Hole ${hole.holeNumber} saved successfully`);
          } catch (holeError) {
            console.error(`❌ Error saving hole ${hole.holeNumber}:`, holeError);
            throw holeError;
          }
        }
        } else {
          console.log('⚠️ No holes to save for this round');
        }
        console.log('✅ Transaction completed successfully');
      });
      
      console.log('🔍 Verifying saved data...');
      // Verify holes were saved
      const [verifyResult] = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM holes WHERE roundId = ?',
        [round.id]
      );
      const savedHolesCount = verifyResult.rows.item(0).count;
      const expectedHoles = round.holes?.length || 0;
      console.log(`✅ Round saved successfully. Verified ${savedHolesCount} holes in database for round ${round.id}`);
      
      if (savedHolesCount !== expectedHoles) {
        console.error(`⚠️ Warning: Expected ${expectedHoles} holes but only ${savedHolesCount} were saved`);
      }
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

      const holes = [];
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
        holes.push({
          holeNumber: holeRow.holeNumber,
          par: holeRow.par,
          strokes: holeRow.strokes ?? 0,  // Use nullish coalescing instead of ||
          fairwayHit: holeRow.fairwayHit === 1,
          greenInRegulation: holeRow.greenInRegulation === 1,
          putts: holeRow.putts ?? 0,  // Use nullish coalescing
          notes: holeRow.notes,
          shotData: parsedShotData,
        });
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

    const holes = [];
    console.log(`Loading ${holeResults.rows.length} holes for round ${id}`);
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
      const hole = {
        holeNumber: holeRow.holeNumber,
        par: holeRow.par,
        strokes: holeRow.strokes ?? 0,  // Use nullish coalescing instead of ||
        fairwayHit: holeRow.fairwayHit === 1,
        greenInRegulation: holeRow.greenInRegulation === 1,
        putts: holeRow.putts ?? 0,  // Use nullish coalescing
        notes: holeRow.notes,
        shotData: parsedShotData,
      };
      holes.push(hole);
    }
    console.log('First hole loaded:', holes[0]);

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

    await this.db.transaction(async (tx) => {
      await tx.executeSql('DELETE FROM holes WHERE roundId = ?', [id]);
      await tx.executeSql('DELETE FROM media WHERE roundId = ?', [id]);
      await tx.executeSql('DELETE FROM rounds WHERE id = ?', [id]);
    });
    
    // Notify listeners about the deletion
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

    await this.db.transaction(async (tx) => {
      await tx.executeSql('DELETE FROM holes');
      await tx.executeSql('DELETE FROM media');
      await tx.executeSql('DELETE FROM rounds');
      await tx.executeSql('DELETE FROM contacts');
      await tx.executeSql('DELETE FROM tournaments');
      await tx.executeSql('DELETE FROM preferences');
    });
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