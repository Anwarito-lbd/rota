import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useListings, type Listing } from '../data/listings';
import { useSocial, type Post } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import type { FeedTab } from '../state/types';
import { BRAND_LAVENDER, OVER_INK, OVER_INK_SOFT } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { BookmarkIcon, DotsIcon, HeartIcon, MapIcon, PersonPlusIcon, PinIcon, SparkleIcon } from '../ui/icons';
import { CertifiedMark, Display, GhostButton, PrimaryButton, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { Avatar, FadeIn, GlassChip, IdBadge, Logo, Pop, PressScale, Segmented, tap } from '../ui/motion';
import { PostCard } from '../ui/PostCard';
import { TAB_BAR_SPACE } from '../ui/TabBar';
import { NearMapView } from './NearMap';

type Item = { type: 'post'; post: Post; km?: number } | { type: 'listing'; listing: Listing };

function EmptyState({
  title,
  body,
  cta,
  onCta,
  secondary,
  onSecondary,
  icon,
}: {
  title: string;
  body: string;
  cta: string;
  onCta: () => void;
  secondary?: string;
  onSecondary?: () => void;
  icon?: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <FadeIn style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 24,
          backgroundColor: c.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon ?? <PersonPlusIcon color={c.accent} />}
      </View>
      <Display size={30} style={{ marginTop: 20, textAlign: 'center' }}>
        {title}
      </Display>
      <Txt size={14} center color={c.ink2} style={{ marginTop: 10 }}>
        {body}
      </Txt>
      <PrimaryButton label={cta} onPress={onCta} style={{ marginTop: 22, alignSelf: 'stretch' }} />
      {secondary && onSecondary ? (
        <GhostButton label={secondary} onPress={onSecondary} style={{ marginTop: 10, alignSelf: 'stretch' }} />
      ) : null}
    </FadeIn>
  );
}

/** A piece for rent, in the same full-screen format as posts. */
function ListingCard({ item, height }: { item: Listing; height: number }) {
  const { state, set, toggleFlag, m } = useStore();
  const { t } = useT();
  const social = useSocial();
  const liked = !!state.liked[item.id];
  const saved = social.isSaved({ kind: 'listing', id: item.id });

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: '#0C0A0D' }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <MediaSlot
          id={`feed-${item.id}`}
          shape="rect"
          tone="media"
          remoteUri={item.video ?? item.photos[0] ?? undefined}
          placeholder={item.title}
        />
      </View>
      <LinearGradient
        colors={['rgba(12,10,13,0.55)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0.94)']}
        locations={[0, 0.22, 0.44, 0.92]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      <View style={{ position: 'absolute', right: 8, bottom: 190 + TAB_BAR_SPACE, alignItems: 'center', gap: 14 }}>
        <PressScale
          onPress={() => set({ screen: 'user', profileId: item.ownerId })}
          accessibilityLabel={item.owner.username}
          style={{ marginBottom: 6 }}
        >
          <Avatar uri={item.owner.avatar} size={50} ring />
        </PressScale>
        <PressScale
          scaleTo={0.84}
          accessibilityLabel={t('post.like')}
          onPress={() => {
            tap(liked ? 'light' : 'medium');
            toggleFlag('liked', item.id);
          }}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Pop active={liked}>
            <HeartIcon size={32} fill={liked ? BRAND_LAVENDER : 'none'} color={liked ? BRAND_LAVENDER : OVER_INK} />
          </Pop>
        </PressScale>
        <PressScale
          scaleTo={0.84}
          accessibilityLabel={t('post.save')}
          onPress={() => set({ saveTarget: { kind: 'listing', id: item.id } })}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <Pop active={saved}>
            <BookmarkIcon size={29} fill={saved ? OVER_INK : 'none'} />
          </Pop>
        </PressScale>
        <PressScale
          scaleTo={0.84}
          accessibilityLabel={t('post.tryOn')}
          onPress={() => set({ screen: 'tryon', tryOnListingId: item.id })}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <SparkleIcon size={29} />
        </PressScale>
        <PressScale
          scaleTo={0.84}
          accessibilityLabel={t('post.more')}
          onPress={() => set({ report: true, reportSent: false, activeId: item.id })}
          style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
        >
          <DotsIcon />
        </PressScale>
      </View>

      <View style={{ position: 'absolute', left: 0, right: 64, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 + TAB_BAR_SPACE }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          <GlassChip style={{ backgroundColor: 'rgba(226,169,241,0.92)', borderColor: 'transparent' }}>
            <Txt size={11} weight="bold" upper color="#2A1033">
              {t('feed.rent')} · {item.occasion ?? item.category}
            </Txt>
          </GlassChip>
          {item.authenticity === 'verified' ? (
            <GlassChip>
              <Txt size={11} weight="bold" upper color={OVER_INK}>
                Authenticité vérifiée
              </Txt>
            </GlassChip>
          ) : null}
          {item.city ? (
            <GlassChip>
              <PinIcon size={12} color={OVER_INK} />
              <Txt size={11} weight="semi" color={OVER_INK}>
                {item.city}
              </Txt>
            </GlassChip>
          ) : null}
        </View>

        <Pressable
          onPress={() => set({ screen: 'user', profileId: item.ownerId })}
          style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Txt size={15} weight="semi" color={OVER_INK}>
            @{item.owner.username}
          </Txt>
          {item.owner.certified ? <CertifiedMark size={16} /> : null}
          {item.owner.identityVerified ? <IdBadge compact label={t('verify.badge')} /> : null}
        </Pressable>

        <Display size={31} color={OVER_INK} style={{ marginTop: 5 }}>
          {item.title}
        </Display>
        <Txt size={14} color={OVER_INK_SOFT} style={{ marginTop: 4 }}>
          {[item.brand, item.sizes.join(' · ')].filter(Boolean).join(' · ')}
        </Txt>

        <PrimaryButton
          label={`${t('feed.rent')} · ${m(item.price)} ${t('common.perDay')}`}
          onPress={() => set({ screen: 'detail', activeId: item.id })}
          style={{ marginTop: 14, minHeight: 52, backgroundColor: BRAND_LAVENDER }}
        />
      </View>
    </View>
  );
}

/** "Pour toi": posts first, a piece for rent after every two. */
function interleave(posts: Post[], listings: Listing[]): Item[] {
  const out: Item[] = [];
  let l = 0;
  posts.forEach((post, i) => {
    out.push({ type: 'post', post });
    if (i % 2 === 1 && l < listings.length) out.push({ type: 'listing', listing: listings[l++] });
  });
  while (l < listings.length) out.push({ type: 'listing', listing: listings[l++] });
  return out;
}


export function Feed() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const { listings, loading: listingsLoading, error, refresh: refreshListings } = useListings();
  const social = useSocial();
  const tab = state.feedTab;
  const items: Item[] = useMemo(() => {
    if (tab === 'follow') {
      return social.posts.filter((p) => social.isFollowing(p.authorId)).map((post) => ({ type: 'post' as const, post }));
    }
    return interleave(social.posts, listings);
  }, [tab, social, listings]);

  const loading = listingsLoading || social.loading;
  const refresh = () => {
    refreshListings();
    social.refresh();
  };

  const tabs: { key: FeedTab; label: string }[] = [
    { key: 'follow', label: t('feed.tab.follow') },
    { key: 'foryou', label: t('feed.tab.foryou') },
    { key: 'near', label: t('feed.tab.near') },
  ];

  let body: React.ReactNode;
  if (tab === 'near') {
    // Près de moi is the map itself (under this header, above the tab bar).
    body = <NearMapView embedded />;
  } else if (loading) {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  } else if (error && tab === 'foryou') {
    body = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Txt center color={c.ink2}>
          {t('feed.error')}
        </Txt>
        <PrimaryButton label={t('common.retry')} onPress={refresh} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </View>
    );
  } else if (items.length === 0) {
    body =
      tab === 'follow' ? (
        <EmptyState
          title={t('feed.followEmpty')}
          body={t('feed.followEmptyBody')}
          cta={t('feed.followEmptyCta')}
          onCta={() => go('discover')}
        />
      ) : (
        <EmptyState title={t('feed.emptyTitle')} body={t('feed.emptyBody')} cta={t('feed.emptyCta')} onCta={() => go('list')} />
      );
  } else {
    body = (
      <FlatList
        key={tab}
        data={items}
        keyExtractor={(it) => (it.type === 'post' ? `p-${it.post.id}` : `l-${it.listing.id}`)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height || undefined}
        decelerationRate="fast"
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={c.ink3} />}
        renderItem={({ item }) =>
          item.type === 'post' ? (
            <PostCard post={item.post} height={height || 600} distanceKm={item.km} />
          ) : (
            <ListingCard item={item.listing} height={height || 600} />
          )
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.sink }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      {body}

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0, paddingHorizontal: 14 }}
      >
        <View pointerEvents="box-none" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo width={64} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
          {tab === 'near' ? null : (
          <PressScale
            onPress={() => go('map')}
            accessibilityLabel={t('explore.map')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 99,
              backgroundColor: 'rgba(12,10,13,0.42)',
              borderWidth: 1,
              borderColor: 'rgba(247,242,248,0.14)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MapIcon size={19} />
          </PressScale>
          )}
          </View>
        </View>
        <View pointerEvents="box-none" style={{ marginTop: 8 }}>
          <Segmented items={tabs} value={tab} onChange={(k) => set({ feedTab: k })} over />
        </View>
        {social.demo ? (
          <View pointerEvents="none" style={{ alignSelf: 'center', marginTop: 6 }}>
            <Txt size={10} weight="bold" upper color="rgba(247,242,248,0.55)">
              {t('demo.banner')}
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
