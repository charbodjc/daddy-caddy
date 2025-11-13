import RNFS from 'react-native-fs';
import DatabaseService from '../../services/database'; // Old legacy database
import { Share, Alert } from 'react-native';

export interface ExportedData {
  version: number;
  exportDate: string;
  rounds: any[];
  tournaments: any[];
  contacts: any[];
  media: any[];
}

export const exportLegacyData = async (): Promise<string> => {
  try {
    console.log('Starting data export...');
    
    // Fetch all data from legacy database
    const rounds = await DatabaseService.getRounds();
    const tournaments = await DatabaseService.getTournaments();
    const contacts = await DatabaseService.getContacts();
    
    // Get all media (need to query directly)
    const media: any[] = [];
    for (const round of rounds) {
      const roundMedia = await DatabaseService.getMediaForRound(round.id);
      media.push(...roundMedia);
    }
    
    const exportData: ExportedData = {
      version: 1,
      exportDate: new Date().toISOString(),
      rounds: rounds.map(round => ({
        ...round,
        date: round.date.toISOString(),
        createdAt: round.createdAt.toISOString(),
        updatedAt: round.updatedAt.toISOString(),
      })),
      tournaments: tournaments.map(tournament => ({
        ...tournament,
        startDate: tournament.startDate.toISOString(),
        endDate: tournament.endDate.toISOString(),
        createdAt: tournament.createdAt.toISOString(),
        updatedAt: tournament.updatedAt.toISOString(),
      })),
      contacts,
      media: media.map(item => ({
        ...item,
        timestamp: item.timestamp.toISOString(),
      })),
    };
    
    console.log('Export data prepared:', {
      rounds: exportData.rounds.length,
      tournaments: exportData.tournaments.length,
      contacts: exportData.contacts.length,
      media: exportData.media.length,
    });
    
    // Create export file
    const fileName = `daddy-caddy-export-${Date.now()}.json`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
    
    await RNFS.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
    
    console.log('Export file created:', filePath);
    
    return filePath;
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const shareExportFile = async (filePath: string): Promise<void> => {
  try {
    await Share.share({
      url: `file://${filePath}`,
      title: 'Daddy Caddy Data Export',
      message: 'Your golf data export file',
    });
  } catch (error) {
    console.error('Share failed:', error);
    Alert.alert('Error', 'Failed to share export file');
  }
};

export const getExportFilePath = (): string => {
  const fileName = `daddy-caddy-export-${Date.now()}.json`;
  return `${RNFS.DocumentDirectoryPath}/${fileName}`;
};

export const checkDataExists = async (): Promise<boolean> => {
  try {
    const rounds = await DatabaseService.getRounds();
    return rounds.length > 0;
  } catch (error) {
    return false;
  }
};

