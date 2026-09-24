import { Pressable, View } from 'react-native';
import { LANGUAGES, useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/config';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Card, GhostButton, Group, Header, Radio, Row, Screen, Txt } from '../ui/kit';

export function Settings() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t, lang, setLang } = useT();
  const { session, profile, signOut } = useAuth();

  const identityLabel =
    profile?.identityStatus === 'verified'
      ? t('settings.verified')
      : profile?.identityStatus === 'pending'
        ? t('settings.pending')
        : t('settings.todo');

  return (
    <Screen>
      <Header title={t('settings.title')} onBack={() => go('closet')} />

      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
        {t('settings.language')}
      </Txt>
      <Card style={{ marginTop: 10, padding: 0, overflow: 'hidden' }}>
        {LANGUAGES.map((option, i) => (
          <Pressable
            key={option.key}
            accessibilityRole="radio"
            accessibilityState={{ selected: lang === option.key }}
            onPress={() => setLang(option.key)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              minHeight: 52,
              paddingHorizontal: 15,
              borderBottomWidth: i === LANGUAGES.length - 1 ? 0 : 1,
              borderBottomColor: c.line,
            }}
          >
            <Radio on={lang === option.key} />
            <Txt style={{ flex: 1 }}>{option.native}</Txt>
          </Pressable>
        ))}
      </Card>

      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
        {t('settings.account')}
      </Txt>
      <Group>
        <Row label={t('settings.username')} detail={profile ? `@${profile.username}` : '…'} />
        <Row
          label={t('settings.email')}
          detail={session?.user.email_confirmed_at ? t('settings.verified') : t('settings.toVerify')}
          detailColor={session?.user.email_confirmed_at ? c.accent : c.plum}
        />
        <Row label={t('closet.identity')} detail={identityLabel} last />
      </Group>

      <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
        {t('settings.security')}
      </Txt>
      <Group>
        <Row label={t('settings.guidelines')} onPress={() => go('guidelines')} />
        <Row label={t('settings.fees')} onPress={() => go('fees')} />
        <Row label={t('settings.support')} detail={BRAND.supportEmail} last />
      </Group>

      <GhostButton label={t('closet.signOut')} onPress={signOut} style={{ marginTop: 24 }} />

      <Txt size={12} color={c.ink3} style={{ marginTop: 18 }}>
        {t('settings.version')}
      </Txt>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
