import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import type { PermKey } from '../state/types';

/**
 * What the phone actually says, not what the app remembers. `blocked` means the
 * user refused and iOS/Android won't show the prompt again — only Settings can
 * change it.
 */
export type PermStatus = 'granted' | 'denied' | 'blocked' | 'undetermined';

interface OsResult {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
}

const CHECK: Record<PermKey, () => Promise<OsResult>> = {
  camera: () => Camera.getCameraPermissionsAsync(),
  microphone: () => Camera.getMicrophonePermissionsAsync(),
  photos: () => ImagePicker.getMediaLibraryPermissionsAsync(),
  location: () => Location.getForegroundPermissionsAsync(),
};

const REQUEST: Record<PermKey, () => Promise<OsResult>> = {
  camera: () => Camera.requestCameraPermissionsAsync(),
  microphone: () => Camera.requestMicrophonePermissionsAsync(),
  photos: () => ImagePicker.requestMediaLibraryPermissionsAsync(),
  location: () => Location.requestForegroundPermissionsAsync(),
};

const KEYS = Object.keys(CHECK) as PermKey[];

function toStatus(r: OsResult): PermStatus {
  if (r.granted) return 'granted';
  if (!r.canAskAgain) return 'blocked';
  return r.status === 'undetermined' ? 'undetermined' : 'denied';
}

export function usePermissions() {
  const [statuses, setStatuses] = useState<Record<PermKey, PermStatus>>({
    camera: 'undetermined',
    microphone: 'undetermined',
    photos: 'undetermined',
    location: 'undetermined',
  });

  const refresh = useCallback(async () => {
    const entries = await Promise.all(KEYS.map(async (k) => [k, toStatus(await CHECK[k]())] as const));
    setStatuses(Object.fromEntries(entries) as Record<PermKey, PermStatus>);
  }, []);

  // Re-read on return from the Settings app, where the user may have changed it.
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const request = useCallback(
    async (key: PermKey) => {
      if (statuses[key] === 'blocked') {
        await Linking.openSettings();
        return;
      }
      const result = await REQUEST[key]();
      setStatuses((s) => ({ ...s, [key]: toStatus(result) }));
    },
    [statuses],
  );

  return { statuses, request };
}
