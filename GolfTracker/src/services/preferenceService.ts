import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@daddycaddy:';

function prefixedKey(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export async function getPreference(key: string): Promise<string | null> {
  return AsyncStorage.getItem(prefixedKey(key));
}

export async function setPreference(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(prefixedKey(key), value);
}

export async function removePreference(key: string): Promise<void> {
  await AsyncStorage.removeItem(prefixedKey(key));
}
