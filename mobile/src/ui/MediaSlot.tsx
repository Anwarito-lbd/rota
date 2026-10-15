import { Camera } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
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
import { useT } from '../i18n';
import { releaseMedia, useStore } from '../state/store';
import { FONT, OVER_INK, ff } from '../theme/tokens';
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
  /** Hold a video still, e.g. a feed card that isn't the one on screen. */
  paused?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TINTS = ['#3A2F2B', '#33292F', '#2E3230', '#3B332A'];

/**
 * Shared picker options. On iPhone, videos are re-encoded to 720p H.264
 * (a full-quality 60 s clip is often over 100 MB; 720p is plenty on a phone
 * and costs a fraction to store and stream). Android keeps the original:
 * re-encoding there needs a native module (development build).
 */
const PICKER = {
  quality: 0.85,
  videoMaxDuration: 60,
  exif: true,
  videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
} satisfies ImagePicker.ImagePickerOptions;

/** Videos are 60 s at most (the pickers' videoMaxDuration); half a second of slack for rounding. */
const MAX_VIDEO_MS = 60_500;

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

function VideoTile({ uri, radius, paused }: { uri: string; radius: number; paused: boolean }) {
  // Remote videos are kept on the phone: a loop or a second look doesn't
  // download them again (every download is billed storage egress).
  const player = useVideoPlayer({ uri, useCaching: /^https?:/.test(uri) }, (p) => {
    p.loop = true;
    p.muted = true;
    if (!paused) p.play();
  });
  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [player, paused]);
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
  paused = false,
  style,
}: Props) {
  const { state, set, setMedia } = useStore();
  const { c } = useTheme();
  const { t } = useT();
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

  const fail = (text: string) => set({ notice: { text, error: true } });

  const keep = (result: ImagePicker.ImagePickerResult, source: 'camera' | 'library') => {
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    const kind = asset.type === 'video' ? 'video' : 'image';
    // The browser picker gives seconds; the phones give milliseconds.
    const durationMs = asset.duration == null ? undefined : Platform.OS === 'web' ? asset.duration * 1000 : asset.duration;
    const refusal =
      (kind === 'video' && !video) || (asset.mimeType && !/^(image|video)\//.test(asset.mimeType))
        ? t('error.fileType')
        : kind === 'video' && durationMs && durationMs > MAX_VIDEO_MS
          ? t('media.tooLong')
          : null;
    if (refusal) {
      releaseMedia({ uri: asset.uri, kind, name: id });
      return fail(refusal);
    }
    releaseMedia(state.media[id]);
    setMedia(id, {
      uri: asset.uri,
      kind,
      name: asset.fileName ?? id,
      source,
      width: asset.width || undefined,
      height: asset.height || undefined,
      durationMs,
      fileSize: asset.fileSize ?? undefined,
      exif: readExif(asset.exif),
    });
  };

  const refused = (title: string) =>
    Alert.alert(title, t('media.deniedBody'), [
      { text: t('media.later'), style: 'cancel' },
      { text: t('media.openSettings'), onPress: () => Linking.openSettings() },
    ]);

  const fromCamera = async () => {
    const camera = await ImagePicker.requestCameraPermissionsAsync();
    if (!camera.granted) return refused(t('media.deniedCamera'));
    if (video) {
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (!mic.granted) return refused(t('media.deniedMic'));
    }
    keep(await ImagePicker.launchCameraAsync({ ...PICKER, mediaTypes }), 'camera');
  };

  const fromLibrary = async () => {
    const library = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!library.granted) return refused(t('media.deniedPhotos'));
    keep(await ImagePicker.launchImageLibraryAsync({ ...PICKER, mediaTypes }), 'library');
  };

  // The browser picker rejects anything that is not a photo or a video.
  const library = () => fromLibrary().catch(() => fail(t('error.fileType')));
  const camera = () => fromCamera().catch(() => fail(t('error.generic')));

  const pick = () => {
    // The browser has no action sheet (Alert is a no-op there): open the file picker.
    if (Platform.OS === 'web') {
      library();
      return;
    }
    const shoot = video ? t('media.shootOrFilm') : t('media.shoot');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [shoot, t('media.library'), t('common.cancel')], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) camera();
          if (i === 1) library();
        },
      );
      return;
    }
    Alert.alert(placeholder ?? t('media.add'), undefined, [
      { text: shoot, onPress: camera },
      { text: t('media.library'), onPress: library },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  // The remove button sits beside the slot, not inside it: a button inside a
  // button is invalid on the web and confuses screen readers.
  return (
    <View style={{ width: '100%', height: '100%' }}>
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
            <VideoTile uri={item.uri} radius={borderRadius} paused={paused} />
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
                    {t('common.add')}
                  </Txt>
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </Pressable>

      {editable && uploaded ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={placeholder ? `${t('media.remove')} · ${placeholder}` : t('media.remove')}
          onPress={() => {
            releaseMedia(state.media[id]);
            setMedia(id, null);
          }}
          hitSlop={8}
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
          <Text style={{ color: OVER_INK, fontSize: 15, ...ff('bold') }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
