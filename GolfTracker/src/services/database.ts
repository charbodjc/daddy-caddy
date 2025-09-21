import SQLite from 'react-native-sqlite-storage';
import { GolfRound, Tournament, Contact, MediaItem } from '../types';

SQLite.enablePromise(true);

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized: boolean = false;

  async init() {
    if (this.initialized && this.db) {
      console.log('Database already initialized');
      return;
    }

    try {
      console.log('Starting database initialization...');
      
      // Enable debug mode for SQLite
      SQLite.DEBUG(true);
      
      // Open database with default location for compatibility
      this.db = await SQLite.openDatabase({
        name: 'GolfTracker.db',
        location: 'default', // Use default for better compatibility
        createFromLocation: '~GolfTracker.db',
      });

      console.log('Database opened successfully');
      
      // Test the connection
      await this.db.executeSql('SELECT 1');
      console.log('Database connection verified');
      
      await this.createTables();
      this.initialized = true;
      console.log('Database tables created/verified');
    } catch (error) {
      console.error('Database initialization error:', error);
      this.db = null;
      this.initialized = false;
      throw error;
    }
  }

  private async createTables() {
    if (!this.db) return;

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
        tournamentId TEXT,
        tournamentName TEXT,
        courseName TEXT NOT NULL,
        date INTEGER NOT NULL,
        totalScore INTEGER,
        totalPutts INTEGER,
        fairwaysHit INTEGER,
        greensInRegulation INTEGER,
        aiAnalysis TEXT,
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
    ];

    for (const query of queries) {
      await this.db.executeSql(query);
    }
  }

  // Round operations
  async saveRound(round: GolfRound): Promise<void> {
    if (!this.db) {
      await this.init();
      if (!this.db) throw new Error('Database not initialized');
    }

    const tx = await this.db.transaction();
    try {
      // Insert round
      await tx.executeSql(
        `INSERT OR REPLACE INTO rounds 
         (id, tournamentId, tournamentName, courseName, date, totalScore, totalPutts, 
          fairwaysHit, greensInRegulation, aiAnalysis, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          round.id,
          round.tournamentId || null,
          round.tournamentName || null,
          round.courseName,
          round.date.getTime(),
          round.totalScore || null,
          round.totalPutts || null,
          round.fairwaysHit || null,
          round.greensInRegulation || null,
          round.aiAnalysis || null,
          round.createdAt.getTime(),
          round.updatedAt.getTime(),
        ]
      );

      // Delete existing holes for this round
      await tx.executeSql('DELETE FROM holes WHERE roundId = ?', [round.id]);

      // Insert holes
      for (const hole of round.holes) {
        await tx.executeSql(
          `INSERT INTO holes 
           (roundId, holeNumber, par, strokes, fairwayHit, greenInRegulation, putts, notes, shotData)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            round.id,
            hole.holeNumber,
            hole.par,
            hole.strokes,
            hole.fairwayHit ? 1 : 0,
            hole.greenInRegulation ? 1 : 0,
            hole.putts || null,
            hole.notes || null,
            hole.shotData ? JSON.stringify(hole.shotData) : null,
          ]
        );
      }
    } catch (error) {
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
        holes.push({
          holeNumber: holeRow.holeNumber,
          par: holeRow.par,
          strokes: holeRow.strokes,
          fairwayHit: holeRow.fairwayHit === 1,
          greenInRegulation: holeRow.greenInRegulation === 1,
          putts: holeRow.putts,
          notes: holeRow.notes,
          shotData: holeRow.shotData ? JSON.parse(holeRow.shotData) : undefined,
        });
      }

      rounds.push({
        id: roundRow.id,
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
    for (let j = 0; j < holeResults.rows.length; j++) {
      const holeRow = holeResults.rows.item(j);
      holes.push({
        holeNumber: holeRow.holeNumber,
        par: holeRow.par,
        strokes: holeRow.strokes,
        fairwayHit: holeRow.fairwayHit === 1,
        greenInRegulation: holeRow.greenInRegulation === 1,
        putts: holeRow.putts,
        notes: holeRow.notes,
        shotData: holeRow.shotData ? JSON.parse(holeRow.shotData) : undefined,
      });
    }

    return {
      id: roundRow.id,
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
      createdAt: new Date(roundRow.createdAt),
      updatedAt: new Date(roundRow.updatedAt),
    };
  }

  // Contact operations
  async saveContact(contact: Contact): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      `INSERT OR REPLACE INTO contacts (id, name, phoneNumber, isActive)
       VALUES (?, ?, ?, ?)`,
      [contact.id, contact.name, contact.phoneNumber, contact.isActive ? 1 : 0]
    );
  }

  async getContacts(): Promise<Contact[]> {
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM contacts WHERE isActive = 1'
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
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      'UPDATE contacts SET isActive = 0 WHERE id = ?',
      [id]
    );
  }

  // Media operations
  async saveMedia(media: MediaItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql(
      `INSERT OR REPLACE INTO media 
       (id, uri, type, roundId, holeNumber, timestamp, description)
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
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM media WHERE roundId = ? ORDER BY timestamp DESC',
      [roundId]
    );

    const mediaItems: MediaItem[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      mediaItems.push({
        id: row.id,
        uri: row.uri,
        type: row.type as 'photo' | 'video',
        roundId: row.roundId,
        holeNumber: row.holeNumber,
        timestamp: new Date(row.timestamp),
        description: row.description,
      });
    }

    return mediaItems;
  }

  // Tournament operations
  async saveTournament(tournament: Tournament): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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
    if (!this.db) throw new Error('Database not initialized');

    const [results] = await this.db.executeSql(
      'SELECT * FROM tournaments ORDER BY startDate DESC'
    );

    const tournaments: Tournament[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      
      // Get rounds for this tournament
      const [roundResults] = await this.db.executeSql(
        'SELECT id FROM rounds WHERE tournamentId = ?',
        [row.id]
      );

      const rounds: GolfRound[] = [];
      for (let j = 0; j < roundResults.rows.length; j++) {
        const roundRow = roundResults.rows.item(j);
        const round = await this.getRound(roundRow.id);
        if (round) rounds.push(round);
      }

      tournaments.push({
        id: row.id,
        name: row.name,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        courseName: row.courseName,
        rounds,
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });
    }

    return tournaments;
  }

  // Backup and restore methods for data persistence
  async exportData(): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rounds = await this.getRounds();
      const tournaments = await this.getTournaments();
      const contacts = await this.getContacts();
      
      // Get all media items
      const [mediaResult] = await this.db.executeSql(
        'SELECT * FROM media ORDER BY timestamp DESC'
      );
      
      const media = [];
      for (let i = 0; i < mediaResult.rows.length; i++) {
        media.push(mediaResult.rows.item(i));
      }

      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        rounds,
        tournaments,
        contacts,
        media,
      };

      console.log(`Exported ${rounds.length} rounds, ${tournaments.length} tournaments, ${contacts.length} contacts, ${media.length} media items`);
      return exportData;
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  async importData(data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Import contacts
      if (data.contacts && Array.isArray(data.contacts)) {
        for (const contact of data.contacts) {
          await this.saveContact(contact);
        }
      }

      // Import tournaments
      if (data.tournaments && Array.isArray(data.tournaments)) {
        for (const tournament of data.tournaments) {
          await this.saveTournament(tournament);
        }
      }

      // Import rounds
      if (data.rounds && Array.isArray(data.rounds)) {
        for (const round of data.rounds) {
          await this.saveRound(round);
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
    if (!this.db) return false;

    try {
      const [result] = await this.db.executeSql(
        'SELECT COUNT(*) as count FROM rounds'
      );
      return result.rows.item(0).count > 0;
    } catch (error) {
      console.error('Error checking for data:', error);
      return false;
    }
  }
}

export default new DatabaseService();
