/**
 * Follower lists, activity (notifications), the story viewer, Rota Pro and
 * the outfit planner.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OCCASIONS } from '../data/catalog';
import { PRO_PRICE_EUR, PurchaseUnavailable, TRYON_PRICE_EUR, useActivity, useCommunity, useFollowList, type Activity, type Person, useHighlights } from '../data/community';
import { useListings, type Listing } from '../data/listings';
import { useMember, useSocial } from '../data/social';
import { useT } from '../i18n';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { FlatPage, FlatSection } from '../ui/Flat';
import { CalendarIcon, CloseIcon, CrownIcon, DotsIcon, SparkleIcon, TagIcon } from '../ui/icons';
import { Amount, BackButton, Chip, GhostButton, PrimaryButton, Screen, Txt } from '../ui/kit';
import { Avatar, FadeIn, IdBadge, PressScale, Segmented, tap, timeAgo, useReducedMotion } from '../ui/motion';

// ─── Follow button used in lists ──────────────────────────────

function FollowButton({ memberId }: { memberId: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  if (memberId === social.meId) return null;
  const on = social.isFollowing(memberId);
  return (
    <PressScale
      haptic="light"
      onPress={() => social.toggleFollow(memberId)}
      style={{ paddingHorizontal: 16, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? c.surf2 : c.accent }}
    >
      <Txt size={14} weight="bold" color={on ? c.ink : c.onAccent}>
        {on ? t('post.following') : t('post.follow')}
      </Txt>
    </PressScale>
  );
}

function PersonRow({ p, right, onPress }: { p: Person; right?: React.ReactNode; onPress: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: pressed ? c.surf2 : 'transparent' })}
    >
      <Avatar uri={p.avatar} size={46} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt size={15} weight="bold">
            {p.username}
          </Txt>
          {p.verified ? <IdBadge compact label={t('post.idVerified')} /> : null}
        </View>
      </View>
      {right}
    </Pressable>
  );
}

// ─── Followers / following ────────────────────────────────────

export function FollowList() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const target = state.followList;
  const social = useSocial();
  const [kind, setKind] = useState<'followers' | 'following'>(target?.kind ?? 'followers');
  const people = useFollowList(target?.memberId ?? null, kind);
  useEffect(() => {
    if (target) setKind(target.kind);
  }, [target]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56 }}>
        <BackButton onPress={() => (target && target.memberId !== social.meId ? set({ screen: 'user', profileId: target.memberId }) : go('closet'))} />
      </View>
      <Segmented
        items={[
          { key: 'followers', label: t('follows.followers') },
          { key: 'following', label: t('follows.following') },
        ]}
        value={kind}
        onChange={setKind}
      />
      <ScrollView contentContainerStyle={{ paddingTop: 10, paddingBottom: insets.bottom + 100 }}>
        {people === null ? null : people.length === 0 ? (
          <Txt center color={c.ink3} style={{ marginTop: 30 }}>
            {t('follows.empty')}
          </Txt>
        ) : (
          people.map((p, i) => (
            <FadeIn key={p.id} delay={Math.min(i, 8) * 30}>
              <PersonRow p={p} right={<FollowButton memberId={p.id} />} onPress={() => set({ screen: 'user', profileId: p.id })} />
            </FadeIn>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Activity ─────────────────────────────────────────────────

export function ActivityScreen() {
  const { set, go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const items = useActivity();

  const line = (a: Activity) => {
    const key = `activity.${a.kind}` as 'activity.like';
    return (
      <Txt size={14} color={c.ink2} numberOfLines={3}>
        <Txt size={14} weight="bold">
          {a.actor.username}
        </Txt>{' '}
        {t(key)}
        {a.body ? ` ${a.body}` : ''}{' '}
        <Txt size={13} color={c.ink3}>
          {timeAgo(a.createdAt, lang)}
        </Txt>
      </Txt>
    );
  };

  return (
    <FlatPage title={t('activity.title')} onBack={() => go('feed')}>
      <FlatSection first>
        {items === null ? null : items.length === 0 ? (
          <Txt center color={c.ink3} style={{ marginTop: 30 }}>
            {t('activity.empty')}
          </Txt>
        ) : (
          items.map((a, i) => (
            <FadeIn key={a.id} delay={Math.min(i, 8) * 30}>
              <Pressable
                onPress={() => (a.postId ? set({ screen: 'post', activePostId: a.postId }) : set({ screen: 'user', profileId: a.actor.id }))}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: pressed ? c.surf2 : 'transparent' })}
              >
                <Pressable onPress={() => set({ screen: 'user', profileId: a.actor.id })}>
                  <Avatar uri={a.actor.avatar} size={44} />
                </Pressable>
                <View style={{ flex: 1 }}>{line(a)}</View>
                {a.kind === 'follow' ? (
                  <FollowButton memberId={a.actor.id} />
                ) : a.media ? (
                  <Image source={{ uri: a.media }} style={{ width: 44, height: 56, borderRadius: 8 }} contentFit="cover" />
                ) : null}
              </Pressable>
            </FadeIn>
          ))
        )}
      </FlatSection>
    </FlatPage>
  );
}

// ─── Stories ──────────────────────────────────────────────────

const STORY_MS = 5000;

export function StoryViewer() {
  const { state, set, go } = useStore();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const community = useCommunity();
  const social = useSocial();
  const reduced = useReducedMotion();

  const authors = community.storyAuthors;
  const [authorIndex, setAuthorIndex] = useState(Math.max(0, authors.findIndex((a) => a.id === state.storyAuthorId)));
  const author = authors[authorIndex];
  const own = useMemo(() => community.stories.filter((s) => s.author.id === author?.id).reverse(), [community.stories, author]);
  const [index, setIndex] = useState(0);
  const story = own[index];
  const progress = useRef(new Animated.Value(0)).current;

  const close = () => go('messages');
  const next = () => {
    if (index < own.length - 1) return setIndex(index + 1);
    if (authorIndex < authors.length - 1) {
      setAuthorIndex(authorIndex + 1);
      setIndex(0);
      return;
    }
    close();
  };
  const prev = () => {
    if (index > 0) return setIndex(index - 1);
    if (authorIndex > 0) {
      setAuthorIndex(authorIndex - 1);
      setIndex(0);
    }
  };

  useEffect(() => {
    if (!story) return;
    community.markSeen(story.id);
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: reduced ? STORY_MS * 1.5 : STORY_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && next());
    return () => anim.stop();
    // Restart the timer for each story.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  if (!story || !author) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <GhostButton label={t('camera.close')} onPress={close} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Image source={{ uri: story.media }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }} pointerEvents="none" />

      {/* Tap left / right to move */}
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        <Pressable accessibilityLabel="previous" onPress={prev} style={{ width: width * 0.35 }} />
        <Pressable accessibilityLabel="next" onPress={next} style={{ flex: 1 }} />
      </View>

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {own.map((s, i) => (
            <View key={s.id} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              {i < index ? (
                <View style={{ flex: 1, backgroundColor: OVER_INK }} />
              ) : i === index ? (
                <Animated.View style={{ height: 3, backgroundColor: OVER_INK, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Pressable onPress={() => set({ screen: 'user', profileId: author.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Avatar uri={author.avatar} size={34} />
            <Txt size={15} weight="bold" color={OVER_INK}>
              {author.id === social.meId ? t('stories.yours') : author.username}
            </Txt>
            <Txt size={13} color="rgba(247,242,248,0.7)">
              {timeAgo(story.createdAt, lang)}
            </Txt>
          </Pressable>
          {author.id !== social.meId ? (
            <Pressable
              hitSlop={10}
              onPress={() => set({ socialReport: { kind: 'member', id: author.id, memberId: author.id } })}
              style={{ paddingHorizontal: 8 }}
            >
              <DotsIcon />
            </Pressable>
          ) : null}
          <Pressable hitSlop={10} onPress={close} accessibilityLabel={t('camera.close')}>
            <CloseIcon size={24} />
          </Pressable>
        </View>
      </View>

      {story.caption ? (
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 30 }}>
          <Txt size={16} color={OVER_INK} center>
            {story.caption}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

/** The row of story circles at the top of Messages. */
export function StoriesRow() {
  const { set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const community = useCommunity();
  const social = useSocial();
  const hasMine = community.storyAuthors.some((a) => a.id === social.meId);
  const unseen = (id: string) => community.stories.some((s) => s.author.id === id && !community.seenStories.includes(s.id));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 18, paddingVertical: 10 }}>
      {!hasMine ? (
        <Pressable onPress={() => set({ screen: 'camera' })} style={{ alignItems: 'center', width: 70 }}>
          <View style={{ width: 66, height: 66, borderRadius: 99, borderWidth: 2, borderColor: c.line2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={28} color={c.accent}>
              +
            </Txt>
          </View>
          <Txt size={11} color={c.ink2} numberOfLines={1} style={{ marginTop: 4 }}>
            {t('stories.yours')}
          </Txt>
        </Pressable>
      ) : null}
      {community.storyAuthors.map((a) => {
        const fresh = unseen(a.id);
        return (
          <Pressable key={a.id} onPress={() => set({ screen: 'story', storyAuthorId: a.id })} style={{ alignItems: 'center', width: 70 }}>
            <View style={{ padding: 2.5, borderRadius: 99, borderWidth: 2.5, borderColor: fresh ? c.accent : c.line2 }}>
              <Avatar uri={a.avatar} size={58} />
            </View>
            <Txt size={11} color={c.ink2} numberOfLines={1} style={{ marginTop: 4 }}>
              {a.id === social.meId ? t('stories.yours') : a.username}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Rota Pro ─────────────────────────────────────────────────

export function ProScreen() {
  const { state, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const community = useCommunity();
  const social = useSocial();
  const [note, setNote] = useState<string | null>(null);

  const buy = async (fn: () => Promise<void>) => {
    setNote(null);
    try {
      await fn();
      tap('success');
    } catch (e) {
      setNote(e instanceof PurchaseUnavailable ? t('pro.iapSoon') : String(e));
    }
  };

  const perks: [React.ReactNode, string, string][] = [
    [<SparkleIcon key="a" size={22} color={c.accent} />, t('pro.perkTryOn'), t('pro.perkTryOnBody')],
    [<CalendarIcon key="b" size={22} color={c.accent} />, t('pro.perkPlanner'), t('pro.perkPlannerBody')],
    [<TagIcon key="c" size={20} color={c.accent} />, t('pro.perkBoost'), t('pro.perkBoostBody')],
    [<CrownIcon key="d" size={22} color={c.accent} />, t('pro.perkBadge'), t('pro.perkBadgeBody')],
  ];

  return (
    <Screen bottomInset={60}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
        <BackButton onPress={() => go(state.proFrom ?? 'closet')} />
      </View>
      <FadeIn>
        <LinearGradient colors={[c.accent, c.plum]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: 22 }}>
          <CrownIcon size={34} color={c.onAccent} />
          <Txt size={30} weight="bold" color={c.onAccent} style={{ marginTop: 10 }}>
            {t('pro.title')}
          </Txt>
          <Txt size={15} color={c.onAccent} style={{ marginTop: 6, opacity: 0.9 }}>
            {t('pro.tagline')}
          </Txt>
          <Amount size={26} color={c.onAccent} style={{ marginTop: 14 }}>
            {t('pro.price').replace('{price}', m(PRO_PRICE_EUR))}
          </Amount>
        </LinearGradient>
      </FadeIn>

      <View style={{ marginTop: 18, gap: 14 }}>
        {perks.map(([icon, title, body], i) => (
          <FadeIn key={title} delay={60 + i * 50} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
            <View style={{ flex: 1 }}>
              <Txt size={16} weight="bold">
                {title}
              </Txt>
              <Txt size={14} color={c.ink2} style={{ marginTop: 2 }}>
                {body}
              </Txt>
            </View>
          </FadeIn>
        ))}
      </View>

      {community.pro ? (
        <View style={{ marginTop: 22, gap: 10 }}>
          <View style={{ padding: 14, borderRadius: 14, backgroundColor: c.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <CrownIcon size={20} color={c.accent} />
            <Txt weight="bold" color={c.accent}>
              {t('pro.active')}
            </Txt>
          </View>
          <GhostButton label={t('pro.manage')} onPress={community.cancelPro} />
        </View>
      ) : (
        <PrimaryButton label={t('pro.subscribe')} onPress={() => buy(community.subscribe)} style={{ marginTop: 22 }} />
      )}

      <View style={{ marginTop: 22, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: c.line2 }}>
        <Txt size={16} weight="bold">
          {t('pro.payg')}
        </Txt>
        <Txt size={14} color={c.ink2} style={{ marginTop: 4 }}>
          {t('pro.paygBody').replace('{price}', m(TRYON_PRICE_EUR))}
        </Txt>
        <Txt size={13} color={c.ink3} style={{ marginTop: 6 }}>
          {t('pro.credits').replace('{n}', String(community.tryOnCredits))}
        </Txt>
        <GhostButton label={t('pro.buyOne')} tone="accent" onPress={() => buy(() => community.buyTryOn(1))} style={{ marginTop: 12 }} />
      </View>

      {note ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 12 }}>
          {note}
        </Txt>
      ) : null}
      <Txt size={12} color={c.ink3} style={{ marginTop: 16 }}>
        {t('pro.legal')}
      </Txt>
      {social.demo ? (
        <Txt size={12} color={c.ink3} style={{ marginTop: 6 }}>
          {t('pro.demo')}
        </Txt>
      ) : null}
    </Screen>
  );
}

// ─── Outfit planner ───────────────────────────────────────────

const BUDGETS = [null, 20, 40, 60] as const;

/** Rule-based pick used in demo mode and when the AI service can't answer. */
function localOutfit(listings: Listing[], occasion: string, budget: number | null, seed: number): Listing[] {
  const pool = listings.filter((l) => l.distribution === 'public' && (budget == null || l.price <= budget));
  const matching = pool.filter((l) => l.occasion === occasion);
  const base = (matching.length ? matching : pool).slice();
  // Stable shuffle from the seed, so "Une autre idée" gives a new combination.
  base.sort((a, b) => ((a.id.charCodeAt(0) * 31 + seed * 17) % 97) - ((b.id.charCodeAt(0) * 31 + seed * 17) % 97));
  const picked: Listing[] = [];
  const cats = new Set<string>();
  for (const l of base) {
    const cat = (l.categoryId ?? l.category).split('.').slice(0, 2).join('.');
    if (cats.has(cat)) continue;
    cats.add(cat);
    picked.push(l);
    if (picked.length === 3) break;
  }
  return picked;
}

export function PlannerScreen() {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { listings, byId } = useListings();
  const community = useCommunity();
  const social = useSocial();
  const [occasion, setOccasion] = useState(OCCASIONS[1]);
  const [budget, setBudget] = useState<number | null>(null);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<{ items: Listing[]; ai: boolean; note?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const generate = async (nextSeed = seed) => {
    if (!community.pro) return set({ screen: 'pro', proFrom: 'planner' });
    setBusy(true);
    try {
      if (!social.demo && supabase) {
        const { data, error } = await supabase.functions.invoke('outfit-planner', { body: { occasion, budget, seed: nextSeed } });
        const ids: string[] = !error && Array.isArray(data?.listingIds) ? data.listingIds : [];
        const items = ids.map((id) => byId(id)).filter((l): l is Listing => !!l);
        if (items.length) return setResult({ items, ai: true, note: typeof data?.note === 'string' ? data.note : undefined });
      }
      setResult({ items: localOutfit(listings, occasion, budget, nextSeed), ai: false });
    } finally {
      setBusy(false);
    }
  };

  const total = result?.items.reduce((sum, l) => sum + l.price, 0) ?? 0;

  return (
    <Screen bottomInset={60}>
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center' }}>
        <BackButton onPress={() => go('closet')} />
      </View>
      <Txt size={28} weight="bold">
        {t('planner.title')}
      </Txt>
      <Txt size={15} color={c.ink2} style={{ marginTop: 6 }}>
        {t('planner.intro')}
      </Txt>
      {!community.pro ? (
        <Pressable onPress={() => set({ screen: 'pro', proFrom: 'planner' })} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: c.accentSoft }}>
          <CrownIcon size={18} color={c.accent} />
          <Txt size={14} weight="semi" color={c.accent}>
            {t('planner.proOnly')}
          </Txt>
        </Pressable>
      ) : null}

      <Txt size={15} weight="bold" style={{ marginTop: 22 }}>
        {t('planner.occasion')}
      </Txt>
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {OCCASIONS.map((o) => (
          <Chip key={o} label={o} on={occasion === o} onPress={() => setOccasion(o)} />
        ))}
      </View>

      <Txt size={15} weight="bold" style={{ marginTop: 18 }}>
        {t('planner.budget')}
      </Txt>
      <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BUDGETS.map((b) => (
          <Chip key={String(b)} label={b == null ? t('planner.any') : `≤ ${m(b)}`} on={budget === b} onPress={() => setBudget(b)} />
        ))}
      </View>

      <PrimaryButton label={busy ? t('common.loading') : t('planner.generate')} disabled={busy} onPress={() => generate()} style={{ marginTop: 22 }} />

      {result ? (
        <FadeIn style={{ marginTop: 26 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <Txt size={20} weight="bold">
              {t('planner.result')}
            </Txt>
            {result.items.length ? (
              <Amount size={14} color={c.ink2}>
                {t('planner.total').replace('{price}', m(total))}
              </Amount>
            ) : null}
          </View>
          <Txt size={12} color={c.ink3} style={{ marginTop: 4 }}>
            {result.ai ? t('planner.ai') : t('planner.local')}
          </Txt>
          {result.note ? (
            <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
              {result.note}
            </Txt>
          ) : null}
          {result.items.length === 0 ? (
            <Txt color={c.ink3} style={{ marginTop: 14 }}>
              {t('planner.empty')}
            </Txt>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {result.items.map((l) => (
                <PressScale key={l.id} scaleTo={0.98} onPress={() => set({ screen: 'detail', activeId: l.id })} style={{ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 16, backgroundColor: c.surf, borderWidth: 1, borderColor: c.line }}>
                  <Image source={{ uri: l.photos[0] }} style={{ width: 70, height: 90, borderRadius: 10 }} contentFit="cover" />
                  <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Txt weight="bold" numberOfLines={2}>
                      {l.title}
                    </Txt>
                    <Txt size={13} color={c.ink3} style={{ marginTop: 2 }}>
                      {[l.brand, l.sizes.join(' · ')].filter(Boolean).join(' · ')}
                    </Txt>
                    <Amount size={14} color={c.accent} style={{ marginTop: 4 }}>
                      {`${m(l.price)} ${t('common.perDay')}`}
                    </Amount>
                  </View>
                </PressScale>
              ))}
            </View>
          )}
          <GhostButton
            label={t('planner.again')}
            onPress={() => {
              const next = seed + 1;
              setSeed(next);
              generate(next);
            }}
            style={{ marginTop: 14 }}
          />
        </FadeIn>
      ) : null}
    </Screen>
  );
}

// ─── Highlight viewer ─────────────────────────────────────────

/** A profile highlight, full screen: tap right for the next photo, left to go back. */
export function HighlightViewer() {
  const { state, set } = useStore();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const reduced = useReducedMotion();
  const memberId = state.highlight?.memberId ?? null;
  const { highlights } = useHighlights(memberId);
  const member = useMember(memberId);
  const [hIndex, setHIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;

  // Start on the highlight that was tapped, once the list is loaded.
  useEffect(() => {
    const i = highlights.findIndex((h) => h.id === state.highlight?.id);
    if (i >= 0) setHIndex(i);
  }, [highlights, state.highlight?.id]);

  const current = highlights[hIndex];
  const photo = current?.media[index];

  const close = () =>
    memberId && memberId !== social.meId
      ? set({ screen: 'user', profileId: memberId, highlight: null })
      : set({ screen: 'closet', highlight: null });
  const next = () => {
    if (!current) return close();
    if (index < current.media.length - 1) return setIndex(index + 1);
    if (hIndex < highlights.length - 1) {
      setHIndex(hIndex + 1);
      setIndex(0);
      return;
    }
    close();
  };
  const prev = () => {
    if (index > 0) return setIndex(index - 1);
    if (hIndex > 0) {
      setHIndex(hIndex - 1);
      setIndex(0);
    }
  };

  useEffect(() => {
    if (!photo) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: reduced ? STORY_MS * 1.5 : STORY_MS, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && next());
    return () => anim.stop();
    // Restart the timer for each photo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo, hIndex, index]);

  if (!current || !photo) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <GhostButton label={t('camera.close')} onPress={close} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Image source={{ uri: photo }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160 }} pointerEvents="none" />

      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }}>
        <Pressable accessibilityLabel={t('common.back')} onPress={prev} style={{ width: width * 0.35 }} />
        <Pressable accessibilityLabel={t('common.next')} onPress={next} style={{ flex: 1 }} />
      </View>

      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {current.media.map((uri, i) => (
            <View key={`${uri}-${i}`} style={{ flex: 1, height: 3, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
              {i < index ? (
                <View style={{ flex: 1, backgroundColor: OVER_INK }} />
              ) : i === index ? (
                <Animated.View style={{ height: 3, backgroundColor: OVER_INK, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
              ) : null}
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <Avatar uri={member?.avatar} size={34} />
          <View style={{ flex: 1 }}>
            <Txt size={15} weight="bold" color={OVER_INK} numberOfLines={1}>
              {current.title}
            </Txt>
            {member ? (
              <Txt size={12} color="rgba(247,242,248,0.7)" numberOfLines={1}>
                @{member.username}
              </Txt>
            ) : null}
          </View>
          <Pressable hitSlop={10} onPress={close} accessibilityLabel={t('camera.close')}>
            <CloseIcon size={24} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
