/**
 * A profile, laid out like Instagram: avatar (ringed when there is a live
 * story) with posts / followers / following, name, badges and bio, then the
 * actions, highlights, and a grid of fits or pieces. Used for your own
 * profile (the Dressing tab) and for other members. No e-mail is ever shown.
 */
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCommunity, useHighlights, type Highlight } from '../data/community';
import { DEMO_ME } from '../data/demo';
import { useListings, useMyListings, type Listing } from '../data/listings';
import { useMember, useSocial } from '../data/social';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/config';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { ChevronLeft, DotsIcon, GridIcon, ImagesIcon, MenuIcon, PinIcon, PlusIcon, ShareIcon, ShieldCheckIcon, TagIcon } from './icons';
import { CertifiedMark, Display, Field, PrimaryButton, Sheet, Txt } from './kit';
import { AppealSheet } from './Moderation';
import { ProCrown, ShopBadge, useMemberBadges } from './Badges';
import { Avatar, FadeIn, IdBadge, PressScale, Skeleton, compact, tap } from './motion';
import { MessageButton } from './MessageButton';

const GAP = 2;

export function ProfileView({ memberId, onMenu, onBack }: { memberId: string | null; onMenu?: () => void; onBack?: () => void }) {
  const { state, set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const social = useSocial();
  const community = useCommunity();
  const { session, profile } = useAuth();
  const me = !!memberId && memberId === social.meId;
  const member = useMember(memberId);
  const { all: everyListing } = useListings();
  const publicListings = everyListing.filter((l) => l.distribution === 'public');
  const { listings: myListings, loading: myLoading } = useMyListings(me ? session?.user.id : undefined);
  const { highlights, create, remove } = useHighlights(memberId);
  const [tab, setTab] = useState<'fits' | 'pieces'>('fits');
  const [appealFor, setAppealFor] = useState<Listing | null>(null);
  const [newHighlight, setNewHighlight] = useState(false);

  const blocked = !me && !!memberId && social.isBlocked(memberId);
  const following = !!memberId && social.isFollowing(memberId);
  const posts = social.posts.filter((p) => p.authorId === memberId);
  const pieces = me ? myListings : publicListings.filter((l) => l.ownerId === memberId);
  const hasStory = !!memberId && community.storyAuthors.some((a) => a.id === memberId);
  const username = (me ? profile?.username : null) ?? member?.username ?? (me && social.demo ? DEMO_ME.username : '');
  const avatar = (me ? profile?.avatarUrl : null) ?? member?.avatar ?? (me && social.demo ? DEMO_ME.avatar : undefined) ?? undefined;
  const bio = (me ? profile?.bio : null) ?? member?.bio ?? null;
  const city = me && profile?.showCity ? profile.city : null;
  const onVacation = me
    ? social.demo
      ? state.vacation
      : !!profile?.vacation
    : publicListings.some((l) => l.ownerId === memberId && l.owner.vacation);
  const badges = useMemberBadges(memberId, member);
  const verified = me ? social.identity === 'verified' : !!member?.identityVerified;
  const cell = (Math.min(width, 720) - GAP * 2) / 3;

  const shareProfile = () => {
    const url = `${BRAND.site}/@${username}`;
    Share.share(Platform.OS === 'ios' ? { url, message: `@${username} sur Rota` } : { message: `@${username} sur Rota · ${url}` }).catch(() => undefined);
  };

  const openAvatar = () => {
    if (hasStory && memberId) return set({ screen: 'story', storyAuthorId: memberId });
    if (me) go('set.profile');
  };

  const askRemove = (h: Highlight) => {
    if (!me) return;
    const run = () => remove(h.id).catch(() => undefined);
    if (Platform.OS === 'web') return run();
    Alert.alert(h.title, t('highlights.deleteAsk'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('highlights.delete'), style: 'destructive', onPress: run },
    ]);
  };

  const stats: [string, string, (() => void) | null][] = [
    [compact(posts.length, lang), t('profile.posts'), null],
    [
      compact(member?.followers ?? 0, lang),
      t('profile.followers'),
      memberId ? () => set({ screen: 'follows', followList: { memberId, kind: 'followers' } }) : null,
    ],
    [
      compact(member?.following ?? (me ? social.followingIds.length : 0), lang),
      t('profile.following'),
      memberId ? () => set({ screen: 'follows', followList: { memberId, kind: 'following' } }) : null,
    ],
  ];

  const button = (label: string, onPress: () => void, primary = false) => (
    <PressScale
      haptic="light"
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary ? c.accent : c.surf2,
      }}
    >
      <Txt size={14} weight="bold" color={primary ? c.onAccent : c.ink}>
        {label}
      </Txt>
    </PressScale>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 4, paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top bar */}
      <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 }}>
        {onBack ? (
          <PressScale onPress={onBack} accessibilityLabel={t('common.back')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <ChevronLeft color={c.ink} />
          </PressScale>
        ) : null}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: onBack ? 'center' : 'flex-start', gap: 6, paddingLeft: onBack ? 0 : 6 }}>
          <Txt size={20} weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {username}
          </Txt>
          {badges.business ? <ShopBadge compact /> : null}
          {badges.pro ? <ProCrown size={17} /> : null}
        </View>
        {me ? (
          <>
            <PressScale onPress={() => set({ screen: 'camera' })} accessibilityLabel={t('create.title')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
              <PlusIcon size={24} color={c.ink} />
            </PressScale>
            {onMenu ? (
              <PressScale onPress={onMenu} accessibilityLabel={t('settings.title')} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                <MenuIcon size={24} color={c.ink} />
              </PressScale>
            ) : null}
          </>
        ) : memberId ? (
          <PressScale
            accessibilityLabel={t('post.more')}
            onPress={() => set({ socialReport: { kind: 'member', id: memberId, memberId } })}
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <DotsIcon color={c.ink} />
          </PressScale>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {!member && !me ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={86} radius={99} style={{ width: 86 }} />
          <Skeleton height={16} style={{ width: 160 }} />
          <Skeleton height={14} style={{ width: 220 }} />
        </View>
      ) : (
        <FadeIn style={{ paddingHorizontal: 16 }}>
          {/* Avatar and counts */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 6 }}>
            <PressScale onPress={openAvatar} accessibilityLabel={hasStory ? t('stories.open') : t('closet.editProfile')}>
              <View style={{ padding: 3, borderRadius: 99, borderWidth: hasStory ? 2.5 : 0, borderColor: c.accent }}>
                <Avatar uri={avatar} size={hasStory ? 80 : 86} />
              </View>
            </PressScale>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
              {stats.map(([n, label, onPress]) => (
                <Pressable key={label} disabled={!onPress || blocked} onPress={onPress ?? undefined} style={{ alignItems: 'center', minWidth: 64 }}>
                  <Txt size={18} weight="bold">
                    {n}
                  </Txt>
                  <Txt size={13} color={c.ink2}>
                    {label}
                  </Txt>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Name, badges, bio */}
          <View style={{ marginTop: 12, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Txt size={15} weight="bold">
                {badges.businessName ?? username}
              </Txt>
              {(me ? profile?.certified : member?.certified) ? <CertifiedMark size={15} /> : null}
              {verified ? <IdBadge compact label={t('verify.badge')} /> : null}
              {badges.pro ? <ProCrown size={16} /> : null}
            </View>
            {badges.business ? (
              <View style={{ flexDirection: 'row', marginTop: 2 }}>
                <ShopBadge />
              </View>
            ) : null}
            {bio ? (
              <Txt size={14} color={c.ink}>
                {bio}
              </Txt>
            ) : me ? (
              <Pressable onPress={() => go('set.profile')} hitSlop={6}>
                <Txt size={14} color={c.ink3}>
                  {t('profile.addBio')}
                </Txt>
              </Pressable>
            ) : null}
            {onVacation ? (
              <View style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: c.plumSoft }}>
                <Txt size={12} weight="semi" color={c.plum}>
                  {t('profile.onVacation')}
                </Txt>
              </View>
            ) : null}
            {city ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <PinIcon size={13} color={c.ink3} />
                <Txt size={13} color={c.ink2}>
                  {city}
                </Txt>
              </View>
            ) : null}
          </View>

          {/* Actions — never an e-mail button */}
          {me ? (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
              {button(t('closet.editProfile'), () => go('set.profile'))}
              {button(t('profile.share'), shareProfile)}
            </View>
          ) : blocked ? (
            <View style={{ marginTop: 14, gap: 8 }}>
              <Txt size={14} color={c.ink2}>
                {t('profile.blocked')}
              </Txt>
              {button(t('profile.unblock'), () => memberId && social.unblock(memberId))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 14, alignItems: 'center' }}>
              <View style={{ flex: 1, flexDirection: 'row' }}>
                {button(following ? t('post.following') : t('post.follow'), () => memberId && social.toggleFollow(memberId), !following)}
              </View>
              {memberId ? <MessageButton memberId={memberId} compact label={t('profile.message')} style={{ flex: 1 }} /> : null}
              <PressScale
                onPress={shareProfile}
                accessibilityLabel={t('profile.share')}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: c.surf2, alignItems: 'center', justifyContent: 'center' }}
              >
                <ShareIcon size={17} color={c.ink} />
              </PressScale>
            </View>
          )}

          {me && social.identity !== 'verified' ? (
            <Pressable
              onPress={() => set({ screen: 'verify', afterVerify: 'closet' })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: c.surf }}
            >
              <ShieldCheckIcon size={18} color={c.accent} />
              <Txt size={13} style={{ flex: 1 }}>
                {t('profile.verifyNudge')}
              </Txt>
              <Txt size={13} weight="bold" color={c.accent}>
                {t('verify.gateCta')}
              </Txt>
            </Pressable>
          ) : null}
        </FadeIn>
      )}

      {/* Highlights */}
      {!blocked && (me || highlights.length) ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 4 }}>
          {highlights.map((h) => (
            <Pressable
              key={h.id}
              onPress={() => memberId && set({ screen: 'highlight', highlight: { memberId, id: h.id } })}
              onLongPress={() => askRemove(h)}
              accessibilityRole="button"
              accessibilityLabel={h.title}
              style={{ alignItems: 'center', width: 68 }}
            >
              <View style={{ width: 66, height: 66, borderRadius: 99, borderWidth: 1, borderColor: c.line2, padding: 3 }}>
                <Image source={{ uri: h.media[0] }} style={{ flex: 1, borderRadius: 99, backgroundColor: c.surf2 }} contentFit="cover" />
              </View>
              <Txt size={12} numberOfLines={1} style={{ marginTop: 5 }}>
                {h.title}
              </Txt>
            </Pressable>
          ))}
          {me ? (
            <Pressable onPress={() => setNewHighlight(true)} accessibilityRole="button" accessibilityLabel={t('highlights.new')} style={{ alignItems: 'center', width: 68 }}>
              <View style={{ width: 66, height: 66, borderRadius: 99, borderWidth: 1, borderColor: c.line2, alignItems: 'center', justifyContent: 'center' }}>
                <PlusIcon size={26} color={c.ink} />
              </View>
              <Txt size={12} numberOfLines={1} style={{ marginTop: 5 }}>
                {t('highlights.new')}
              </Txt>
            </Pressable>
          ) : null}
        </ScrollView>
      ) : null}

      {/* Grid tabs */}
      {!blocked ? (
        <>
          <View style={{ flexDirection: 'row', marginTop: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
            {(
              [
                ['fits', GridIcon, `${t('profile.fits')} · ${posts.length}`],
                ['pieces', TagIcon, `${t('profile.pieces')} · ${pieces.length}`],
              ] as const
            ).map(([key, Icon, label]) => {
              const on = tab === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap('light');
                    setTab(key);
                  }}
                  style={{ flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1.5, borderBottomColor: on ? c.ink : 'transparent', marginBottom: -1 }}
                >
                  <Icon size={22} color={on ? c.ink : c.ink3} />
                </Pressable>
              );
            })}
          </View>

          {tab === 'pieces' && me && myLoading ? <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} /> : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: GAP }}>
            {tab === 'fits'
              ? posts.map((p) => (
                  <Pressable key={p.id} onPress={() => set({ screen: 'post', activePostId: p.id })} accessibilityRole="button" accessibilityLabel={p.caption ?? t('profile.fits')}>
                    <View style={{ width: cell, height: cell * 1.25, backgroundColor: c.surf2 }}>
                      <Image source={{ uri: p.media[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      {p.media.length > 1 ? (
                        <View style={{ position: 'absolute', top: 6, right: 6 }}>
                          <ImagesIcon size={16} color={OVER_INK} />
                        </View>
                      ) : p.tags.length ? (
                        <View style={{ position: 'absolute', top: 6, right: 6 }}>
                          <TagIcon size={14} color={OVER_INK} />
                        </View>
                      ) : null}
                      {p.distribution === 'pending' ? <Badge label={t('post.pending')} color={c.plum} ink={c.onplum} /> : null}
                    </View>
                  </Pressable>
                ))
              : pieces.map((l) => {
                  const restricted = l.distribution === 'limited' || l.distribution === 'blocked';
                  return (
                    <Pressable
                      key={l.id}
                      onPress={() => (me && restricted ? setAppealFor(l) : set({ screen: 'detail', activeId: l.id }))}
                      accessibilityRole="button"
                      accessibilityLabel={l.title}
                    >
                      <View style={{ width: cell, height: cell * 1.25, backgroundColor: c.surf2 }}>
                        <Image source={{ uri: l.photos[0] ?? l.video ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                        <View style={{ position: 'absolute', left: 6, bottom: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(12,10,13,0.62)' }}>
                          <Txt size={11} weight="bold" color={OVER_INK}>
                            {`${m(l.price)} ${t('common.perDay')}`}
                          </Txt>
                        </View>
                        {me && l.distribution !== 'public' ? (
                          <Badge
                            top
                            label={t(`moderation.state.${l.distribution}` as TranslationKey)}
                            color={restricted ? c.plum : c.surf2}
                            ink={restricted ? c.onplum : c.ink}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
          </View>

          {(tab === 'fits' ? posts.length : pieces.length) === 0 && !(tab === 'pieces' && myLoading) ? (
            <View style={{ alignItems: 'center', marginTop: 28, gap: 12, paddingHorizontal: 24 }}>
              <Txt center color={c.ink3}>
                {me ? (tab === 'fits' ? t('profile.empty') : t('closet.noPieces')) : t('profile.emptyOther')}
              </Txt>
              {me ? (
                <PrimaryButton
                  label={tab === 'fits' ? t('create.post') : t('create.list')}
                  onPress={() => set({ screen: 'camera' })}
                  style={{ alignSelf: 'center', paddingHorizontal: 24 }}
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {me ? <AppealSheet listing={appealFor} onClose={() => setAppealFor(null)} /> : null}
      {me ? <NewHighlightSheet visible={newHighlight} onClose={() => setNewHighlight(false)} create={create} /> : null}
    </ScrollView>
  );
}

function Badge({ label, color, ink, top }: { label: string; color: string; ink: string; top?: boolean }) {
  return (
    <View style={{ position: 'absolute', [top ? 'top' : 'bottom']: 6, left: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: color }}>
      <Txt size={9} weight="bold" color={ink}>
        {label}
      </Txt>
    </View>
  );
}

/** Pick photos from your own posts and name the highlight. */
function NewHighlightSheet({
  visible,
  onClose,
  create,
}: {
  visible: boolean;
  onClose: () => void;
  create: (title: string, media: string[]) => Promise<void>;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const { width } = useWindowDimensions();
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = [...new Set(social.posts.filter((p) => p.authorId === social.meId).flatMap((p) => p.media))];
  const size = (Math.min(width, 720) - 40 - 12) / 4;

  const toggle = (uri: string) =>
    setPicked((cur) => (cur.includes(uri) ? cur.filter((x) => x !== uri) : cur.length >= 20 ? cur : [...cur, uri]));

  const save = async () => {
    if (!title.trim() || !picked.length || busy) return;
    setBusy(true);
    setError(null);
    try {
      await create(title, picked);
      setTitle('');
      setPicked([]);
      onClose();
    } catch {
      setError(t('highlights.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Display size={26}>{t('highlights.new')}</Display>
      <Txt size={14} color={c.ink2} style={{ marginTop: 6 }}>
        {t('highlights.help')}
      </Txt>
      <View style={{ marginTop: 14 }}>
        <Field label={t('highlights.name')} value={title} onChangeText={(v) => setTitle(v.slice(0, 24))} placeholder={t('highlights.namePlaceholder')} autoCapitalize="sentences" />
      </View>
      {photos.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 14 }}>
          {photos.map((uri) => {
            const n = picked.indexOf(uri);
            return (
              <Pressable key={uri} onPress={() => toggle(uri)} accessibilityRole="checkbox" accessibilityState={{ checked: n >= 0 }}>
                <Image source={{ uri }} style={{ width: size, height: size * 1.25, borderRadius: 8, opacity: n >= 0 ? 1 : 0.75 }} contentFit="cover" />
                <View
                  style={{
                    position: 'absolute',
                    top: 5,
                    right: 5,
                    width: 22,
                    height: 22,
                    borderRadius: 99,
                    borderWidth: 1.5,
                    borderColor: OVER_INK,
                    backgroundColor: n >= 0 ? c.accent : 'rgba(0,0,0,0.25)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {n >= 0 ? (
                    <Txt size={11} weight="bold" color={c.onAccent}>
                      {n + 1}
                    </Txt>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Txt color={c.ink3} style={{ marginTop: 14 }}>
          {t('highlights.noPhotos')}
        </Txt>
      )}
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
      <PrimaryButton
        label={busy ? t('common.loading') : t('highlights.create')}
        disabled={busy || !title.trim() || !picked.length}
        onPress={save}
        style={{ marginTop: 16 }}
      />
    </Sheet>
  );
}
