import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
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
  editable = false,
  video = false,
  style,
}: Props) {
  const { state, setMedia } = useStore();
  const { c } = useTheme();
  const item = state.media[id] ?? (fallbackId ? state.media[fallbackId] : undefined);

  const borderRadius = shape === 'circle' ? 999 : shape === 'rect' ? 0 : radius;
  const empty = tone === 'media' ? tintFor(id) : c.surf2;
  const chrome = tone === 'media' ? 'rgba(246,241,233,0.28)' : c.line2;
  const caption = tone === 'media' ? 'rgba(246,241,233,0.55)' : c.ink3;

  const pick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: video ? ['images', 'videos'] : ['images'],
      quality: 0.85,
      videoMaxDuration: 60,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setMedia(id, {
      uri: asset.uri,
      kind: asset.type === 'video' ? 'video' : 'image',
      name: asset.fileName ?? id,
    });
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
                <Txt size={11} center weight="bold" color={c.clay} style={{ marginTop: 4 }}>
                  Ajouter
                </Txt>
              ) : null}
            </View>
          ) : null}
        </>
      )}

      {editable && item ? (
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
            backgroundColor: 'rgba(12,10,11,0.75)',
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
