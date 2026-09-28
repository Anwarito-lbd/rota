/**
 * A fit or a dump, full-screen: swipe through the photos, double-tap to
 * like, tap "Louer le look" to reveal the tagged pieces and rent one.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useListings, type Listing } from '../data/listings';
import { useCommunity } from '../data/community';
import { useSocial, type Post } from '../data/social';
import { useT } from '../i18n';
import { useStore } from '../state/store';
import { BRAND_LAVENDER, OVER_INK, OVER_INK_SOFT } from '../theme/tokens';
import {
  BookmarkIcon,
  StarIcon,
  DotsIcon,
  HeartIcon,
  PinIcon,
  PlusIcon,
  ShareIcon,
  SparkleIcon,
  TagIcon,
  CheckIcon,
  CrownIcon,
  RepostIcon,
} from './icons';
import { Sheet, Txt } from './kit';
import { useTheme } from '../theme/useTheme';
import { TAB_BAR_SPACE } from './TabBar';
import {
  Avatar,
  GlassChip,
  HeartBurst,
  IdBadge,
  NATIVE_DRIVER,
  Pop,
  PressScale,
  Pulse,
  compact,
  tap,
  timeAgo,
} from './motion';

function RailButton({
  label,
  count,
  onPress,
  children,
  active,
}: {
  label: string;
  count?: string;
  onPress: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={label}
      scaleTo={0.84}
      style={{
        alignItems: 'center',
        minWidth: 48,
        minHeight: 48,
        gap: 2,
      }}
    >
      <Pop active={!!active}>{children}</Pop>
      {count ? (
        <Txt size={12} weight="bold" color={OVER_INK}>
          {count}
        </Txt>
      ) : null}
    </PressScale>
  );
}

/** Pulsing dot on the photo; opens the piece's mini card. */
function TagDot({ x, y, onPress, label }: { x: number; y: number; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={14}
      style={{ position: 'absolute', left: `${x * 100}%`, top: `${y * 100}%`, marginLeft: -16, marginTop: -16 }}
    >
      <Pulse style={{ position: 'absolute', width: 32, height: 32, borderRadius: 99, backgroundColor: 'rgba(226,169,241,0.45)' }} />
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 99,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 18,
            height: 18,
            borderRadius: 99,
            backgroundColor: BRAND_LAVENDER,
            borderWidth: 3,
            borderColor: OVER_INK,
          }}
        />
      </View>
    </Pressable>
  );
}

/** Slides up from the bottom of the card with the tagged piece. */
export function TagPeek({ listing, onClose, top }: { listing: Listing; onClose: () => void; top: number }) {
  const { set, m } = useStore();
  const { t } = useT();
  const y = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.spring(y, { toValue: 0, useNativeDriver: NATIVE_DRIVER, speed: 18, bounciness: 8 }).start();
  }, [y, listing.id]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 12,
        right: 72,
        top,
        transform: [{ translateY: y }],
        borderRadius: 20,
        backgroundColor: 'rgba(20,16,22,0.92)',
        borderWidth: 1,
        borderColor: 'rgba(247,242,248,0.14)',
        padding: 10,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <Image
        source={{ uri: listing.photos[0] }}
        style={{ width: 58, height: 72, borderRadius: 12, backgroundColor: '#251F29' }}
        contentFit="cover"
      />
      <View style={{ flex: 1 }}>
        <Txt size={11} weight="bold" upper color={BRAND_LAVENDER} numberOfLines={1}>
          {listing.brand ?? listing.category}
        </Txt>
        <Txt size={14} weight="semi" color={OVER_INK} numberOfLines={1}>
          {listing.title}
        </Txt>
        <Txt size={13} color={OVER_INK_SOFT}>
          {m(listing.price)} {t('common.perDay')} · {listing.sizes.join(' · ')}
        </Txt>
      </View>
      <View style={{ gap: 6 }}>
        <PressScale
          haptic="light"
          onPress={() => set({ screen: 'detail', activeId: listing.id })}
          style={{ paddingHorizontal: 14, minHeight: 34, borderRadius: 999, backgroundColor: BRAND_LAVENDER, justifyContent: 'center' }}
        >
          <Txt size={13} weight="bold" color="#2A1033">
            {t('feed.rent')}
          </Txt>
        </PressScale>
        <PressScale
          onPress={() => set({ screen: 'tryon', tryOnListingId: listing.id })}
          style={{
            paddingHorizontal: 14,
            minHeight: 30,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(247,242,248,0.3)',
            justifyContent: 'center',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <SparkleIcon size={13} color={OVER_INK} />
          <Txt size={12} weight="bold" color={OVER_INK}>
            {t('post.tryOn')}
          </Txt>
        </PressScale>
      </View>
      <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('common.close')} style={{ position: 'absolute', top: -8, right: -8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 99, backgroundColor: '#3A3140', alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={12} weight="bold" color={OVER_INK}>
            ×
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** The ⋯ sheet: one clear line per action instead of a column of icons. */
function PostMenu({
  visible,
  onClose,
  onShare,
  onTryOn,
  onReport,
  repost,
}: {
  visible: boolean;
  onClose: () => void;
  onShare: () => void;
  repost?: { on: boolean; toggle: () => void };
  onTryOn?: () => void;
  onReport?: () => void;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const item = (icon: React.ReactNode, label: string, sub: string | null, onPress: () => void, tone?: string) => (
    <PressScale
      key={label}
      scaleTo={0.98}
      onPress={() => {
        onClose();
        onPress();
      }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: c.line }}
    >
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Txt size={16} weight="semi" color={tone ?? c.ink}>
          {label}
        </Txt>
        {sub ? (
          <Txt size={13} color={c.ink3}>
            {sub}
          </Txt>
        ) : null}
      </View>
    </PressScale>
  );
  return (
    <Sheet visible={visible} onClose={onClose}>
      {onTryOn ? item(<SparkleIcon size={20} color={c.accent} />, t('post.tryOn'), t('post.tryOnSub'), onTryOn) : null}
      {repost ? item(<RepostIcon size={20} color={repost.on ? c.accent : c.ink} />, repost.on ? t('repost.undo') : t('repost.do'), repost.on ? null : t('repost.sub'), repost.toggle) : null}
      {item(<ShareIcon size={20} color={c.ink} />, t('post.share'), null, onShare)}
      {onReport ? item(<DotsIcon color={c.plum} />, t('post.report'), null, onReport, c.plum) : null}
    </Sheet>
  );
}

export function PostCard({ post, height, distanceKm }: { post: Post; height: number; distanceKm?: number }) {
  const { set } = useStore();
  const { t, lang } = useT();
  const { byId } = useListings();
  const social = useSocial();
  const community = useCommunity();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [showTags, setShowTags] = useState(false);
  const [peek, setPeek] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);
  const [menu, setMenu] = useState(false);
  const lastTap = useRef(0);

  const liked = social.isLiked(post.id);
  const saved = social.isSaved({ kind: 'post', id: post.id });
  const mine = post.authorId === social.meId;
  const following = social.isFollowing(post.authorId);
  const challenge = social.challenges.find((c) => c.id === post.challengeId);
  const tagged = useMemo(
    () => post.tags.map((tg) => ({ ...tg, listing: byId(tg.listingId) })).filter((tg) => !!tg.listing),
    [post.tags, byId],
  );
  const onPhoto = tagged.filter((tg) => tg.mediaIndex === index);
  const peekListing = peek ? byId(peek) : null;
  const peekTag = peek ? onPhoto.find((tg) => tg.listingId === peek) : undefined;
  // Just under the dot, but never over the caption block.
  const peekTop = Math.min((peekTag?.y ?? 0.4) * height + 28, height * 0.42);

  const onPhotoPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (!liked) social.toggleLike(post.id);
      tap('medium');
      setBurst((n) => n + 1);
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      setTimeout(() => {
        if (lastTap.current === now && tagged.length) setShowTags((v) => !v);
      }, 290);
    }
  };

  const openProfile = () => set({ screen: 'user', profileId: post.authorId });

  return (
    <View style={{ height, overflow: 'hidden', backgroundColor: '#0C0A0D' }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={post.media.length > 1}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          setPeek(null);
        }}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          if (i !== index) setIndex(i);
        }}
        scrollEventThrottle={64}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        {post.media.map((uri, i) => (
          <Pressable key={`${post.id}-${i}`} onPress={onPhotoPress} style={{ width, height }} accessibilityRole="image">
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} />
          </Pressable>
        ))}
      </ScrollView>

      <LinearGradient
        colors={['rgba(12,10,13,0.55)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0)', 'rgba(12,10,13,0.9)']}
        locations={[0, 0.22, 0.5, 0.95]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />

      {/* Keeps the white rail legible over light photos. */}
      <LinearGradient
        colors={['rgba(12,10,13,0)', 'rgba(12,10,13,0.38)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 110 }}
        pointerEvents="none"
      />

      {showTags
        ? onPhoto.map((tg) => (
            <TagDot
              key={`${tg.listingId}-${tg.mediaIndex}`}
              x={tg.x}
              y={tg.y}
              label={tg.listing?.title ?? ''}
              onPress={() => {
                tap();
                setPeek(tg.listingId);
              }}
            />
          ))
        : null}

      <HeartBurst trigger={burst} />

      {post.media.length > 1 ? (
        <View style={{ position: 'absolute', top: 136, alignSelf: 'center', flexDirection: 'row', gap: 5 }} pointerEvents="none">
          {post.media.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 99,
                backgroundColor: i === index ? OVER_INK : 'rgba(247,242,248,0.4)',
              }}
            />
          ))}
        </View>
      ) : null}

      {/* Right rail */}
      <View style={{ position: 'absolute', right: 8, bottom: 28 + TAB_BAR_SPACE, alignItems: 'center', gap: 12 }}>
        <View style={{ alignItems: 'center', marginBottom: 6 }}>
          <PressScale onPress={openProfile} accessibilityLabel={post.author.username}>
            <Avatar uri={post.author.avatar} size={50} ring />
          </PressScale>
          {!mine ? (
            <PressScale
              haptic="light"
              onPress={() => social.toggleFollow(post.authorId)}
              accessibilityLabel={following ? t('post.following') : t('post.follow')}
              style={{
                marginTop: -11,
                width: 22,
                height: 22,
                borderRadius: 99,
                backgroundColor: following ? OVER_INK : BRAND_LAVENDER,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {following ? (
                <CheckIcon size={13} color="#2A1033" />
              ) : (
                <PlusIcon size={14} color="#2A1033" />
              )}
            </PressScale>
          ) : null}
        </View>

        <RailButton
          label={t('post.like')}
          count={compact(post.likeCount, lang)}
          active={liked}
          onPress={() => {
            tap(liked ? 'light' : 'medium');
            social.toggleLike(post.id);
          }}
        >
          <HeartIcon size={32} fill={liked ? BRAND_LAVENDER : 'none'} color={liked ? BRAND_LAVENDER : OVER_INK} />
        </RailButton>

        <RailButton label={t('post.comments')} count={compact(post.commentCount, lang)} onPress={() => set({ commentsFor: post.id })}>
          <StarIcon size={30} fill="none" color={OVER_INK} />
        </RailButton>

        <RailButton label={t('post.save')} active={saved} onPress={() => set({ saveTarget: { kind: 'post', id: post.id } })}>
          <BookmarkIcon size={29} fill={saved ? OVER_INK : 'none'} />
        </RailButton>

        {/* Everything else lives behind ⋯: share, try on, report. */}
        <RailButton label={t('post.more')} onPress={() => setMenu(true)}>
          <DotsIcon />
        </RailButton>
      </View>

      <PostMenu
        visible={menu}
        onClose={() => setMenu(false)}
        onShare={() =>
          Share.share({ message: `@${post.author.username} sur Rota — https://therotaapp.com/p/${post.id}` }).catch(() => undefined)
        }
        onTryOn={tagged.length ? () => set({ screen: 'tryon', tryOnListingId: tagged[0].listingId }) : undefined}
        onReport={!mine ? () => set({ socialReport: { kind: 'post', id: post.id, memberId: post.authorId } }) : undefined}
        repost={!mine && post.distribution === 'public' ? { on: community.isReposted(post.id), toggle: () => community.toggleRepost(post.id) } : undefined}
      />

      {peekListing ? <TagPeek listing={peekListing} top={peekTop} onClose={() => setPeek(null)} /> : null}

      {/* Caption block */}
      <View style={{ position: 'absolute', left: 0, right: 70, bottom: 0, paddingHorizontal: 16, paddingBottom: 18 + TAB_BAR_SPACE }}>
        {community.repostedBy[post.id] ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <RepostIcon size={14} color={OVER_INK_SOFT} />
            <Txt size={12} weight="semi" color={OVER_INK_SOFT}>
              {t('repost.by').replace('{name}', community.repostedBy[post.id].username)}
            </Txt>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {mine && community.pro ? (
            <GlassChip style={{ backgroundColor: 'rgba(226,169,241,0.9)', borderColor: 'transparent' }}>
              <CrownIcon size={12} color="#2A1033" />
              <Txt size={11} weight="bold" upper color="#2A1033">
                {t('pro.boosted')}
              </Txt>
            </GlassChip>
          ) : null}
          <GlassChip>
            <Txt size={11} weight="bold" upper color={BRAND_LAVENDER}>
              {post.kind === 'dump' ? `${t('post.dump')} · ${post.media.length}` : t('post.fit')}
            </Txt>
          </GlassChip>
          {challenge ? (
            <PressScale onPress={() => set({ screen: 'discover', challenge: challenge.id })}>
              <GlassChip style={{ backgroundColor: 'rgba(226,169,241,0.9)', borderColor: 'transparent' }}>
                <Txt size={11} weight="bold" upper color="#2A1033">
                  #{challenge.title[lang]}
                </Txt>
              </GlassChip>
            </PressScale>
          ) : null}
          {post.area?.label ? (
            <GlassChip>
              <PinIcon size={12} color={OVER_INK} />
              <Txt size={11} weight="semi" color={OVER_INK}>
                {post.area.label}
                {distanceKm != null ? ` · ${distanceKm < 1 ? '<1' : distanceKm.toFixed(1)} ${t('post.km')}` : ''}
              </Txt>
            </GlassChip>
          ) : null}
        </View>

        <Pressable onPress={openProfile} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Txt size={16} weight="bold" color={OVER_INK}>
            @{post.author.username}
          </Txt>
          {post.author.identityVerified ? <IdBadge compact label={t('post.idVerified')} /> : null}
          <Txt size={13} color="rgba(247,242,248,0.6)">
            · {timeAgo(post.createdAt, lang)}
          </Txt>
        </Pressable>

        {post.caption ? (
          <Txt size={14} color={OVER_INK_SOFT} numberOfLines={2} style={{ marginTop: 4 }}>
            {post.caption}
          </Txt>
        ) : null}

        {post.distribution === 'pending' ? (
          <View style={{ marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(242,160,196,0.18)' }}>
            <Txt size={12} weight="bold" color="#F2A0C4">
              {t('post.pending')}
            </Txt>
            <Txt size={12} color={OVER_INK_SOFT}>
              {t('post.pendingBody')}
            </Txt>
          </View>
        ) : null}

        {tagged.length ? (
          <PressScale
            haptic="light"
            onPress={() => {
              setShowTags((v) => !v);
              setPeek(showTags ? null : tagged.find((tg) => tg.mediaIndex === index)?.listingId ?? null);
            }}
            style={{
              marginTop: 12,
              minHeight: 50,
              borderRadius: 16,
              backgroundColor: showTags ? OVER_INK : BRAND_LAVENDER,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <TagIcon size={17} color="#2A1033" />
            <Txt size={16} weight="bold" color="#2A1033">
              {showTags ? t('post.tapPieces') : `${t('post.rentLook')} · ${tagged.length}`}
            </Txt>
          </PressScale>
        ) : null}
      </View>
    </View>
  );
}
