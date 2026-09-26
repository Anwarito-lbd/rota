import { View } from 'react-native';
import { LANGUAGES, useT, type TranslationKey } from '../i18n';
import { useAuth } from '../lib/auth';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Group, Header, Row, Screen, SectionLabel, Txt } from '../ui/kit';

/**
 * Settings, organised like Vinted's: account pages first, then
 * notifications, language, appearance, privacy, and signing out last.
 * Guides, fees and help live on the profile (Dressing), not here.
 */
export function Settings() {
  const { state, go } = useStore();
  const { c } = useTheme();
  const { t, lang } = useT();
  const { isStaff, signOut } = useAuth();

  const language = LANGUAGES.find((l) => l.key === lang)?.native ?? lang;

  return (
    <Screen>
      <Header title={t('settings.title')} onBack={() => go('closet')} />

      <Group>
        <Row label={t('set.profile')} onPress={() => go('set.profile')} />
        <Row label={t('set.account')} onPress={() => go('set.account')} />
        <Row label={t('set.payments')} onPress={() => go('set.payments')} />
        <Row label={t('set.shipping')} onPress={() => go('set.shipping')} />
        <Row label={t('set.security')} onPress={() => go('set.security')} last />
      </Group>

      <SectionLabel>{t('set.notifications')}</SectionLabel>
      <Group>
        <Row label={t('set.push')} onPress={() => go('set.push')} />
        <Row label={t('set.email')} onPress={() => go('set.email')} last />
      </Group>

      <SectionLabel>{t('set.appLanguage')}</SectionLabel>
      <Group>
        <Row label={t('settings.language')} detail={language} onPress={() => go('set.language')} last />
      </Group>

      <Group>
        <Row
          label={t('set.theme')}
          detail={t(`set.themeMode.${state.themeMode}` as TranslationKey)}
          onPress={() => go('set.theme')}
          last
        />
      </Group>

      <SectionLabel>{t('set.privacyTitle')}</SectionLabel>
      <Group>
        <Row label={t('set.privacy')} onPress={() => go('set.privacy')} last />
      </Group>

      {isStaff ? (
        <>
          <SectionLabel>{t('admin.section')}</SectionLabel>
          <Group>
            <Row label={t('admin.title')} onPress={() => go('admin')} last />
          </Group>
        </>
      ) : null}

      <Group>
        <Row label={t('settings.signOut')} onPress={signOut} last />
      </Group>

      <Txt size={12} color={c.ink3} center style={{ marginTop: 18 }}>
        {t('settings.version')}
      </Txt>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
