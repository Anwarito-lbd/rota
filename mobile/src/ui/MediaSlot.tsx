import { Camera } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  ActionSheetIOS,
  Alert,
  Linking,
  Platform,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useStore } from '../state/store';
import { FONT, OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Txt } from './kit';

type Shape = 'rect' | 'rounded' | 'circle';

interface Props {
  /** Stable key: also the storage key for anything the user picks here. */
  id: string;
  shape?: Shape;
  radius?: number;
  placeholder?: string;
  /** Keeps the tile dark in both themes, for slots under light-ink overlays. */
  tone?: 'auto' | 'media';
  /** Show this slot's media when the primary one is still empty. */
  fallbackId?: string;
  /** Catalogue photo or video shown until someone uploads their own. */
  remoteUri?: string;
  editable?: boolean;
  /** Allow videos as well as photos. */
  video?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TINTS = ['#3A2F2B', '#33292F', '#2E3230', '#3B332A'];

function tintFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

/**
 * Camera make/model and the software that last wrote the file. iOS nests
 * these under {TIFF}; Android returns them flat. A generator's name in
 * Software is the clearest synthetic-media signal a phone can give us.
 */
function readExif(exif: Record<string, unknown> | null | undefined) {
  if (!exif) return undefined;
  const tiff = (exif['{TIFF}'] as Record<string, unknown> | undefined) ?? exif;
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined);
  const out = { make: text(tiff.Make), model: text(tiff.Model), software: text(tiff.Software) };
  return out.make || out.model || out.software ? out : undefined;
}

function VideoTile({ uri, radius }: { uri: string; radius: number }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: '100%', borderRadius: radius }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function MediaSlot({
  id,
  shape = 'rounded',
  radius = 12,
  placeholder,
  tone = 'auto',
  fallbackId,
  remoteUri,
  editable = false,
  video = false,
  style,
}: Props) {
  const { state, setMedia } = useStore();
  const { c } = useTheme();
  const uploaded = state.media[id] ?? (fallbackId ? state.media[fallbackId] : undefined);
  const item =
    uploaded ??
    (remoteUri
      ? { uri: remoteUri, kind: /\.(mp4|mov|m4v)(\?|$)/i.test(remoteUri) ? ('video' as const) : ('image' as const), name: id }
      : undefined);

  const borderRadius = shape === 'circle' ? 999 : shape === 'rect' ? 0 : radius;
  const empty = tone === 'media' ? tintFor(id) : c.surf2;
  const chrome = tone === 'media' ? 'rgba(247,242,248,0.28)' : c.line2;
  const caption = tone === 'media' ? 'rgba(247,242,248,0.55)' : c.ink3;

  const mediaTypes: ImagePicker.MediaType[] = video ? ['images', 'videos'] : ['images'];

  const keep = (result: ImagePicker.ImagePickerResult, source: 'camera' | 'library') => {
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setMedia(id, {
      uri: asset.uri,
      kind: asset.type === 'video' ? 'video' : 'image',
      name: asset.fileName ?? id,
      source,
      width: asset.width || undefined,
      height: asset.height || undefined,
      durationMs: asset.duration ?? undefined,
      fileSize: asset.fileSize ?? undefined,
      exif: readExif(asset.exif),
    });
  };

  const refused = (what: string) =>
    Alert.alert(`Accès ${what} refusé`, `Autorisez l’accès ${what} dans les réglages du téléphone pour continuer.`, [
      { text: 'Plus tard', style: 'cancel' },
      { text: 'Ouvrir les réglages', onPress: () => Linking.openSettings() },
    ]);

  const fromCamera = async () => {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    if (!camera.granted) return refused("à l'appareil photo");
    if (video) {
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (!mic.granted) return refused('au micro');
    }
    keep(await ImagePicker.launchCameraAsync({ mediaTypes, quality: 0.85, videoMaxDuration: 60, exif: true }), 'camera');
  };

  const fromLibrary = async () => {
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!library.granted) return refused('aux photos');
    keep(await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: 0.85, videoMaxDuration: 60, exif: true }), 'library');
  };

  const pick = () => {
    const shoot = video ? 'Filmer ou photographier' : 'Prendre une photo';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [shoot, 'Choisir dans la galerie', 'Annuler'], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) fromCamera();
          if (i === 1) fromLibrary();
        },
      );
      return;
    }
    Alert.alert(placeholder ?? 'Ajouter un média', undefined, [
      { text: shoot, onPress: fromCamera },
      { text: 'Choisir dans la galerie', onPress: fromLibrary },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      accessibilityRole={editable ? 'button' : 'image'}
      accessibilityLabel={placeholder}
      onPress={editable ? pick : undefined}
      style={[
        {
          width: '100%',
          height: '100%',
          borderRadius,
          overflow: 'hidden',
          backgroundColor: empty,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {item ? (
        item.kind === 'video' ? (
          <VideoTile uri={item.uri} radius={borderRadius} />
        ) : (
          <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        )
      ) : (
        <>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: chrome,
              borderRadius,
            }}
          />
          {placeholder ? (
            <View style={{ paddingHorizontal: 10 }}>
              <Txt size={11} center color={caption}>
                {placeholder}
              </Txt>
              {editable ? (
                <Txt size={11} center weight="bold" color={c.accent} style={{ marginTop: 4 }}>
                  Ajouter
                </Txt>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      {editable && uploaded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retirer le média"
          onPress={() => setMedia(id, null)}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 28,
            height: 28,
            borderRadius: 999,
            backgroundColor: 'rgba(12,10,13,0.75)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: OVER_INK, fontSize: 15, fontFamily: FONT.sansBold }}>×</Text>
        </Pressable>
      ) : null}
    </Pressable>
  );
}
