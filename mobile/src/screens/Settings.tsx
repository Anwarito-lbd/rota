import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Linking, View } from 'react-native';
import { useSocial } from '../data/social';
import { LANGUAGES, useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND, LEGAL_URLS } from '../lib/config';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { DeleteAccountSheet } from '../ui/DeleteAccountSheet';
import { FlatPage, FlatRow, FlatSection } from '../ui/Flat';
import { ArrowUpRightIcon } from '../ui/icons';
import { Txt } from '../ui/kit';

/**
 * Réglages, laid out like Vinted's Paramètres: the account pages first,
 * then notifications, language and appearance, privacy, legal, and at the
 * bottom sign out and delete (Apple 5.1.1(v)).
 */
export function Settings() {
  const { state, set, go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { profile, isStaff, signOut } = useAuth();
  const social = useSocial();
  const [deleting, setDeleting] = useState(false);

  const open = (url: string) => WebBrowser.openBrowserAsync(url).catch(() => undefined);
  const external = <ArrowUpRightIcon size={15} color={c.ink3} />;
  const language = LANGUAGES.find((l) => l.key === lang)?.native ?? lang;

  const leave = async () => {
    if (social.demo) {
      set({ screen: 'onboard', obStep: 0, signedIn: false });
      return;
    }
    await signOut();
  };

  return (
    <FlatPage title={t('settings.title')} onBack={() => go('closet')}>
      <FlatSection first>
        <FlatRow label={t('set.profile')} detail={profile?.username ? `@${profile.username}` : undefined} onPress={() => go('set.profile')} />
        <FlatRow label={t('set.account')} onPress={() => go('set.account')} />
        <FlatRow label={t('set.payments')} onPress={() => go('set.payments')} />
        <FlatRow label={t('set.shipping')} onPress={() => go('set.shipping')} />
        <FlatRow label={t('set.security')} onPress={() => go('set.security')} last />
      </FlatSection>

      <FlatSection title={t('set.sectionNotifications')}>
        <FlatRow label={t('set.push')} onPress={() => go('set.push')} />
        <FlatRow label={t('set.email')} onPress={() => go('set.email')} last />
      </FlatSection>

      <FlatSection title={t('set.appLanguage')}>
        <FlatRow label={t('settings.language')} detail={language} onPress={() => go('set.language')} last />
      </FlatSection>

      <FlatSection>
        <FlatRow label={t('set.theme')} detail={t(`set.themeMode.${state.themeMode}` as TranslationKey)} onPress={() => go('set.theme')} last />
      </FlatSection>

      <FlatSection title={t('set.sectionPrivacy')}>
        <FlatRow label={t('set.privacy')} onPress={() => go('set.privacy')} />
        <FlatRow
          label={t('set.blocked')}
          detail={social.blockedIds.length ? String(social.blockedIds.length) : undefined}
          onPress={() => go('blocked')}
          last
        />
      </FlatSection>

      <FlatSection title={t('set.sectionLegal')}>
        <FlatRow label={t('settings.guidelines')} onPress={() => go('guidelines')} />
        <FlatRow label={t('set.fees')} onPress={() => go('fees')} />
        <FlatRow label={t('set.terms')} right={external} onPress={() => open(LEGAL_URLS.terms)} />
        <FlatRow label={t('set.privacyPolicy')} right={external} onPress={() => open(LEGAL_URLS.privacy)} />
        <FlatRow
          label={t('set.help')}
          right={external}
          onPress={() => Linking.openURL(`mailto:${BRAND.supportEmail}`).catch(() => open(LEGAL_URLS.support))}
          last
        />
      </FlatSection>

      {isStaff ? (
        <FlatSection>
          <FlatRow label={t('admin.title')} onPress={() => go('admin')} last />
        </FlatSection>
      ) : null}

      <FlatSection>
        <FlatRow label={t('settings.signOut')} tone="accent" onPress={leave} />
        <FlatRow label={t('set.deleteAccount')} tone="plum" onPress={() => setDeleting(true)} last />
      </FlatSection>

      <View style={{ paddingVertical: 16 }}>
        <Txt size={12} color={c.ink3} center>
          {t('settings.version')}
        </Txt>
      </View>

      <DeleteAccountSheet visible={deleting} onClose={() => setDeleting(false)} />
    </FlatPage>
  );
}
