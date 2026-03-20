import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../components/common/ScreenHeader';
import RNFS from 'react-native-fs';
import MediaService from '../services/media';
import type { MediaItem } from '../types';

const CameraScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { currentHole, roundId } = route.params as {
    currentHole: number;
    roundId: string;
  };

  const [capturedMedia, setCapturedMedia] = useState<MediaItem | null>(null);
  const [saving, setSaving] = useState(false);

  const showPermissionDeniedAlert = (permissionType: string) => {
    Alert.alert(
      'Permission Required',
      `${permissionType} access is needed. Please enable it in Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  };

  const handleCameraLaunch = async () => {
    try {
      const media = await MediaService.captureMedia('mixed');
      if (media) {
        setCapturedMedia(media);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('permissions')) {
        showPermissionDeniedAlert('Camera');
      } else {
        Alert.alert('Error', 'Failed to launch camera. Please try again.');
        console.error('Camera launch error:', error);
      }
    }
  };

  const handleGalleryLaunch = async () => {
    try {
      const media = await MediaService.selectFromLibrary('mixed');
      if (media) {
        setCapturedMedia(media);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('permissions')) {
        showPermissionDeniedAlert('Photo library');
      } else {
        Alert.alert('Error', 'Failed to open gallery. Please try again.');
        console.error('Gallery launch error:', error);
      }
    }
  };

  const saveMedia = async () => {
    if (!capturedMedia) {
      return;
    }

    setSaving(true);
    try {
      await MediaService.saveMedia(capturedMedia, roundId, currentHole);
      Alert.alert('Success', 'Media saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save media');
      console.error('Save media error:', error);
    } finally {
      setSaving(false);
    }
  };

  const isVideo = capturedMedia?.type === 'video';

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Capture Media"
        subtitle={currentHole ? `Hole ${currentHole}` : undefined}
        leftAction="back"
        centered
      />

      {capturedMedia ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedMedia.uri }}
            style={styles.preview}
            resizeMode="contain"
            accessibilityLabel={isVideo ? 'Selected video preview' : 'Selected photo preview'}
          />
          <View style={styles.previewOverlay} accessible={false} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {isVideo && (
              <Icon name="play-circle-outline" size={64} color="#fff" />
            )}
          </View>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => {
                if (capturedMedia?.uri) {
                  RNFS.unlink(capturedMedia.uri).catch(() => {});
                }
                setCapturedMedia(null);
              }}
              disabled={saving}
              accessibilityLabel="Retake photo or video"
              accessibilityRole="button"
            >
              <Icon name="refresh" size={20} color="#666" />
              <Text style={styles.retakeButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.useButton, saving && styles.useButtonDisabled]}
              onPress={saveMedia}
              disabled={saving}
              accessibilityLabel={`Use this ${isVideo ? 'video' : 'photo'}`}
              accessibilityRole="button"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="check" size={20} color="#fff" />
              )}
              <Text style={styles.useButtonText}>
                {saving ? 'Saving...' : `Use ${isVideo ? 'Video' : 'Photo'}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.captureContainer}>
          <View style={styles.captureOptions}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleCameraLaunch}
              accessibilityLabel="Take photo or video with camera"
              accessibilityRole="button"
            >
              <Icon name="camera-alt" size={48} color="#2E7D32" />
              <Text style={styles.captureButtonText}>Take Photo/Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.captureButton}
              onPress={handleGalleryLaunch}
              accessibilityLabel="Choose photo or video from gallery"
              accessibilityRole="button"
            >
              <Icon name="photo-library" size={48} color="#2E7D32" />
              <Text style={styles.captureButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tips}>
            <Text style={styles.tipsTitle}>Tips for Great Golf Photos:</Text>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#2E7D32" />
              <Text style={styles.tipText}>Capture your swing from multiple angles</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#2E7D32" />
              <Text style={styles.tipText}>Include the hole number marker in scenic shots</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#2E7D32" />
              <Text style={styles.tipText}>Record video for swing analysis</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={16} color="#2E7D32" />
              <Text style={styles.tipText}>Photograph memorable moments with playing partners</Text>
            </View>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.cancelButton, saving && styles.cancelButtonDisabled, { marginBottom: Math.max(insets.bottom, 20) }]}
        onPress={() => navigation.goBack()}
        disabled={saving}
        accessibilityLabel="Cancel and go back"
        accessibilityRole="button"
      >
        <Text style={[styles.cancelButtonText, saving && styles.cancelButtonTextDisabled]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#2E7D32',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  useButtonDisabled: {
    opacity: 0.7,
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
    marginHorizontal: 20,
    marginTop: 0,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  cancelButtonTextDisabled: {
    color: '#aaa',
  },
});

export default CameraScreen;
