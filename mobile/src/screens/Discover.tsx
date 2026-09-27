import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListings, type Listing } from '../data/listings';
import { useSocial, type Post } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { BRAND_LAVENDER, FONT, OVER_INK, ff } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, CloseIcon, GridIcon, HeartIcon, MapIcon, SearchIcon, TagIcon } from '../ui/icons';
import { Amount, Display, Txt } from '../ui/kit';
import { Avatar, FadeIn, IdBadge, PressScale, compact } from '../ui/motion';

type Tile = { type: 'post'; post: Post; h: number } | { type: 'listing'; listing: Listing; h: number };

/** Deterministic, varied heights so the grid reads as a Pinterest board. */
function tileHeight(id: string, base: number, kind: 'post' | 'listing') {
  let n = 0;
  for (const ch of id) n = (n * 31 + ch.charCodeAt(0)) % 997;
  const ratios = kind === 'post' ? [1.55, 1.3, 1.7, 1.42] : [1.25, 1.1, 1.35];
  return Math.round(base * ratios[n % ratios.length]);
}

function PostTile({ tile, width, delay }: { tile: Extract<Tile, { type: 'post' }>; width: number; delay: number }) {
  const { set } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const social = useSocial();
  const p = tile.post;
  const saved = social.isSaved({ kind: 'post', id: p.id });
  return (
    <FadeIn delay={delay}>
      <PressScale
        scaleTo={0.97}
        onPress={() => set({ screen: 'post', activePostId: p.id })}
        onLongPress={() => set({ saveTarget: { kind: 'post', id: p.id } })}
        accessibilityLabel={`${p.author.username} — ${p.caption}`}
        style={{ width }}
      >
        <View style={{ height: tile.h, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surf2 }}>
          <Image source={{ uri: p.media[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
          {p.kind === 'dump' ? (
            <View style={{ position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: 3 }}>
              {p.media.slice(0, 4).map((_, i) => (
                <View key={i} style={{ width: 5, height: 5, borderRadius: 9, backgroundColor: i === 0 ? OVER_INK : 'rgba(247,242,248,0.5)' }} />
              ))}
            </View>
          ) : null}
          {p.tags.length ? (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 99,
                backgroundColor: BRAND_LAVENDER,
              }}
            >
              <TagIcon size={11} />
              <Txt size={10} weight="bold" color="#2A1033">
                {p.tags.length}
              </Txt>
            </View>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <Avatar uri={p.author.avatar} size={20} />
          <Txt size={12} weight="semi" numberOfLines={1} style={{ flex: 1 }}>
            {p.author.username}
          </Txt>
          {p.author.identityVerified ? <IdBadge compact label={t('verify.badge')} /> : null}
          <HeartIcon size={13} color={c.ink3} />
          <Txt size={11} color={c.ink3}>
            {compact(p.likeCount, lang)}
          </Txt>
        </View>
      </PressScale>
      <View style={{ position: 'absolute', top: 6, right: 6 }}>
        <PressScale
          onPress={() => set({ saveTarget: { kind: 'post', id: p.id } })}
          accessibilityLabel={t('post.save')}
          style={{
            width: 32,
            height: 32,
            borderRadius: 99,
            backgroundColor: 'rgba(12,10,13,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BookmarkIcon size={16} fill={saved ? OVER_INK : 'none'} />
        </PressScale>
      </View>
    </FadeIn>
  );
}

function ListingTile({ tile, width, delay }: { tile: Extract<Tile, { type: 'listing' }>; width: number; delay: number }) {
  const { set, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const l = tile.listing;
  return (
    <FadeIn delay={delay}>
      <PressScale
        scaleTo={0.97}
        onPress={() => set({ screen: 'detail', activeId: l.id })}
        onLongPress={() => set({ saveTarget: { kind: 'listing', id: l.id } })}
        accessibilityLabel={l.title}
        style={{ width }}
      >
        <View style={{ height: tile.h, borderRadius: 20, overflow: 'hidden', backgroundColor: c.surf2 }}>
          <Image source={{ uri: l.photos[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 99,
              backgroundColor: 'rgba(12,10,13,0.55)',
            }}
          >
            <Txt size={10} weight="bold" upper color={OVER_INK}>
              {t('feed.rent')}
            </Txt>
          </View>
        </View>
        <Txt size={13} weight="semi" numberOfLines={1} style={{ marginTop: 7 }}>
          {l.title}
        </Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Amount size={13} color={c.accent}>
            {m(l.price)}
          </Amount>
          <Txt size={11} color={c.ink3}>
            {t('common.perDay')} · {l.sizes.join('/')}
          </Txt>
        </View>
      </PressScale>
    </FadeIn>
  );
}

export function Discover() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { listings, loading } = useListings();
  const social = useSocial();
  const [q, setQ] = useState('');
  const gap = 10;
  const colW = (Math.min(width, 720) - 18 * 2 - gap) / 2;
  const challenge = social.challenges.find((ch) => ch.id === state.challenge) ?? null;

  const columns = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const posts = social.posts.filter(
      (p) =>
        (!state.challenge || p.challengeId === state.challenge) &&
        (!needle || `${p.caption} ${p.author.username}`.toLowerCase().includes(needle)),
    );
    const pieces = state.challenge
      ? []
      : listings.filter((l) => !needle || `${l.title} ${l.brand ?? ''} ${l.category}`.toLowerCase().includes(needle));
    const tiles: Tile[] = [];
    let li = 0;
    posts.forEach((post, i) => {
      tiles.push({ type: 'post', post, h: tileHeight(post.id, colW, 'post') });
      if (i % 2 === 1 && li < pieces.length) {
        const listing = pieces[li++];
        tiles.push({ type: 'listing', listing, h: tileHeight(listing.id, colW, 'listing') });
      }
    });
    while (li < pieces.length) {
      const listing = pieces[li++];
      tiles.push({ type: 'listing', listing, h: tileHeight(listing.id, colW, 'listing') });
    }
    // Shortest column first, so the two columns end close together.
    const cols: [Tile[], Tile[]] = [[], []];
    const heights = [0, 0];
    tiles.forEach((tile) => {
      const k = heights[0] <= heights[1] ? 0 : 1;
      cols[k].push(tile);
      heights[k] += tile.h + 60;
    });
    return cols;
  }, [social.posts, listings, state.challenge, q, colW]);

  const empty = columns[0].length + columns[1].length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      stickyHeaderIndices={[1]}
    >
      <View style={{ paddingHorizontal: 18, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <Display size={36}>{t('discover.title')}</Display>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
          <PressScale
            onPress={() => go('map')}
            accessibilityLabel={t('explore.map')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 99, backgroundColor: c.surf2 }}
          >
            <MapIcon size={16} color={c.ink} />
            <Txt size={13} weight="semi">
              {t('explore.map')}
            </Txt>
          </PressScale>
          <PressScale
            onPress={() => set({ screen: 'boards', board: null })}
            accessibilityLabel={t('explore.boards')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 99, backgroundColor: c.surf2 }}
          >
            <GridIcon size={16} color={c.ink} />
            <Txt size={13} weight="semi">
              {t('explore.boards')}
            </Txt>
          </PressScale>
        </View>
      </View>

      <View style={{ backgroundColor: c.bg, paddingTop: 12, paddingBottom: 10 }}>
        <View
          style={{
            marginHorizontal: 18,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            minHeight: 46,
            paddingHorizontal: 14,
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
            returnKeyType="search"
            accessibilityLabel={t('explore.search')}
            style={{ flex: 1, ...ff('med'), fontSize: 15, color: c.ink, paddingVertical: 10 }}
          />
          {q ? (
            <PressScale onPress={() => setQ('')} accessibilityLabel={t('common.cancel')}>
              <CloseIcon size={16} color={c.ink3} />
            </PressScale>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 18, marginTop: 10 }}>
          {[{ id: null as string | null, label: t('explore.all') }, ...social.challenges.map((ch) => ({ id: ch.id, label: `#${ch.title[lang]}` }))].map(
            (chip) => {
              const on = state.challenge === chip.id;
              return (
                <PressScale
                  key={chip.id ?? 'all'}
                  haptic="light"
                  onPress={() => set({ challenge: chip.id })}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
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
            },
          )}
        </ScrollView>
      </View>

      {challenge ? (
        <FadeIn style={{ marginHorizontal: 18, marginTop: 4, marginBottom: 12 }}>
          <View style={{ borderRadius: 22, padding: 16, backgroundColor: c.accent, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Txt size={11} weight="bold" upper color={c.onAccent}>
                {t('explore.challenge')}
              </Txt>
              <Display size={26} color={c.onAccent}>
                #{challenge.title[lang]}
              </Display>
            </View>
            <PressScale
              haptic="medium"
              onPress={() => go('compose')}
              style={{ paddingHorizontal: 16, minHeight: 42, borderRadius: 999, backgroundColor: c.onAccent, justifyContent: 'center' }}
            >
              <Txt size={14} weight="bold" color={c.accent}>
                {t('explore.join')}
              </Txt>
            </PressScale>
          </View>
        </FadeIn>
      ) : null}

      {loading || social.loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 40 }} />
      ) : empty ? (
        <View style={{ marginTop: 60, alignItems: 'center', paddingHorizontal: 30 }}>
          <Display size={26} style={{ textAlign: 'center' }}>
            {q ? t('explore.noResults') : t('discover.empty')}
          </Display>
          {!q ? (
            <Txt size={14} center color={c.ink2} style={{ marginTop: 8 }}>
              {t('discover.emptyBody')}
            </Txt>
          ) : null}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap, paddingHorizontal: 18, alignSelf: 'center' }}>
          {columns.map((col, ci) => (
            <View key={ci} style={{ width: colW, gap: 16 }}>
              {col.map((tile, i) =>
                tile.type === 'post' ? (
                  <PostTile key={`p-${tile.post.id}`} tile={tile} width={colW} delay={Math.min(i * 2 + ci, 10) * 45} />
                ) : (
                  <ListingTile key={`l-${tile.listing.id}`} tile={tile} width={colW} delay={Math.min(i * 2 + ci, 10) * 45} />
                ),
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
