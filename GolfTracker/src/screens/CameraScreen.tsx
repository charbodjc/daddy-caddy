import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  launchCamera,
  launchImageLibrary,
  ImagePickerResponse,
  MediaType,
  CameraOptions,
  ImageLibraryOptions,
} from 'react-native-image-picker';
import { database } from '../database/watermelon/database';
import Media from '../database/watermelon/models/Media';

const CameraScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentHole, roundId, onCapture } = route.params as {
    currentHole?: number;
    roundId?: string;
    onCapture?: (uri: string) => void;
  };

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  const cameraOptions: CameraOptions = {
    mediaType: 'mixed',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
    videoQuality: 'high',
  };

  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'mixed',
    includeBase64: false,
    maxHeight: 2000,
    maxWidth: 2000,
  };

  const handleCameraLaunch = () => {
    launchCamera(cameraOptions, handleResponse);
  };

  const handleGalleryLaunch = () => {
    launchImageLibrary(libraryOptions, handleResponse);
  };

  const handleResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      setSelectedImage(asset.uri || null);
      setIsVideo(asset.type?.startsWith('video/') || false);
    }
  };

  const saveMedia = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'No media selected');
      return;
    }

    try {
      if (roundId) {
        // Save to WatermelonDB
        await database.write(async () => {
          await database.collections.get<Media>('media').create(media => {
            media.uri = selectedImage;
            media.type = isVideo ? 'video' : 'photo';
            media.roundId = roundId;
            media.holeNumber = currentHole;
            media.timestamp = new Date();
            media.description = currentHole ? `Hole ${currentHole}` : undefined;
          });
        });
      }

      if (onCapture) {
        onCapture(selectedImage);
      }

      Alert.alert('Success', 'Media saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save media');
      console.error('Save media error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Capture Media</Text>
        {currentHole && (
          <Text style={styles.subtitle}>Hole {currentHole}</Text>
        )}
      </View>

      {selectedImage ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.preview} />
          <View style={styles.previewOverlay}>
            {isVideo && (
              <Icon name="play-circle-outline" size={64} color="#fff" />
            )}
          </View>
          
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => setSelectedImage(null)}
            >
              <Icon name="refresh" size={20} color="#666" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.useButton} onPress={saveMedia}>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.useButtonText}>Use {isVideo ? 'Video' : 'Photo'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.captureContainer}>
          <View style={styles.captureOptions}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCameraLaunch}
            >
              <Icon name="camera-alt" size={48} color="#4CAF50" />
              <Text style={styles.captureButtonText}>Take Photo/Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleGalleryLaunch}
            >
              <Icon name="photo-library" size={48} color="#4CAF50" />
              <Text style={styles.captureButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for Great Golf Photos:</Text>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Capture your swing from multiple angles</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Include the hole number marker in scenic shots</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Record video for swing analysis</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Photograph memorable moments with playing partners</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginTop: 5,
  },
  captureContainer: {
    flex: 1,
    padding: 20,
  },
  captureOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
    marginBottom: 40,
  },
  captureButton: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  captureButtonText: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    margin: 20,
  },
  preview: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  retakeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  useButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  tips: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    margin: 20,
    marginTop: 0,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
});

export default CameraScreen;
