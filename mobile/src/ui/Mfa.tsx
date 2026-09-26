import { useState } from 'react';
import { View } from 'react-native';
import { totpFactor, verifyTotp } from '../data/account';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { useTheme } from '../theme/useTheme';
import { Display, Field, GhostButton, PrimaryButton, Screen, Txt } from './kit';

/**
 * Shown instead of the app when the password was right but the account has
 * two-step verification on: nothing else is reachable until the code from
 * the authenticator app is verified by Supabase (aal2).
 */
export function MfaChallenge() {
  const { c } = useTheme();
  const { t } = useT();
  const { refreshMfa, signOut } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (code.replace(/\D/g, '').length !== 6) return setError(t('mfa.sixDigits'));
    setBusy(true);
    setError(null);
    try {
      const factor = await totpFactor();
      if (!factor) throw new Error('no_factor');
      await verifyTotp(factor.id, code.replace(/\D/g, ''));
      await refreshMfa();
    } catch {
      setError(t('mfa.wrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Display size={34} style={{ marginTop: 40 }}>
        {t('mfa.title')}
      </Display>
      <Txt size={15} color={c.ink2} style={{ marginTop: 10 }}>
        {t('mfa.body')}
      </Txt>
      <View style={{ marginTop: 20 }}>
        <Field label={t('mfa.code')} value={code} onChangeText={setCode} keyboardType="number-pad" placeholder="123456" />
      </View>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
      <PrimaryButton label={busy ? t('common.loading') : t('mfa.verify')} onPress={submit} disabled={busy} style={{ marginTop: 18 }} />
      <Txt size={13} color={c.ink3} style={{ marginTop: 16 }}>
        {t('mfa.lost')}
      </Txt>
      <GhostButton label={t('settings.signOut')} onPress={signOut} style={{ marginTop: 16 }} />
    </Screen>
  );
}
