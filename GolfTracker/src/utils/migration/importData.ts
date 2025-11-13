import RNFS from 'react-native-fs';
import { database } from '../../database/watermelon/database';
import Round from '../../database/watermelon/models/Round';
import Hole from '../../database/watermelon/models/Hole';
import Tournament from '../../database/watermelon/models/Tournament';
import Media from '../../database/watermelon/models/Media';
import Contact from '../../database/watermelon/models/Contact';
import { ExportedData } from './exportData';

interface ImportProgress {
  stage: string;
  current: number;
  total: number;
}

export type ImportProgressCallback = (progress: ImportProgress) => void;

export const importLegacyData = async (
  filePath: string,
  onProgress?: ImportProgressCallback
): Promise<void> => {
  try {
    console.log('Reading import file:', filePath);
    
    // Read and parse the export file
    const content = await RNFS.readFile(filePath, 'utf8');
    const data: ExportedData = JSON.parse(content);
    
    console.log('Import data loaded:', {
      version: data.version,
      exportDate: data.exportDate,
      rounds: data.rounds.length,
      tournaments: data.tournaments.length,
      contacts: data.contacts.length,
      media: data.media.length,
    });
    
    // Validate data version
    if (data.version !== 1) {
      throw new Error(`Unsupported export version: ${data.version}`);
    }
    
    // Import in a single transaction for consistency
    await database.write(async () => {
      // Import tournaments first (referenced by rounds)
      onProgress?.({
        stage: 'Importing tournaments',
        current: 0,
        total: data.tournaments.length,
      });
      
      for (let i = 0; i < data.tournaments.length; i++) {
        const tournamentData = data.tournaments[i];
        await database.collections.get<Tournament>('tournaments').create((tournament) => {
          tournament._raw.id = tournamentData.id; // Preserve original ID
          tournament.name = tournamentData.name;
          tournament.courseName = tournamentData.courseName;
          tournament.startDate = new Date(tournamentData.startDate);
          tournament.endDate = new Date(tournamentData.endDate);
        });
        
        onProgress?.({
          stage: 'Importing tournaments',
          current: i + 1,
          total: data.tournaments.length,
        });
      }
      
      // Import rounds
      onProgress?.({
        stage: 'Importing rounds',
        current: 0,
        total: data.rounds.length,
      });
      
      for (let i = 0; i < data.rounds.length; i++) {
        const roundData = data.rounds[i];
        
        // Create the round
        await database.collections.get<Round>('rounds').create((round) => {
          round._raw.id = roundData.id; // Preserve original ID
          round.courseName = roundData.courseName;
          round.date = new Date(roundData.date);
          round.isFinished = roundData.isFinished ?? false;
          
          if (roundData.tournamentId) round.tournamentId = roundData.tournamentId;
          if (roundData.tournamentName) round.tournamentName = roundData.tournamentName;
          if (roundData.totalScore) round.totalScore = roundData.totalScore;
          if (roundData.totalPutts) round.totalPutts = roundData.totalPutts;
          if (roundData.fairwaysHit) round.fairwaysHit = roundData.fairwaysHit;
          if (roundData.greensInRegulation) round.greensInRegulation = roundData.greensInRegulation;
          if (roundData.aiAnalysis) round.aiAnalysis = roundData.aiAnalysis;
        });
        
        // Create holes for this round
        if (roundData.holes && Array.isArray(roundData.holes)) {
          for (const holeData of roundData.holes) {
            await database.collections.get<Hole>('holes').create((hole) => {
              hole.roundId = roundData.id;
              hole.holeNumber = holeData.holeNumber;
              hole.par = holeData.par;
              hole.strokes = holeData.strokes || 0;
              
              if (holeData.fairwayHit !== undefined) hole.fairwayHit = holeData.fairwayHit;
              if (holeData.greenInRegulation !== undefined) hole.greenInRegulation = holeData.greenInRegulation;
              if (holeData.putts) hole.putts = holeData.putts;
              if (holeData.notes) hole.notes = holeData.notes;
              if (holeData.shotData) {
                hole.shotData = typeof holeData.shotData === 'string' 
                  ? holeData.shotData 
                  : JSON.stringify(holeData.shotData);
              }
            });
          }
        }
        
        onProgress?.({
          stage: 'Importing rounds',
          current: i + 1,
          total: data.rounds.length,
        });
      }
      
      // Import contacts
      onProgress?.({
        stage: 'Importing contacts',
        current: 0,
        total: data.contacts.length,
      });
      
      for (let i = 0; i < data.contacts.length; i++) {
        const contactData = data.contacts[i];
        await database.collections.get<Contact>('contacts').create((contact) => {
          contact._raw.id = contactData.id;
          contact.name = contactData.name;
          contact.phoneNumber = contactData.phoneNumber;
          contact.isActive = contactData.isActive ?? true;
        });
        
        onProgress?.({
          stage: 'Importing contacts',
          current: i + 1,
          total: data.contacts.length,
        });
      }
      
      // Import media
      onProgress?.({
        stage: 'Importing media',
        current: 0,
        total: data.media.length,
      });
      
      for (let i = 0; i < data.media.length; i++) {
        const mediaData = data.media[i];
        await database.collections.get<Media>('media').create((media) => {
          media._raw.id = mediaData.id;
          media.uri = mediaData.uri;
          media.type = (mediaData.type === 'video' ? 'video' : 'photo') as 'photo' | 'video';
          media.timestamp = new Date(mediaData.timestamp);
          
          if (mediaData.roundId) media.roundId = mediaData.roundId;
          if (mediaData.holeNumber) media.holeNumber = mediaData.holeNumber;
          if (mediaData.description) media.description = mediaData.description;
        });
        
        onProgress?.({
          stage: 'Importing media',
          current: i + 1,
          total: data.media.length,
        });
      }
    });
    
    console.log('Import completed successfully');
    
    onProgress?.({
      stage: 'Complete',
      current: 1,
      total: 1,
    });
  } catch (error) {
    console.error('Import failed:', error);
    throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const validateImportFile = async (filePath: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.version) {
      return { valid: false, error: 'Missing version field' };
    }
    
    if (data.version !== 1) {
      return { valid: false, error: `Unsupported version: ${data.version}` };
    }
    
    if (!Array.isArray(data.rounds)) {
      return { valid: false, error: 'Invalid rounds data' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: `Invalid file format: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
};

