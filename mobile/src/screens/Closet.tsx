import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { CalendarIcon, CheckIcon, GearIcon } from '../ui/icons';
import { useMyListings, type Listing } from '../data/listings';
import { DEMO_ME } from '../data/demo';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Amount, Card, CertifiedMark, Display, Group, PrimaryButton, Row, Screen, SectionLabel, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';
import { AppealSheet, DistributionStatus } from '../ui/Moderation';

export function Closet() {
  const { set, go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session, profile } = useAuth();
  const { listings, loading } = useMyListings(session?.user.id);
  const [appealFor, setAppealFor] = useState<Listing | null>(null);

  const social = useSocial();
  const checks = [
    { label: t('closet.emailVerified'), done: !!session?.user.email_confirmed_at || social.demo, go: 'set.account' as const },
    { label: t('closet.identity'), done: social.identity === 'verified', go: 'verify' as const },
    { label: t('closet.certified'), done: !!profile?.certified, go: 'set.account' as const },
  ];
  const username = profile?.username ?? (social.demo ? 'demo.rota' : '…');
  const done = checks.filter((x) => x.done).length;

  return (
    <Screen>
      <Display size={34} style={{ marginTop: 8, marginBottom: 16 }}>
        {t('tab.closet')}
      </Display>
      <Pressable
        accessibilityRole="button"
        onPress={() => go('set.profile')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
      >
        <View style={{ width: 74, height: 74, borderRadius: 999, padding: 2, backgroundColor: c.accent }}>
          <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: c.bg }}>
            <MediaSlot id="profile-avatar" shape="circle" remoteUri={profile?.avatarUrl ?? (social.demo ? DEMO_ME.avatar : undefined)} placeholder={t('set.photo')} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={20} weight="bold">
              @{username}
            </Txt>
            {profile?.certified ? <CertifiedMark /> : null}
          </View>
          <Txt size={13} color={c.ink3} style={{ marginTop: 4 }}>
            {session?.user.email ?? (social.demo ? 'demo@therotaapp.com' : t('closet.editProfile'))}
          </Txt>
        </View>
      </Pressable>

      {profile?.bio ? (
        <Txt size={14} color={c.ink2} style={{ marginTop: 12 }}>
          {profile.bio}
        </Txt>
      ) : null}

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
              {check.done ? <CheckIcon size={13} color={c.accent} /> : <View style={{ width: 9, height: 9, borderRadius: 99, borderWidth: 1.5, borderColor: c.ink3 }} />}
              <Txt size={12} weight="semi" color={check.done ? c.accent : c.ink2}>
                {check.label}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      <PrimaryButton label={t('closet.addPiece')} onPress={() => go('list')} style={{ marginTop: 12 }} />

      {/* Figma 07: two rows only. Fees, rules and help live in Réglages. */}
      <View style={{ height: 12 }} />
      <Group>
        <Row label={t('rentals.title')} icon={<CalendarIcon color={c.accent} />} onPress={() => go('rentals')} />
        <Row label={t('settings.title')} icon={<GearIcon color={c.accent} />} onPress={() => go('settings')} last />
      </Group>

      <SectionLabel>{t('closet.myPieces')}</SectionLabel>

      {loading ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 20 }} />
      ) : listings.length === 0 ? (
        <Txt size={14} color={c.ink2} style={{ marginTop: 10 }}>
          {t('closet.noPieces')}
        </Txt>
      ) : (
        <View style={{ marginTop: 10, gap: 10 }}>
          {listings.map((item) => (
            <Card key={item.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 58, height: 74, borderRadius: 9, overflow: 'hidden' }}>
                  <MediaSlot
                    id={`mine-${item.id}`}
                    shape="rounded"
                    radius={9}
                    remoteUri={item.photos[0] ?? item.video ?? undefined}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt weight="bold" numberOfLines={2}>
                    {item.title}
                  </Txt>
                  <Txt size={13} color={c.ink2} style={{ marginTop: 3 }}>
                    {[item.brand, item.sizes.join(' · ')].filter(Boolean).join(' · ')}
                  </Txt>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Amount size={15}>{m(item.price)}</Amount>
                  <Txt size={12} color={c.ink3}>
                    {t('common.perDay')}
                  </Txt>
                </View>
              </View>
              <DistributionStatus listing={item} onAppeal={() => setAppealFor(item)} />
            </Card>
          ))}
        </View>
      )}

      <AppealSheet listing={appealFor} onClose={() => setAppealFor(null)} />
    </Screen>
  );
}
