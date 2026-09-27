import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSocial } from '../data/social';
import { LANGUAGES, useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND, LEGAL_URLS } from '../lib/config';
import { usePolicy } from '../lib/policy';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { DeleteAccountSheet } from '../ui/DeleteAccountSheet';
import { Group, Header, Row, Screen, SectionLabel, Txt } from '../ui/kit';

const BanIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.8} fill="none" />
    <Path d="M6 6l12 12" stroke={color} strokeWidth={1.8} />
  </Svg>
);

const TrashIcon = ({ color }: { color: string }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path d="M4 7h16M9 7V4.8h6V7M6.5 7l1 12.5h9l1-12.5" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
  </Svg>
);

/**
 * Réglages (Figma 08): account, notifications, language, appearance,
 * privacy and safety, legal information, then sign out and delete.
 */
export function Settings() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t, lang, setLang } = useT();
  const { session, profile, isStaff, signOut } = useAuth();
  const social = useSocial();
  const policy = usePolicy();
  const [deleting, setDeleting] = useState(false);

  const username = profile?.username ?? (social.demo ? 'demo.rota' : '—');
  const emailVerified = !!session?.user.email_confirmed_at || social.demo;
  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);

  const leave = async () => {
    if (social.demo) {
      set({ screen: 'onboard', obStep: 0, signedIn: false });
      return;
    }
    await signOut();
  };

  return (
    <Screen bottomInset={40}>
      <Header title={t('settings.title')} onBack={() => go('closet')} />

      <SectionLabel>{t('set.sectionAccount')}</SectionLabel>
      <Group>
        <Row label={t('set.username')} detail={`@${username}`} onPress={() => go('set.profile')} />
        <Row
          label={t('settings.email')}
          detail={emailVerified ? t('settings.verified') : t('settings.toVerify')}
          detailColor={emailVerified ? undefined : c.plum}
          onPress={() => go('set.account')}
        />
        <Row label={t('set.payments')} onPress={() => go('set.payments')} />
        {policy.flagRotaDelivery ? <Row label={t('set.shipping')} onPress={() => go('set.shipping')} /> : null}
        <Row label={t('set.security')} onPress={() => go('set.security')} last />
      </Group>

      <SectionLabel>{t('set.notifications')}</SectionLabel>
      <Group>
        <Row label={t('set.push')} onPress={() => go('set.push')} />
        <Row label={t('set.email')} onPress={() => go('set.email')} last />
      </Group>

      <SectionLabel>{t('set.sectionLanguage')}</SectionLabel>
      <Group>
        {LANGUAGES.map((l, i) => (
          <Row
            key={l.key}
            label={l.native}
            checked={lang === l.key}
            onPress={() => setLang(l.key)}
            last={i === LANGUAGES.length - 1}
          />
        ))}
      </Group>

      <SectionLabel>{t('set.sectionAppearance')}</SectionLabel>
      <Group>
        <Row
          label={t('set.theme')}
          detail={t(`set.themeMode.${state.themeMode}` as TranslationKey)}
          onPress={() => go('set.theme')}
          last
        />
      </Group>

      <SectionLabel>{t('set.sectionPrivacy')}</SectionLabel>
      <Group>
        <Row label={t('set.privacy')} onPress={() => go('set.privacy')} />
        <Row
          label={t('set.blocked')}
          icon={<BanIcon color={c.accent} />}
          detail={social.blockedIds.length ? String(social.blockedIds.length) : undefined}
          onPress={() => go('blocked')}
          last
        />
      </Group>

      <SectionLabel>{t('set.sectionLegal')}</SectionLabel>
      <Group>
        <Row label={t('set.terms')} external onPress={() => open(LEGAL_URLS.terms)} />
        <Row label={t('set.privacyPolicy')} external onPress={() => open(LEGAL_URLS.privacy)} />
        <Row label={t('settings.guidelines')} onPress={() => go('guidelines')} />
        <Row label={t('set.fees')} onPress={() => go('fees')} />
        <Row
          label={t('set.help')}
          external
          onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`).catch(() => open(LEGAL_URLS.support))}
          last
        />
      </Group>

      {isStaff ? (
        <>
          <SectionLabel>{t('admin.section')}</SectionLabel>
          <Group>
            <Row label={t('admin.title')} onPress={() => go('admin')} last />
          </Group>
        </>
      ) : null}

      <View style={{ height: 24 }} />
      <Group>
        <Row label={t('settings.signOut')} tone="accent" onPress={leave} last />
      </Group>
      <View style={{ height: 12 }} />
      <Group>
        <Row
          label={t('set.deleteAccount')}
          tone="plum"
          icon={<TrashIcon color={c.plum} />}
          onPress={() => setDeleting(true)}
          last
        />
      </Group>

      <Txt size={12} color={c.ink3} center style={{ marginTop: 18 }}>
        {t('settings.version')}
      </Txt>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </Screen>
  );
}
