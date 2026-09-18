import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const memory = new Map<string, string>();

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    memory.set(key, value);
    await AsyncStorage.setItem(key, value);
  }
}

async function getItem(key: string) {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  try {
    return (await SecureStore.getItemAsync(key)) ?? (await AsyncStorage.getItem(key));
  } catch {
    return memory.get(key) ?? (await AsyncStorage.getItem(key));
  }
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    memory.delete(key);
  }
  await AsyncStorage.removeItem(key);
}

export const sessionStore = {
  TOKEN_KEY: 'rota_token',
  USER_KEY: 'rota_user',
  async save(token: string, userJson: string) {
    await setItem(this.TOKEN_KEY, token);
    await setItem(this.USER_KEY, userJson);
  },
  async getToken() {
    return getItem(this.TOKEN_KEY);
  },
  async getUser() {
    const raw = await getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async clear() {
    await deleteItem(this.TOKEN_KEY);
    await deleteItem(this.USER_KEY);
  },
};
