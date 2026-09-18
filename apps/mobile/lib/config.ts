import Constants from 'expo-constants';

const hostUri =
  Constants.expoConfig?.hostUri?.split(':')[0] ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0];

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (hostUri ? `http://${hostUri}:8787` : 'http://localhost:8787');

export const STRIPE_PK =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_rota_placeholder';
