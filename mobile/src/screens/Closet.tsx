import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View, useWindowDimensions } from 'react-native';
import { useMyListings, type Listing } from '../data/listings';
import { DEMO_ME } from '../data/demo';
import { useMember, useSocial } from '../data/social';
import { useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStore } from '../state/store';
import { OVER_INK } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { CalendarIcon, CheckIcon, GearIcon, TagIcon } from '../ui/icons';
import { Amount, Card, CertifiedMark, Display, GhostButton, Group, PrimaryButton, Row, Screen, Txt } from '../ui/kit';
import { AppealSheet } from '../ui/Moderation';
import { Avatar, FadeIn, IdBadge, PressScale, Segmented, compact } from '../ui/motion';

/**
 * Dressing = your profile (Figma 07 plus the social layer): who you follow,
 * who follows you, your posts and the pieces you rent out, then your
 * verifications, rentals and settings.
 */
export function Closet() {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const { session, profile } = useAuth();
  const { listings, loading } = useMyListings(session?.user.id);
  const social = useSocial();
  const member = useMember(social.meId);
  const [tab, setTab] = useState<'posts' | 'pieces'>('posts');
  const [appealFor, setAppealFor] = useState<Listing | null>(null);

  const posts = social.posts.filter((p) => p.authorId === social.meId);
  const username = profile?.username ?? member?.username ?? (social.demo ? DEMO_ME.username : '…');
  const avatar = profile?.avatarUrl ?? member?.avatar ?? (social.demo ? DEMO_ME.avatar : null);
  const email = session?.user.email ?? (social.demo ? 'demo@therotaapp.com' : null);
  const bio = profile?.bio ?? member?.bio ?? null;
  const cell = (Math.min(width, 720) - 36 - 8) / 3;

  const checks = [
    { label: t('closet.emailVerified'), done: !!session?.user.email_confirmed_at || social.demo, go: 'set.account' as const },
    { label: t('closet.identity'), done: social.identity === 'verified', go: 'verify' as const },
    { label: t('closet.certified'), done: !!profile?.certified, go: 'set.account' as const },
  ];
  const done = checks.filter((x) => x.done).length;

  const stats: [string, string][] = [
    [compact(posts.length, lang), t('profile.posts')],
    [compact(member?.followers ?? 0, lang), t('profile.followers')],
    [compact(member?.following ?? social.followingIds.length, lang), t('profile.following')],
  ];

  return (
    <Screen>
      <Display size={34} style={{ marginTop: 8, marginBottom: 16 }}>
        {t('tab.closet')}
      </Display>

      {/* Profile header */}
      <FadeIn>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <PressScale onPress={() => go('set.profile')} accessibilityLabel={t('closet.editProfile')}>
            <Avatar uri={avatar ?? undefined} size={86} ring />
          </PressScale>
          <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-around' }}>
            {stats.map(([n, label]) => (
              <View key={label} style={{ alignItems: 'center' }}>
                <Txt size={18} weight="bold">
                  {n}
                </Txt>
                <Txt size={12} color={c.ink3}>
                  {label}
                </Txt>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          <Txt size={20} weight="bold">
            @{username}
          </Txt>
          {profile?.certified ? <CertifiedMark /> : null}
          {social.identity === 'verified' ? <IdBadge label={t('verify.badge')} /> : null}
        </View>
        {email ? (
          <Txt size={13} color={c.ink3} style={{ marginTop: 2 }}>
            {email}
          </Txt>
        ) : null}
        {bio ? (
          <Txt size={14} color={c.ink2} style={{ marginTop: 8 }}>
            {bio}
          </Txt>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          <GhostButton label={t('closet.editProfile')} onPress={() => go('set.profile')} style={{ flex: 1, minHeight: 42 }} />
          <GhostButton label={t('boards.title')} onPress={() => set({ screen: 'boards', board: null })} style={{ flex: 1, minHeight: 42 }} />
        </View>
      </FadeIn>

      {/* Verifications (Figma 07) */}
      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt weight="bold" style={{ flex: 1 }}>
            {t('closet.verifications')}
          </Txt>
          <Amount size={14} color={c.ink2}>
            {`${done} / 3`}
          </Amount>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {checks.map((check) => (
            <Pressable
              key={check.label}
              accessibilityRole="button"
              onPress={() => (check.go === 'verify' ? set({ screen: 'verify', afterVerify: 'closet' }) : go(check.go))}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: check.done ? c.accentSoft : c.surf2,
              }}
            >
              {check.done ? (
                <CheckIcon size={13} color={c.accent} />
              ) : (
                <View style={{ width: 9, height: 9, borderRadius: 99, borderWidth: 1.5, borderColor: c.ink3 }} />
              )}
              <Txt size={12} weight="semi" color={check.done ? c.accent : c.ink2}>
                {check.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      <PrimaryButton label={t('closet.addPiece')} onPress={() => go('list')} style={{ marginTop: 12 }} />

      <View style={{ height: 12 }} />
      <Group>
        <Row label={t('rentals.title')} icon={<CalendarIcon color={c.accent} />} onPress={() => go('rentals')} />
        <Row label={t('settings.title')} icon={<GearIcon color={c.accent} />} onPress={() => go('settings')} last />
      </Group>

      {/* Posts and pieces */}
      <View style={{ marginTop: 22, marginHorizontal: -18 }}>
        <Segmented
          items={[
            { key: 'posts', label: `${t('profile.fits')} · ${posts.length}` },
            { key: 'pieces', label: `${t('profile.pieces')} · ${listings.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'pieces' && loading ? <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} /> : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 14 }}>
        {tab === 'posts'
          ? posts.map((p, i) => (
              <FadeIn key={p.id} delay={Math.min(i, 9) * 35}>
                <PressScale onPress={() => set({ screen: 'post', activePostId: p.id })} scaleTo={0.96}>
                  <View style={{ width: cell, height: cell * 1.35, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surf2 }}>
                    <Image source={{ uri: p.media[0] }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    {p.distribution === 'pending' ? <Badge label={t('post.pending')} color={c.plum} ink={c.onplum} /> : null}
                    {p.tags.length ? (
                      <View style={{ position: 'absolute', top: 5, right: 5 }}>
                        <TagIcon size={13} color={OVER_INK} />
                      </View>
                    ) : null}
                  </View>
                </PressScale>
              </FadeIn>
            ))
          : listings.map((l, i) => {
              const restricted = l.distribution === 'limited' || l.distribution === 'blocked';
              return (
                <FadeIn key={l.id} delay={Math.min(i, 9) * 35}>
                  <PressScale
                    onPress={() => (restricted ? setAppealFor(l) : set({ screen: 'detail', activeId: l.id }))}
                    scaleTo={0.96}
                    style={{ width: cell }}
                  >
                    <View style={{ width: cell, height: cell * 1.35, borderRadius: 10, overflow: 'hidden', backgroundColor: c.surf2 }}>
                      <Image source={{ uri: l.photos[0] ?? l.video ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      {l.distribution !== 'public' ? (
                        <Badge
                          label={t(`moderation.state.${l.distribution}` as TranslationKey)}
                          color={restricted ? c.plum : c.surf2}
                          ink={restricted ? c.onplum : c.ink}
                        />
                      ) : null}
                    </View>
                    <Amount size={12} color={c.accent} style={{ marginTop: 3 }}>
                      {`${m(l.price)} ${t('common.perDay')}`}
                    </Amount>
                  </PressScale>
                </FadeIn>
              );
            })}
      </View>

      {!loading && (tab === 'posts' ? posts.length : listings.length) === 0 ? (
        <View style={{ alignItems: 'center', marginTop: 20, gap: 12 }}>
          <Txt center color={c.ink3}>
            {tab === 'posts' ? t('profile.empty') : t('closet.noPieces')}
          </Txt>
          <GhostButton
            label={tab === 'posts' ? t('create.post') : t('create.list')}
            tone="accent"
            onPress={() => (tab === 'posts' ? go('compose') : go('list'))}
          />
        </View>
      ) : null}

      <AppealSheet listing={appealFor} onClose={() => setAppealFor(null)} />
    </Screen>
  );
}

function Badge({ label, color, ink }: { label: string; color: string; ink: string }) {
  return (
    <View style={{ position: 'absolute', bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: color }}>
      <Txt size={9} weight="bold" color={ink}>
        {label}
      </Txt>
    </View>
  );
}
