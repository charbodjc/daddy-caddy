import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  MediaType,
  CameraOptions,
} from 'react-native-image-picker';
import { Platform, PermissionsAndroid } from 'react-native';
import DatabaseService from './database';
import RNFS from 'react-native-fs';
import { MediaItem } from '../types';

class MediaService {
  private mediaDir: string = `${RNFS.DocumentDirectoryPath}/media`;

  constructor() {
    // Ensure media directory exists
    this.ensureMediaDirectory();
  }

  private async ensureMediaDirectory(): Promise<void> {
    try {
      const exists = await RNFS.exists(this.mediaDir);
      if (!exists) {
        await RNFS.mkdir(this.mediaDir);
        console.log('📁 Created media directory');
      }
    } catch (error) {
      console.error('Error creating media directory:', error);
    }
  }

  private async copyToPermamentStorage(tempUri: string, mediaType: 'photo' | 'video'): Promise<string> {
    try {
      const timestamp = Date.now();
      const extension = mediaType === 'photo' ? '.jpg' : '.mp4';
      const fileName = `${mediaType}_${timestamp}${extension}`;
      const destPath = `${this.mediaDir}/${fileName}`;
      
      // Copy file to permanent storage
      await RNFS.copyFile(tempUri, destPath);
      console.log(`📁 Copied ${mediaType} to: ${destPath}`);
      
      // Return the new permanent path
      return destPath;
    } catch (error) {
      console.error('Error copying media to permanent storage:', error);
      // Fall back to original URI if copy fails
      return tempUri;
    }
  }

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
      videoQuality: 'medium',
      durationLimit: 30,
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

        if (response.errorCode) {
          reject(new Error(`Camera error: ${response.errorCode}`));
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
      includeExtra: true, // Include extra metadata
    } : {
      mediaType: 'video',
      videoQuality: 'medium', // Changed from 'high' to 'medium' for better compatibility
      durationLimit: 30, // Reduced from 60 to 30 seconds
      saveToPhotos: true,
      includeExtra: true, // Include extra metadata
    };

    return new Promise((resolve, reject) => {
      launchCamera(options, async (response: ImagePickerResponse) => {
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
          
          console.log(`📷 Media captured: URI=${asset.uri}, Type=${type}`);
          console.log(`Asset details:`, asset);
          
          try {
            // Copy to permanent storage
            const permanentUri = await this.copyToPermamentStorage(asset.uri!, type);
            
            const mediaItem: MediaItem = {
              id: Date.now().toString(),
              uri: permanentUri,
              type: type,
              roundId: '', // Will be set when saving
              holeNumber: undefined,
              timestamp: new Date(),
              description: '',
            };
            
            resolve(mediaItem);
          } catch (error) {
            console.error('Error processing media:', error);
            reject(error);
          }
        } else {
          console.log('No asset returned from camera');
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

  async selectFromLibrary(type: 'photo' | 'video' | 'mixed'): Promise<MediaItem | null> {
    const options: CameraOptions = {
      mediaType: type === 'mixed' ? 'mixed' : type,
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
      quality: 0.9,
      includeExtra: true,
      selectionLimit: 1,
    };

    return new Promise((resolve, reject) => {
      launchImageLibrary(options, async (response: ImagePickerResponse) => {
        if (response.didCancel) {
          resolve(null);
          return;
        }
        
        if (response.errorMessage) {
          console.error('Library error:', response.errorMessage);
          reject(new Error(response.errorMessage));
          return;
        }

        if (response.errorCode) {
          console.error('Library error code:', response.errorCode);
          reject(new Error(`Library error: ${response.errorCode}`));
          return;
        }

        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          const mediaType = asset.type?.includes('video') ? 'video' : 'photo';
          
          console.log(`📷 Media selected from library: URI=${asset.uri}, Type=${mediaType}`);
          console.log(`Asset details:`, asset);
          
          try {
            // Copy to permanent storage
            const permanentUri = await this.copyToPermamentStorage(asset.uri!, mediaType);
            
            const mediaItem: MediaItem = {
              id: Date.now().toString(),
              uri: permanentUri,
              type: mediaType,
              roundId: '', // Will be set when saving
              holeNumber: undefined,
              timestamp: new Date(),
              description: '',
            };
            
            resolve(mediaItem);
          } catch (error) {
            console.error('Error processing media from library:', error);
            reject(error);
          }
        } else {
          console.log('No asset selected from library');
          resolve(null);
        }
      });
    });
  }
}

export default new MediaService();
