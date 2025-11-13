import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { database } from '../../database/watermelon/database';
import Round from '../../database/watermelon/models/Round';
import Hole from '../../database/watermelon/models/Hole';
import Tournament from '../../database/watermelon/models/Tournament';
import Media from '../../database/watermelon/models/Media';
import Contact from '../../database/watermelon/models/Contact';

// Export data structure
export interface ExportedData {
  version: number;
  exportDate: string;
  rounds: Array<{
    id: string;
    courseName: string;
    date: string;
    isFinished: boolean;
    tournamentId?: string;
    tournamentName?: string;
    totalScore?: number;
    totalPutts?: number;
    fairwaysHit?: number;
    greensInRegulation?: number;
    aiAnalysis?: string;
    holes?: Array<{
      holeNumber: number;
      par: number;
      strokes: number;
      fairwayHit?: boolean;
      greenInRegulation?: boolean;
      putts?: number;
      notes?: string;
      shotData?: string | object;
    }>;
  }>;
  tournaments: Array<{
    id: string;
    name: string;
    courseName: string;
    startDate: string;
    endDate: string;
  }>;
  contacts: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    isActive: boolean;
  }>;
  media: Array<{
    id: string;
    uri: string;
    type: string;
    timestamp: string;
    roundId?: string;
    holeNumber?: number;
    description?: string;
  }>;
}

/**
 * Export all data from the database to a JSON file
 */
export const exportLegacyData = async (): Promise<string> => {
  try {
    console.log('Starting data export...');

    // Fetch all data from database
    const roundsCollection = database.collections.get<Round>('rounds');
    const holesCollection = database.collections.get<Hole>('holes');
    const tournamentsCollection = database.collections.get<Tournament>('tournaments');
    const mediaCollection = database.collections.get<Media>('media');
    const contactsCollection = database.collections.get<Contact>('contacts');

    const rounds = await roundsCollection.query().fetch();
    const tournaments = await tournamentsCollection.query().fetch();
    const contacts = await contactsCollection.query().fetch();
    const media = await mediaCollection.query().fetch();

    console.log('Fetched data:', {
      rounds: rounds.length,
      tournaments: tournaments.length,
      contacts: contacts.length,
      media: media.length,
    });

    // Build export data structure
    const exportData: ExportedData = {
      version: 1,
      exportDate: new Date().toISOString(),
      rounds: [],
      tournaments: [],
      contacts: [],
      media: [],
    };

    // Export tournaments
    for (const tournament of tournaments) {
      exportData.tournaments.push({
        id: tournament.id,
        name: tournament.name,
        courseName: tournament.courseName,
        startDate: tournament.startDate.toISOString(),
        endDate: tournament.endDate.toISOString(),
      });
    }

    // Export rounds with their holes
    for (const round of rounds) {
      const roundHoles = await holesCollection
        .query(require('@nozbe/watermelondb/QueryDescription').Q.where('round_id', round.id))
        .fetch();

      exportData.rounds.push({
        id: round.id,
        courseName: round.courseName,
        date: round.date.toISOString(),
        isFinished: round.isFinished,
        tournamentId: round.tournamentId || undefined,
        tournamentName: round.tournamentName || undefined,
        totalScore: round.totalScore || undefined,
        totalPutts: round.totalPutts || undefined,
        fairwaysHit: round.fairwaysHit || undefined,
        greensInRegulation: round.greensInRegulation || undefined,
        aiAnalysis: round.aiAnalysis || undefined,
        holes: roundHoles.map((hole) => ({
          holeNumber: hole.holeNumber,
          par: hole.par,
          strokes: hole.strokes,
          fairwayHit: hole.fairwayHit,
          greenInRegulation: hole.greenInRegulation,
          putts: hole.putts || undefined,
          notes: hole.notes || undefined,
          shotData: hole.shotData || undefined,
        })),
      });
    }

    // Export contacts
    for (const contact of contacts) {
      exportData.contacts.push({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        isActive: contact.isActive,
      });
    }

    // Export media
    for (const mediaItem of media) {
      exportData.media.push({
        id: mediaItem.id,
        uri: mediaItem.uri,
        type: mediaItem.type,
        timestamp: mediaItem.timestamp.toISOString(),
        roundId: mediaItem.roundId || undefined,
        holeNumber: mediaItem.holeNumber || undefined,
        description: mediaItem.description || undefined,
      });
    }

    // Write to file
    const fileName = `daddy_caddy_export_${new Date().getTime()}.json`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log('Export completed:', filePath);
    
    return filePath;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Share an export file using the native share dialog
 */
export const shareExportFile = async (filePath: string): Promise<void> => {
  try {
    const fileExists = await RNFS.exists(filePath);
    
    if (!fileExists) {
      throw new Error('Export file not found');
    }

    await Share.open({
      title: 'Export Daddy Caddy Data',
      message: 'Backup of your golf data from Daddy Caddy',
      url: `file://${filePath}`,
      type: 'application/json',
      filename: filePath.split('/').pop() || 'daddy_caddy_export.json',
    });
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.message !== 'User did not share') {
      console.error('Share failed:', error);
      throw error;
    }
  }
};

