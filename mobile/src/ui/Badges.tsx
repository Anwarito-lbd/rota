/**
 * Marks next to a member's name: a gold crown for Rota Pro, and "Boutique
 * vérifiée" for shops whose SIRET the company register confirmed (028).
 * For me, the demo and the store rights on this phone decide.
 */
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useCommunity } from '../data/community';
import type { Badges } from '../data/badges';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { CheckIcon } from './icons';
import { Txt } from './kit';

const GOLD = '#F2C14E';

export function ProCrown({ size = 15 }: { size?: number }) {
  const { t } = useT();
  return (
    <View accessible accessibilityLabel={t('badge.pro')}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M3.5 8 8 11.5 12 5l4 6.5L20.5 8 18.8 18H5.2L3.5 8Z" fill={GOLD} stroke={GOLD} strokeWidth={1.2} strokeLinejoin="round" />
        <Path d="M5.5 20.5h13" stroke={GOLD} strokeWidth={1.8} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** "Boutique vérifiée": a filled check in a pill; compact shows the check alone. */
export function ShopBadge({ compact, over }: { compact?: boolean; over?: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const ink = over ? '#FFFFFF' : c.onAccent;
  const dot = (
    <View style={{ width: 16, height: 16, borderRadius: 99, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
      <CheckIcon size={11} color="#FFFFFF" />
    </View>
  );
  if (compact) {
    return (
      <View accessible accessibilityLabel={t('badge.shop')}>
        {dot}
      </View>
    );
  }
  return (
    <View
      accessible
      accessibilityLabel={t('badge.shop')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 3, paddingRight: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: over ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.16)' }}
    >
      {dot}
      <Txt size={11} weight="bold" color={over ? ink : '#3B82F6'}>
        {t('badge.shop')}
      </Txt>
    </View>
  );
}

/** A member's badges, with my own taken from this phone (Pro, my shop). */
export function useMemberBadges(memberId: string | null | undefined, badges: Badges | null | undefined): Badges {
  const social = useSocial();
  const community = useCommunity();
  const { state } = useStore();
  const { profile } = useAuth();
  if (memberId && memberId === social.meId) {
    const shopVerified = social.demo ? !!state.business?.verified : profile?.accountType === 'business' && !!profile.businessVerified;
    return {
      pro: community.pro,
      business: shopVerified,
      businessName: social.demo ? (state.business?.name ?? null) : (profile?.businessName ?? null),
    };
  }
  return badges ?? {};
}

/** Crown and shop check, compact, to sit right after a @username. */
export function NameBadges({ memberId, badges, over }: { memberId?: string | null; badges?: Badges | null; over?: boolean }) {
  const b = useMemberBadges(memberId, badges);
  if (!b.pro && !b.business) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      {b.business ? <ShopBadge compact over={over} /> : null}
      {b.pro ? <ProCrown /> : null}
    </View>
  );
}
