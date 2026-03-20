import * as ImagePicker from 'expo-image-picker';
import RNFS from 'react-native-fs';
import { MediaItem } from '../types';
import { database } from '../database/watermelon/database';
import MediaModel from '../database/watermelon/models/Media';
import { Q } from '@nozbe/watermelondb';

class MediaService {
  // Use getter to avoid accessing native module at class initialization time
  private get mediaDir(): string {
    return `${RNFS.DocumentDirectoryPath}/media`;
  }

  private async ensureMediaDirectory(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.mediaDir);
      if (!exists) {
        await RNFS.mkdir(this.mediaDir);
        console.info('MediaService: created media directory');
      }
    } catch (error) {
      console.error('Error creating media directory:', error);
    }
  }

  private async copyToPermanentStorage(tempUri: string, mediaType: 'photo' | 'video'): Promise<string> {
    await this.ensureMediaDirectory();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const extension = mediaType === 'photo' ? '.jpg' : '.mp4';
    const fileName = `${mediaType}_${timestamp}_${random}${extension}`;
    const destPath = `${this.mediaDir}/${fileName}`;

    await RNFS.copyFile(tempUri, destPath);
    console.info(`MediaService: copied ${mediaType} to permanent storage`);
    return destPath;
  }

  private async requestCameraPermission(): Promise<boolean> {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  }

  private async saveMediaToDb(item: MediaItem): Promise<MediaModel> {
    return await database.write(async () => {
      const record = await database.get<MediaModel>('media').create((m) => {
        m.uri = item.uri;
        m.type = item.type as 'photo' | 'video';
        if (item.roundId) m.roundId = item.roundId;
        if (item.holeNumber !== undefined) m.holeNumber = item.holeNumber;
        m.timestamp = item.timestamp;
        if (item.description) m.description = item.description;
      });
      return record;
    });
  }

  private mediaModelToItem(m: MediaModel): MediaItem {
    return {
      id: m.id,
      uri: m.uri,
      type: m.type,
      roundId: m.roundId || '',
      holeNumber: m.holeNumber,
      timestamp: m.timestamp,
      description: m.description,
    };
  }

  async getMediaForRound(roundId: string): Promise<MediaItem[]> {
    const records = await database.get<MediaModel>('media')
      .query(Q.where('round_id', roundId))
      .fetch();
    return records.map(m => this.mediaModelToItem(m));
  }

  async getMediaForHole(roundId: string, holeNumber: number): Promise<MediaItem[]> {
    const records = await database.get<MediaModel>('media')
      .query(Q.where('round_id', roundId), Q.where('hole_number', holeNumber))
      .fetch();
    return records.map(m => this.mediaModelToItem(m));
  }

  async captureMedia(type: 'photo' | 'video' | 'mixed'): Promise<MediaItem | null> {
    const hasPermission = await this.requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permissions not granted');
    }

    const mediaTypes: ImagePicker.MediaType[] =
      type === 'photo' ? ['images'] :
      type === 'video' ? ['videos'] :
      ['images', 'videos'];

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes,
      quality: 0.9,
      videoQuality: 1,
      videoMaxDuration: 60,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const mediaType = asset.type === 'video' ? 'video' : 'photo';
    const permanentUri = await this.copyToPermanentStorage(asset.uri, mediaType);

    return {
      id: Date.now().toString(),
      uri: permanentUri,
      type: mediaType,
      roundId: '',
      holeNumber: undefined,
      timestamp: new Date(),
      description: '',
    };
  }

  async saveMedia(media: MediaItem, roundId: string, holeNumber?: number): Promise<void> {
    const updatedMedia = {
      ...media,
      roundId,
      holeNumber,
      description: holeNumber ? `Hole ${holeNumber}` : `Round ${roundId}`,
    };
    await this.saveMediaToDb(updatedMedia);
  }

  async getMediaCount(roundId: string, holeNumber: number): Promise<{ photos: number; videos: number }> {
    const media = await this.getMediaForHole(roundId, holeNumber);
    return {
      photos: media.filter(m => m.type === 'photo').length,
      videos: media.filter(m => m.type === 'video').length,
    };
  }

  async selectFromLibrary(type: 'photo' | 'video' | 'mixed'): Promise<MediaItem | null> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Media library permissions not granted');
    }

    const mediaTypes: ImagePicker.MediaType[] =
      type === 'photo' ? ['images'] :
      type === 'video' ? ['videos'] :
      ['images', 'videos'];

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      quality: 0.9,
      selectionLimit: 1,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const mediaType = asset.type === 'video' ? 'video' : 'photo';
    const permanentUri = await this.copyToPermanentStorage(asset.uri, mediaType);

    return {
      id: Date.now().toString(),
      uri: permanentUri,
      type: mediaType,
      roundId: '',
      holeNumber: undefined,
      timestamp: new Date(),
      description: '',
    };
  }
}

export default new MediaService();
