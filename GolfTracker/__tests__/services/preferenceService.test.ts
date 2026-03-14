jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPreference,
  setPreference,
  removePreference,
} from '../../src/services/preferenceService';

describe('preferenceService', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();
  });

  describe('getPreference', () => {
    it('calls AsyncStorage.getItem with the prefixed key', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('dark');
      const result = await getPreference('theme');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@daddycaddy:theme');
      expect(result).toBe('dark');
    });

    it('returns null when the key does not exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await getPreference('missing');
      expect(result).toBeNull();
    });
  });

  describe('setPreference', () => {
    it('calls AsyncStorage.setItem with the prefixed key and value', async () => {
      await setPreference('theme', 'dark');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@daddycaddy:theme', 'dark');
    });
  });

  describe('removePreference', () => {
    it('calls AsyncStorage.removeItem with the prefixed key', async () => {
      await removePreference('theme');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@daddycaddy:theme');
    });
  });
});
