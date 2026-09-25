import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { paymentsConfigured, verifyIdentity } from '../data/payments';
import { LANGUAGES, useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { BRAND } from '../lib/config';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import type { Lang } from '../state/types';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { Card, GhostButton, Group, Header, Radio, Row, Screen, Txt } from '../ui/kit';

export function Settings() {
  const { go } = useStore();
  const { c } = useTheme();
  const { t, lang, setLang } = useT();
  const { session, profile, isStaff, refreshProfile, signOut } = useAuth();
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);

  // Reminder emails go out in the language chosen here.
  const chooseLang = (next: Lang) => {
    setLang(next);
    if (session && supabase) supabase.from('profiles').update({ lang: next }).eq('id', session.user.id).then(() => {});
  };

  // Stripe Identity: ID document + selfie on Stripe's own pages, result via webhook.
  const startIdentity = async () => {
    if (!paymentsConfigured || identityBusy) return;
    setIdentityBusy(true);
    setIdentityError(null);
    try {
      await verifyIdentity();
      refreshProfile();
    } catch (e) {
      setIdentityError(friendlyError(e, t));
    } finally {
      setIdentityBusy(false);
    }
  };
  const canVerify = paymentsConfigured && profile?.identityStatus !== 'verified' && profile?.identityStatus !== 'pending';

  const identityLabel =
    profile?.identityStatus === 'verified'
      ? t('settings.verified')
      : profile?.identityStatus === 'pending'
        ? t('settings.pending')
        : profile?.identityStatus === 'rejected'
          ? t('settings.retry')
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
            onPress={() => chooseLang(option.key)}
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
        <Row
          label={t('closet.identity')}
          detail={identityBusy ? t('common.loading') : identityLabel}
          onPress={canVerify ? startIdentity : undefined}
          last
        />
      </Group>
      {identityError ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {identityError}
        </Txt>
      ) : canVerify ? (
        <Txt size={12} color={c.ink3} style={{ marginTop: 8 }}>
          {t('settings.identityHelp')}
        </Txt>
      ) : null}

      {isStaff ? (
        <>
          <Txt size={12} weight="semi" upper color={c.ink3} style={{ marginTop: 24 }}>
            {t('admin.section')}
          </Txt>
          <Group>
            <Row label={t('admin.title')} onPress={() => go('admin')} last />
          </Group>
        </>
      ) : null}

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
