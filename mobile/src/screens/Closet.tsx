import { ActivityIndicator, View } from 'react-native';
import { useMyListings } from '../data/listings';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Amount, Card, CertifiedMark, Display, GhostButton, Group, PrimaryButton, Row, Screen, Txt } from '../ui/kit';
import { MediaSlot } from '../ui/MediaSlot';

export function Closet() {
  const { go, m } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const { session, profile, signOut } = useAuth();
  const { listings, loading } = useMyListings(session?.user.id);

  const checks = [
    { label: t('closet.emailVerified'), done: !!session?.user.email_confirmed_at },
    { label: t('closet.identity'), done: profile?.identityStatus === 'verified' },
    { label: t('closet.certified'), done: !!profile?.certified },
  ];
  const done = checks.filter((x) => x.done).length;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 74, height: 74, borderRadius: 999, padding: 2, backgroundColor: c.clay }}>
          <View style={{ flex: 1, borderRadius: 999, overflow: 'hidden', borderWidth: 2, borderColor: c.bg }}>
            <MediaSlot id="me-avatar" shape="circle" editable remoteUri={profile?.avatarUrl ?? undefined} placeholder="Photo" />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={20} weight="bold">
              @{profile?.username ?? '…'}
            </Txt>
            {profile?.certified ? <CertifiedMark /> : null}
          </View>
          <Txt size={13} color={c.ink3} style={{ marginTop: 4 }}>
            {session?.user.email ?? ''}
          </Txt>
        </View>
      </View>

      <Card style={{ marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Txt weight="bold" style={{ flex: 1 }}>
            {t('closet.verifications')}
          </Txt>
          <Amount size={14} color={c.ink2}>
            {`${done} / 3`}
          </Amount>
        </View>
        <View style={{ marginTop: 10, flexDirection: 'row', gap: 4 }}>
          {checks.map((check) => (
            <View
              key={check.label}
              style={{ flex: 1, height: 4, borderRadius: 99, backgroundColor: check.done ? c.clay : c.surf2 }}
            />
          ))}
        </View>
        <Txt size={13} color={c.ink2} style={{ marginTop: 8 }}>
          {checks.map((x) => x.label).join(' · ')}
        </Txt>
      </Card>

      <PrimaryButton label={t('closet.addPiece')} onPress={() => go('list')} style={{ marginTop: 12 }} />

      <Group>
        <Row label={t('closet.settings')} onPress={() => go('settings')} />
        <Row label={t('settings.guidelines')} onPress={() => go('guidelines')} />
        <Row label={t('settings.fees')} onPress={() => go('fees')} last />
      </Group>

      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
        {t('closet.myPieces')}
      </Txt>

      {loading ? (
        <ActivityIndicator color={c.clay} style={{ marginTop: 20 }} />
      ) : listings.length === 0 ? (
        <Txt size={14} color={c.ink2} style={{ marginTop: 10 }}>
          {t('closet.noPieces')}
        </Txt>
      ) : (
        <View style={{ marginTop: 10, gap: 10 }}>
          {listings.map((item) => (
            <Card key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            </Card>
          ))}
        </View>
      )}

      <GhostButton label={t('closet.signOut')} onPress={signOut} style={{ marginTop: 24 }} />
    </Screen>
  );
}
