import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  MediaType,
  CameraOptions,
} from 'react-native-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';
import DatabaseService from './database';
import { MediaItem } from '../types';

class MediaService {
  private async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled automatically
      return true;
    }
    
    try {
      const cameraGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'Golf Tracker needs access to your camera to take photos and videos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      const storageGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission',
          message: 'Golf Tracker needs access to save photos and videos.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      
      return (
        cameraGranted === PermissionsAndroid.RESULTS.GRANTED &&
        storageGranted === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn(err);
      return false;
    }
  }

  async capturePhoto(roundId: string, holeNumber?: number): Promise<MediaItem | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Camera permissions not granted');
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.9,
      saveToPhotos: true, // Automatically save to photo album
    };

    return new Promise((resolve, reject) => {
      launchCamera(options, async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }
        
        if (response.errorMessage) {
          reject(new Error(response.errorMessage));
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          
          const mediaItem: MediaItem = {
            id: Date.now().toString(),
            uri: asset.uri!,
            type: 'photo',
            roundId,
            holeNumber,
            timestamp: new Date(),
            description: holeNumber ? `Hole ${holeNumber}` : `Round ${roundId}`,
          };

          // Save to database
          await DatabaseService.saveMedia(mediaItem);
          
          resolve(mediaItem);
        } else {
          resolve(null);
        }
      });
    });
  }

  async captureVideo(roundId: string, holeNumber?: number): Promise<MediaItem | null> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Camera permissions not granted');
    }

    const options: CameraOptions = {
      mediaType: 'video',
      videoQuality: 'high',
      durationLimit: 60, // 60 seconds max
      saveToPhotos: true, // Automatically save to photo album
    };

    return new Promise((resolve, reject) => {
      launchCamera(options, async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }
        
        if (response.errorMessage) {
          reject(new Error(response.errorMessage));
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          
          const mediaItem: MediaItem = {
            id: Date.now().toString(),
            uri: asset.uri!,
            type: 'video',
            roundId,
            holeNumber,
            timestamp: new Date(),
            description: holeNumber ? `Hole ${holeNumber}` : `Round ${roundId}`,
          };

          // Save to database
          await DatabaseService.saveMedia(mediaItem);
          
          resolve(mediaItem);
        } else {
          resolve(null);
        }
      });
    });
  }

  async getMediaForRound(roundId: string): Promise<MediaItem[]> {
    return DatabaseService.getMediaForRound(roundId);
  }

  async getMediaForHole(roundId: string, holeNumber: number): Promise<MediaItem[]> {
    return DatabaseService.getMediaForHole(roundId, holeNumber);
  }

  async captureMedia(type: 'photo' | 'video'): Promise<MediaItem | null> {
    // This is a wrapper method that doesn't save to database yet
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Camera permissions not granted');
    }

    const options: CameraOptions = type === 'photo' ? {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.9,
      saveToPhotos: true,
    } : {
      mediaType: 'video',
      videoQuality: 'medium', // Changed from 'high' to 'medium' for better compatibility
      durationLimit: 30, // Reduced from 60 to 30 seconds
      saveToPhotos: true,
    };

    return new Promise((resolve, reject) => {
      launchCamera(options, (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }
        
        if (response.errorMessage) {
          console.error('Camera error:', response.errorMessage);
          reject(new Error(response.errorMessage));
          return;
        }

        if (response.errorCode) {
          console.error('Camera error code:', response.errorCode);
          reject(new Error(`Camera error: ${response.errorCode}`));
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          
          const mediaItem: MediaItem = {
            id: Date.now().toString(),
            uri: asset.uri!,
            type: type,
            roundId: '', // Will be set when saving
            holeNumber: undefined,
            timestamp: new Date(),
            description: '',
          };
          
          resolve(mediaItem);
        } else {
          resolve(null);
        }
      });
    });
  }

  async saveMedia(media: MediaItem, roundId: string, holeNumber?: number): Promise<void> {
    const updatedMedia = {
      ...media,
      roundId,
      holeNumber,
      description: holeNumber ? `Hole ${holeNumber}` : `Round ${roundId}`,
    };
    await DatabaseService.saveMedia(updatedMedia);
  }

  async getMediaCount(roundId: string, holeNumber: number): Promise<{ photos: number; videos: number }> {
    const media = await this.getMediaForHole(roundId, holeNumber);
    return {
      photos: media.filter(m => m.type === 'photo').length,
      videos: media.filter(m => m.type === 'video').length,
    };
  }
}

export default new MediaService();
