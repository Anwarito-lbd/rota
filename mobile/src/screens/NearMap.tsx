import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocial, type Post } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { AreaMap } from '../ui/AreaMap';
import { ChevronLeft, LocateIcon, PinIcon, TagIcon } from '../ui/icons';
import { Display, Txt } from '../ui/kit';
import { Avatar, FadeIn, PressScale } from '../ui/motion';
import { TAB_BAR_SPACE } from '../ui/TabBar';

const PARIS = { lat: 48.8606, lng: 2.3522 };
const RADII = [1, 3, 5, 10];

export function NearMap() {
  return <NearMapView />;
}

/**
 * The map of looks around you. Standalone it has its own back button and
 * title; `embedded` (Feed › Près de moi) sits under the Feed header and above
 * the tab bar.
 */
export function NearMapView({ embedded = false }: { embedded?: boolean }) {
  const { set, go } = useStore();
  const { c, dark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const [center, setCenter] = useState(PARIS);
  const [located, setLocated] = useState(false);
  const [denied, setDenied] = useState(false);
  const [radius, setRadius] = useState(5);
  const [rows, setRows] = useState<{ post: Post; km: number }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const strip = useRef<ScrollView>(null);
  const cardW = Math.min(width, 720) * 0.72;

  const locate = useCallback(async () => {
    const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (!perm?.granted) {
      setDenied(true);
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (!pos) return;
    setDenied(false);
    setLocated(true);
    // Only the rounded area is used from here on.
    setCenter({ lat: Math.round(pos.coords.latitude * 200) / 200, lng: Math.round(pos.coords.longitude * 200) / 200 });
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  useEffect(() => {
    let cancelled = false;
    social.nearby(center.lat, center.lng, radius).then((r) => {
      if (cancelled) return;
      if (r.length === 0 && located) {
        // Nothing here yet: show Paris rather than an empty map.
        setCenter(PARIS);
        setLocated(false);
        return;
      }
      setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [center, radius, social, located]);

  const pick = (id: string) => {
    setSelected(id);
    const i = rows.findIndex((r) => r.post.id === id);
    if (i >= 0) strip.current?.scrollTo({ x: i * (cardW + 10), animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AreaMap
        center={center}
        radiusKm={radius}
        pins={rows.filter((r) => r.post.area).map((r) => ({ id: r.post.id, lat: r.post.area!.lat, lng: r.post.area!.lng, image: r.post.media[0] }))}
        selected={selected}
        onPin={pick}
        dark={dark}
        showMe={located}
      />

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + (embedded ? 118 : 8), left: 12, right: 12 }}>
        {embedded ? null : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <PressScale
            onPress={() => go('feed')}
            accessibilityLabel={t('common.back')}
            style={{ width: 42, height: 42, borderRadius: 99, backgroundColor: 'rgba(20,16,22,0.85)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft />
          </PressScale>
          <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(20,16,22,0.85)' }}>
            <Display size={20} color={OVER_INK}>
              {t('map.title')}
            </Display>
            <Txt size={11} color="rgba(247,242,248,0.7)">
              {denied ? t('map.denied') : `${rows.length} · ${t('map.subtitle')}`}
            </Txt>
          </View>
          <PressScale
            onPress={locate}
            accessibilityLabel={t('feed.nearAllow')}
            style={{ width: 42, height: 42, borderRadius: 99, backgroundColor: 'rgba(20,16,22,0.85)', alignItems: 'center', justifyContent: 'center' }}
          >
            <LocateIcon />
          </PressScale>
        </View>
        )}
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: embedded ? 0 : 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ gap: 6 }}>
          {RADII.map((r) => (
            <PressScale
              key={r}
              haptic="light"
              onPress={() => setRadius(r)}
              style={{
                paddingHorizontal: 14,
                minHeight: 34,
                borderRadius: 999,
                justifyContent: 'center',
                backgroundColor: r === radius ? c.accent : 'rgba(20,16,22,0.85)',
              }}
            >
              <Txt size={13} weight="bold" color={r === radius ? c.onAccent : OVER_INK}>
                {r} km
              </Txt>
            </PressScale>
          ))}
        </ScrollView>
        {embedded ? (
          <PressScale
            onPress={locate}
            accessibilityLabel={t('feed.nearAllow')}
            style={{ width: 36, height: 36, borderRadius: 99, backgroundColor: 'rgba(20,16,22,0.85)', alignItems: 'center', justifyContent: 'center' }}
          >
            <LocateIcon size={17} />
          </PressScale>
        ) : null}
        </View>
        {embedded && denied ? (
          <Txt size={12} color="rgba(247,242,248,0.8)" style={{ marginTop: 8 }}>
            {t('map.denied')}
          </Txt>
        ) : null}
      </View>

      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: embedded ? TAB_BAR_SPACE + 6 : 10 }}>
        <ScrollView
          ref={strip}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + 10}
          decelerationRate="fast"
          contentContainerStyle={{ gap: 10, paddingHorizontal: 14 }}
        >
          {rows.map((r, i) => {
            const on = r.post.id === selected;
            return (
              <FadeIn key={r.post.id} delay={Math.min(i, 6) * 50}>
                <PressScale
                  scaleTo={0.97}
                  onPress={() => (on ? set({ screen: 'post', activePostId: r.post.id }) : pick(r.post.id))}
                  style={{
                    width: cardW,
                    flexDirection: 'row',
                    gap: 10,
                    padding: 8,
                    borderRadius: 20,
                    backgroundColor: c.surf,
                    borderWidth: 1.5,
                    borderColor: on ? c.accent : c.line,
                  }}
                >
                  <Image source={{ uri: r.post.media[0] }} style={{ width: 70, height: 88, borderRadius: 14 }} contentFit="cover" />
                  <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Avatar uri={r.post.author.avatar} size={20} />
                      <Txt size={13} weight="bold" numberOfLines={1}>
                        @{r.post.author.username}
                      </Txt>
                    </View>
                    <Txt size={12} color={c.ink2} numberOfLines={2}>
                      {r.post.caption}
                    </Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <PinIcon size={12} color={c.accent} />
                      <Txt size={11} weight="semi" color={c.ink3}>
                        {r.post.area?.label} · {r.km < 1 ? '<1' : r.km.toFixed(1)} km
                      </Txt>
                      {r.post.tags.length ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <TagIcon size={11} color={c.accent} />
                          <Txt size={11} weight="bold" color={c.accent}>
                            {r.post.tags.length}
                          </Txt>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </PressScale>
              </FadeIn>
            );
          })}
        </ScrollView>
        <Txt size={10} center color={dark ? 'rgba(247,242,248,0.6)' : c.ink3} style={{ marginTop: 6 }}>
          {t('map.privacy')}
        </Txt>
      </View>
    </View>
  );
}
