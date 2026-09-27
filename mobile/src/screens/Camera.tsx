/**
 * The "+" opens this: a full-screen camera, TikTok-style. Pick a mode at the
 * bottom (Fit to post a look, Louer to list a piece), shoot or pick from the
 * gallery, and land in the matching composer with the photo already in place.
 */
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import type { MediaItem } from '../state/types';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CameraIcon, CloseIcon, FlipIcon, ImagesIcon } from '../ui/icons';
import { PrimaryButton, Txt } from '../ui/kit';
import { PressScale, tap } from '../ui/motion';

type Mode = 'fit' | 'list';

const GLASS = 'rgba(12,10,13,0.45)';

export function Camera() {
  const { set, go, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [mode, setMode] = useState<Mode>('fit');
  const [busy, setBusy] = useState(false);
  const cam = useRef<CameraView>(null);

  const hand = (items: MediaItem[]) => {
    if (!items.length) return;
    if (mode === 'fit') {
      set({ screen: 'compose', captured: items });
    } else {
      // The listing form reads its photo slots from the store.
      setMedia('new-listing-photo-1', items[0]);
      if (items[1]) setMedia('new-listing-photo-2', items[1]);
      go('list');
    }
  };

  const shoot = async () => {
    if (!cam.current || busy) return;
    setBusy(true);
    tap('medium');
    try {
      const photo = await cam.current.takePictureAsync({ quality: 0.85 });
      if (photo) hand([{ uri: photo.uri, kind: 'image', name: 'photo.jpg', source: 'camera', width: photo.width, height: photo.height }]);
    } finally {
      setBusy(false);
    }
  };

  const gallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: mode === 'fit' ? 10 : 2,
    }).catch(() => null);
    if (!result || result.canceled) return;
    hand(
      result.assets.map((a) => ({
        uri: a.uri,
        kind: 'image' as const,
        name: a.fileName ?? 'photo.jpg',
        source: 'library' as const,
        width: a.width,
        height: a.height,
        fileSize: a.fileSize,
      })),
    );
  };

  const close = () => go('feed');
  const granted = permission?.granted && Platform.OS !== 'web';

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {granted ? (
        <CameraView ref={cam} style={{ flex: 1 }} facing={facing} mode="picture" />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }}>
          <CameraIcon size={40} color={c.accent} />
          <Txt size={20} weight="bold" color={OVER_INK} center>
            {t('camera.permTitle')}
          </Txt>
          <Txt size={14} color="rgba(247,242,248,0.7)" center>
            {t('camera.permBody')}
          </Txt>
          {Platform.OS !== 'web' ? (
            <PrimaryButton label={t('camera.allow')} onPress={() => requestPermission()} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          ) : null}
        </View>
      )}

      {/* Top: close and flip */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: insets.top + 8, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' }}
      >
        <PressScale
          onPress={close}
          accessibilityLabel={t('camera.close')}
          style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon size={20} />
        </PressScale>
        {granted ? (
          <PressScale
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            accessibilityLabel={t('camera.flip')}
            style={{ width: 44, height: 44, borderRadius: 99, backgroundColor: GLASS, alignItems: 'center', justifyContent: 'center' }}
          >
            <FlipIcon size={22} />
          </PressScale>
        ) : null}
      </View>

      {/* Bottom: gallery, shutter, modes */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center' }}>
        <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36 }}>
          <PressScale
            onPress={gallery}
            accessibilityLabel={t('camera.gallery')}
            style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: GLASS, borderWidth: 1.5, borderColor: 'rgba(247,242,248,0.6)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ImagesIcon size={22} />
          </PressScale>
          <PressScale
            onPress={granted ? shoot : gallery}
            accessibilityLabel={t('camera.shutter')}
            scaleTo={0.9}
            style={{ width: 84, height: 84, borderRadius: 99, borderWidth: 5, borderColor: 'rgba(247,242,248,0.9)', alignItems: 'center', justifyContent: 'center' }}
          >
            <View style={{ width: 66, height: 66, borderRadius: 99, backgroundColor: mode === 'fit' ? c.accent : OVER_INK, opacity: busy ? 0.5 : 1 }} />
          </PressScale>
          <View style={{ width: 48 }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 22, marginTop: 18 }}>
          {(['fit', 'list'] as Mode[]).map((k) => (
            <PressScale key={k} haptic="light" onPress={() => setMode(k)} accessibilityRole="tab" accessibilityState={{ selected: mode === k }}>
              <Txt size={15} weight={mode === k ? 'bold' : 'semi'} color={mode === k ? OVER_INK : 'rgba(247,242,248,0.55)'}>
                {t(k === 'fit' ? 'camera.fit' : 'camera.list')}
              </Txt>
              <View style={{ height: 3, borderRadius: 99, marginTop: 5, alignSelf: 'center', width: 18, backgroundColor: mode === k ? OVER_INK : 'transparent' }} />
            </PressScale>
          ))}
        </View>
      </View>
    </View>
  );
}
