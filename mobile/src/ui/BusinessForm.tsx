/**
 * A shop signs up with its SIRET (migration 028). The server checks it in the
 * public company register right away; if the company exists and is active,
 * the profile shows "Boutique vérifiée". The demo checks the number only.
 */
import { useState } from 'react';
import { View } from 'react-native';
import { useSocial } from '../data/social';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { useStore } from '../state/store';
import { useTheme } from '../theme/useTheme';
import { ShopBadge } from './Badges';
import { Field, Note, PrimaryButton, Txt } from './kit';

/** SIRET check digit (Luhn); La Poste's establishments are the known exception. */
export function siretValid(raw: string) {
  const s = raw.replace(/\s/g, '');
  if (!/^\d{14}$/.test(s)) return false;
  if (s.startsWith('356000000')) return true;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = Number(s[i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const formatSiret = (v: string) =>
  v
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/^(\d{3})(\d{0,3})(\d{0,3})(\d{0,5}).*/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(' '));

export function BusinessForm({ onDone, submitLabel }: { onDone: () => void; submitLabel?: string }) {
  const { state, set } = useStore();
  const { c } = useTheme();
  const { t } = useT();
  const social = useSocial();
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(state.business?.name ?? profile?.businessName ?? '');
  const [siret, setSiret] = useState(formatSiret(state.business?.siret ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<'verified' | 'pending' | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (name.trim().length < 2) return setError(t('shop.nameRequired'));
    if (!siretValid(siret)) return setError(t('shop.siretInvalid'));
    const s = siret.replace(/\s/g, '');
    if (social.demo || !supabase) {
      set({ business: { name: name.trim(), siret: s, verified: true } });
      setResult('verified');
      return;
    }
    setBusy(true);
    try {
      const { error: regError } = await supabase.rpc('register_business', { p_siret: s, p_name: name.trim() });
      if (regError) throw new Error(regError.message);
      const { data, error: fnError } = await supabase.functions.invoke('verify-business', { body: {} });
      if (fnError) throw new Error(fnError.message);
      refreshProfile();
      if (data?.verified) setResult('verified');
      else if (data?.pending) setResult('pending');
      else setError(t('shop.notFound'));
    } catch (e) {
      setError(friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <View style={{ gap: 14 }}>
        {result === 'verified' ? (
          <>
            <View style={{ flexDirection: 'row' }}>
              <ShopBadge />
            </View>
            <Txt size={15} color={c.ink2}>
              {t('shop.verifiedBody')}
            </Txt>
          </>
        ) : (
          <Note>{t('shop.pending')}</Note>
        )}
        <PrimaryButton label={t('common.continue')} onPress={onDone} />
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      <Field label={t('shop.name')} value={name} onChangeText={setName} placeholder={t('shop.namePlaceholder')} autoCapitalize="sentences" />
      <Field
        label={t('shop.siret')}
        value={siret}
        onChangeText={(v) => setSiret(formatSiret(v))}
        placeholder="123 456 789 00012"
        keyboardType="number-pad"
        hint={t('shop.siretHint')}
      />
      <Txt size={13} color={c.ink3}>
        {t('shop.why')}
      </Txt>
      {error ? (
        <Txt size={13} color={c.plum}>
          {error}
        </Txt>
      ) : null}
      <PrimaryButton label={busy ? t('common.loading') : (submitLabel ?? t('shop.verify'))} disabled={busy} onPress={submit} />
    </View>
  );
}
