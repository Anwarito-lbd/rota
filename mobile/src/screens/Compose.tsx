/** Publish a fit (one photo) or a dump (up to ten), with "Rent the look" tags. */
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useListings } from '../data/listings';
import { useSocial, type PostKind, type PostTag } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import type { MediaItem } from '../state/types';
import { BRAND_LAVENDER, FONT, OVER_INK, ff } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CameraIcon, CloseIcon, ImagesIcon, PinIcon, SearchIcon, ShieldCheckIcon, TagIcon } from '../ui/icons';
import { Display, Field, Header, Note, PrimaryButton, Screen, SectionLabel, Sheet, Toggle, Txt } from '../ui/kit';
import { FadeIn, Pop, PressScale, Pulse, Segmented, tap } from '../ui/motion';

function toItem(a: ImagePicker.ImagePickerAsset, source: 'camera' | 'library'): MediaItem {
  return {
    uri: a.uri,
    kind: 'image',
    name: a.fileName ?? 'photo.jpg',
    source,
    width: a.width,
    height: a.height,
    fileSize: a.fileSize,
  };
}

export function Compose() {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const { listings } = useListings();
  const social = useSocial();

  const [kind, setKind] = useState<PostKind>('fit');
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [active, setActive] = useState(0);
  const [tags, setTags] = useState<PostTag[]>([]);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [q, setQ] = useState('');
  const [caption, setCaption] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(state.challenge);
  const [shareArea, setShareArea] = useState(false);
  const [area, setArea] = useState<{ lat: number; lng: number; label: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ live: boolean; id: string } | null>(null);

  const max = kind === 'fit' ? 1 : 10;
  const previewW = Math.min(width, 720) - 36;
  const previewH = previewW * 1.25;
  const verified = social.identity === 'verified';

  const pick = async (source: 'camera' | 'library') => {
    setError(null);
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 }).catch(() => null)
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.85,
            allowsMultipleSelection: max > 1,
            selectionLimit: max - (kind === 'fit' ? 0 : media.length),
          }).catch(() => null);
    if (!result || result.canceled) return;
    const items = result.assets.map((a) => toItem(a, source));
    tap('light');
    if (kind === 'fit') {
      setMedia(items.slice(0, 1));
      setTags([]);
      setActive(0);
    } else {
      setMedia((cur) => [...cur, ...items].slice(0, 10));
    }
  };

  const toggleArea = async () => {
    if (shareArea) {
      setShareArea(false);
      setArea(null);
      return;
    }
    const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!perm?.granted) return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (!pos) return;
    let label: string | null = null;
    const geo = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }).catch(() => []);
    // Neighbourhood or city only — never a street.
    if (geo[0]) label = geo[0].district ?? geo[0].subregion ?? geo[0].city ?? null;
    setArea({ lat: pos.coords.latitude, lng: pos.coords.longitude, label });
    setShareArea(true);
  };

  const pickable = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return listings
      .filter((l) => !tags.some((tg) => tg.listingId === l.id && tg.mediaIndex === active))
      .filter((l) => !needle || `${l.title} ${l.brand ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 30);
  }, [listings, q, tags, active]);

  const publish = async () => {
    if (!media.length) return;
    setBusy(true);
    setError(null);
    try {
      const res = await social.publish({ kind, media, caption, challengeId, tags, area: shareArea ? area : null });
      tap('success');
      setDone(res);
    } catch (e) {
      setError(e instanceof Error && e.message === 'posting_suspended' ? t('compose.suspended') : t('compose.error'));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Screen>
        <FadeIn style={{ marginTop: 60, alignItems: 'center' }}>
          <Pop active>
            <View
              style={{
                width: 90,
                height: 90,
                borderRadius: 30,
                backgroundColor: done.live ? c.accent : c.plumSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {done.live ? <Txt size={40} weight="bold" color={c.onAccent}>✓</Txt> : <ShieldCheckIcon size={40} color={c.plum} />}
            </View>
          </Pop>
          <Display size={34} style={{ marginTop: 20, textAlign: 'center' }}>
            {done.live ? t('compose.live') : t('compose.review')}
          </Display>
          <Txt center color={c.ink2} style={{ marginTop: 10, paddingHorizontal: 10 }}>
            {done.live ? t('compose.liveBody') : t('compose.reviewBody')}
          </Txt>
        </FadeIn>
        <PrimaryButton
          label={done.live ? t('verify.continue') : t('verify.gateCta')}
          onPress={() => (done.live ? set({ screen: 'post', activePostId: done.id }) : set({ screen: 'verify', afterVerify: 'feed' }))}
          style={{ marginTop: 28 }}
        />
        <Pressable onPress={() => go('feed')} style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Txt weight="semi" color={c.ink2}>
            {t('tab.feed')}
          </Txt>
        </Pressable>
      </Screen>
    );
  }

  const current = media[active];

  return (
    <Screen bottomInset={60}>
      <Header title={t('compose.title')} onBack={() => go('feed')} />

      <View style={{ marginTop: 14 }}>
        <Segmented
          items={[
            { key: 'fit', label: `${t('post.fit')} · ${t('compose.fitBody')}` },
            { key: 'dump', label: `${t('post.dump')} · ${t('compose.dumpBody')}` },
          ]}
          value={kind}
          onChange={(k) => {
            setKind(k);
            if (k === 'fit') {
              setMedia((cur) => cur.slice(0, 1));
              setTags((cur) => cur.filter((tg) => tg.mediaIndex === 0));
              setActive(0);
            }
          }}
        />
      </View>

      {current ? (
        <FadeIn style={{ marginTop: 16 }}>
          <Pressable
            accessibilityLabel={t('compose.tagHelp')}
            onPress={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              setPending({ x: Math.min(0.97, Math.max(0.03, locationX / previewW)), y: Math.min(0.97, Math.max(0.03, locationY / previewH)) });
              setQ('');
              tap('light');
            }}
            style={{ width: previewW, height: previewH, borderRadius: 22, overflow: 'hidden', backgroundColor: c.surf2 }}
          >
            <Image source={{ uri: current.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            {tags
              .filter((tg) => tg.mediaIndex === active)
              .map((tg) => {
                const l = listings.find((x) => x.id === tg.listingId);
                return (
                  <View
                    key={tg.listingId}
                    style={{ position: 'absolute', left: `${tg.x * 100}%`, top: `${tg.y * 100}%`, marginLeft: -11, marginTop: -11 }}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 99, backgroundColor: BRAND_LAVENDER, borderWidth: 3, borderColor: OVER_INK }} />
                    <View
                      style={{
                        position: 'absolute',
                        top: 26,
                        left: -40,
                        width: 110,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 10,
                        backgroundColor: 'rgba(12,10,13,0.8)',
                      }}
                    >
                      <Txt size={10} weight="semi" color={OVER_INK} numberOfLines={1}>
                        {l?.title}
                      </Txt>
                    </View>
                  </View>
                );
              })}
            {pending ? (
              <Pulse
                style={{
                  position: 'absolute',
                  left: `${pending.x * 100}%`,
                  top: `${pending.y * 100}%`,
                  marginLeft: -14,
                  marginTop: -14,
                  width: 28,
                  height: 28,
                  borderRadius: 99,
                  backgroundColor: 'rgba(226,169,241,0.7)',
                }}
              />
            ) : null}
            <View style={{ position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(12,10,13,0.6)' }}>
              <TagIcon size={13} color={OVER_INK} />
              <Txt size={12} weight="semi" color={OVER_INK}>
                {t('compose.tagHelp')}
              </Txt>
            </View>
          </Pressable>
        </FadeIn>
      ) : (
        <View
          style={{
            marginTop: 16,
            height: previewH * 0.7,
            borderRadius: 22,
            borderWidth: 1.5,
            borderStyle: 'dashed',
            borderColor: c.line2,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            backgroundColor: c.surf,
          }}
        >
          <Display size={24}>{t('compose.addPhotos')}</Display>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressScale
              onPress={() => pick('camera')}
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16, minHeight: 46, borderRadius: 999, backgroundColor: c.accent }}
            >
              <CameraIcon size={19} color={c.onAccent} />
              <Txt weight="bold" color={c.onAccent}>
                {t('compose.camera')}
              </Txt>
            </PressScale>
            <PressScale
              onPress={() => pick('library')}
              style={{ flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 16, minHeight: 46, borderRadius: 999, backgroundColor: c.surf2 }}
            >
              <ImagesIcon size={19} color={c.ink} />
              <Txt weight="bold">{t('compose.library')}</Txt>
            </PressScale>
          </View>
        </View>
      )}

      {media.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
          {media.map((it, i) => (
            <PressScale key={`${it.uri}-${i}`} onPress={() => setActive(i)} scaleTo={0.94}>
              <View style={{ width: 58, height: 72, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: i === active ? c.accent : 'transparent' }}>
                <Image source={{ uri: it.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
              <Pressable
                accessibilityLabel={t('compose.removeTag')}
                hitSlop={8}
                onPress={() => {
                  setMedia((cur) => cur.filter((_, j) => j !== i));
                  setTags((cur) => cur.filter((tg) => tg.mediaIndex !== i).map((tg) => (tg.mediaIndex > i ? { ...tg, mediaIndex: tg.mediaIndex - 1 } : tg)));
                  setActive(0);
                }}
                style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 99, backgroundColor: c.ink, alignItems: 'center', justifyContent: 'center' }}
              >
                <CloseIcon size={12} color={c.bg} />
              </Pressable>
            </PressScale>
          ))}
          {media.length < max ? (
            <PressScale onPress={() => pick('library')} scaleTo={0.94}>
              <View style={{ width: 58, height: 72, borderRadius: 12, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}>
                <ImagesIcon size={20} color={c.ink3} />
              </View>
            </PressScale>
          ) : null}
        </ScrollView>
      ) : null}

      {tags.length ? (
        <View style={{ marginTop: 14, gap: 6 }}>
          <SectionLabel>{`${t('compose.tagTitle')} · ${tags.length}`}</SectionLabel>
          {tags.map((tg) => {
            const l = listings.find((x) => x.id === tg.listingId);
            if (!l) return null;
            return (
              <View key={`${tg.listingId}-${tg.mediaIndex}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 14, backgroundColor: c.surf }}>
                <Image source={{ uri: l.photos[0] }} style={{ width: 36, height: 44, borderRadius: 8 }} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Txt size={13} weight="semi" numberOfLines={1}>
                    {l.title}
                  </Txt>
                  <Txt size={12} color={c.ink3}>
                    {m(l.price)} {t('common.perDay')} · photo {tg.mediaIndex + 1}
                  </Txt>
                </View>
                <Pressable hitSlop={8} onPress={() => setTags((cur) => cur.filter((x) => x !== tg))}>
                  <Txt size={12} weight="semi" color={c.plum}>
                    {t('compose.removeTag')}
                  </Txt>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={{ marginTop: 18 }}>
        <Field
          label={t('compose.caption')}
          value={caption}
          onChangeText={(v) => setCaption(v.slice(0, 500))}
          placeholder={t('compose.captionPlaceholder')}
          autoCapitalize="sentences"
          multiline
          hint={`${caption.length}/500`}
        />
      </View>

      <SectionLabel>{t('compose.challenge')}</SectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {[{ id: null as string | null, label: t('compose.none') }, ...social.challenges.map((ch) => ({ id: ch.id, label: `#${ch.title[lang]}` }))].map((chip) => {
          const on = challengeId === chip.id;
          return (
            <PressScale
              key={chip.id ?? 'none'}
              haptic="light"
              onPress={() => setChallengeId(chip.id)}
              style={{
                paddingHorizontal: 14,
                minHeight: 36,
                borderRadius: 999,
                justifyContent: 'center',
                backgroundColor: on ? c.accent : 'transparent',
                borderWidth: 1,
                borderColor: on ? c.accent : c.line2,
              }}
            >
              <Txt size={13} weight="bold" color={on ? c.onAccent : c.ink}>
                {chip.label}
              </Txt>
            </PressScale>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: c.surf, borderWidth: 1, borderColor: c.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PinIcon size={18} color={c.accent} />
          <View style={{ flex: 1 }}>
            <Txt weight="semi">{t('compose.location')}</Txt>
            <Txt size={12} color={c.ink3}>
              {shareArea && area?.label ? area.label : t('compose.locationBody')}
            </Txt>
          </View>
          <Toggle on={shareArea} onPress={toggleArea} label={t('compose.location')} />
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Note>{t('compose.rules')}</Note>
      </View>
      {!verified ? (
        <Pressable onPress={() => set({ screen: 'verify', afterVerify: 'compose' })} style={{ marginTop: 10 }}>
          <Note tone="accent">{`${t('post.pendingBody')} → ${t('verify.gateCta')}`}</Note>
        </Pressable>
      ) : null}

      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 10 }}>
          {error}
        </Txt>
      ) : null}

      <PrimaryButton
        label={busy ? t('compose.publishing') : t('compose.publish')}
        onPress={publish}
        disabled={!media.length || busy}
        style={{ marginTop: 18 }}
      />

      <Sheet visible={!!pending} onClose={() => setPending(null)}>
        <Display size={24}>{t('compose.pickListing')}</Display>
        <View
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 12,
            minHeight: 44,
            borderRadius: 999,
            backgroundColor: c.surf2,
          }}
        >
          <SearchIcon color={c.ink3} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('explore.search')}
            placeholderTextColor={c.ink3}
            style={{ flex: 1, ...ff('med'), fontSize: 15, color: c.ink, paddingVertical: 8 }}
          />
        </View>
        <View style={{ marginTop: 10, gap: 6 }}>
          {pickable.map((l) => (
            <PressScale
              key={l.id}
              scaleTo={0.98}
              onPress={() => {
                if (!pending) return;
                setTags((cur) => [...cur, { listingId: l.id, mediaIndex: active, x: pending.x, y: pending.y }]);
                setPending(null);
                tap('success');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 14 }}
            >
              <Image source={{ uri: l.photos[0] }} style={{ width: 44, height: 54, borderRadius: 10 }} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Txt size={14} weight="semi" numberOfLines={1}>
                  {l.title}
                </Txt>
                <Txt size={12} color={c.ink3}>
                  @{l.owner.username} · {m(l.price)} {t('common.perDay')}
                </Txt>
              </View>
            </PressScale>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}
