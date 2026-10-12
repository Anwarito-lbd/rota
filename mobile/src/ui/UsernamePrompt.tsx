/**
 * After Sign in with Apple / Google the database gives the member a
 * placeholder username (migration 011). They choose their own once, here,
 * before anything else, and declare they are 18 or older (029). A member
 * whose username is already confirmed but who never declared their age
 * (an account from before 029) only sees the 18+ step.
 */
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { saveProfile, usernameFree } from '../data/account';
import { useT } from '../i18n';
import { useAuth } from '../lib/auth';
import { friendlyError } from '../lib/errors';
import { supabase } from '../lib/supabase';
import { usernameError } from '../state/auth';
import { useTheme } from '../theme/useTheme';
import { Check, Display, Field, PrimaryButton, Txt } from './kit';
import { Logo } from './motion';

export function UsernamePrompt() {
  const { c, dark } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.username ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adult, setAdult] = useState(profile?.adultConfirmed ?? false);
  // Username already chosen: only the 18+ declaration is missing.
  const adultOnly = !!profile?.usernameConfirmed;

  const save = async () => {
    if (!profile || !supabase) return;
    if (!adult) {
      setError(t('ob.adultNeeded'));
      return;
    }
    const handle = name.trim().toLowerCase();
    const local = adultOnly ? null : usernameError(handle);
    if (local) {
      setError(local);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (!adultOnly && handle !== profile.username) {
        if (!(await usernameFree(handle))) throw new Error('username_taken');
        await saveProfile(profile.id, { username: handle });
      }
      if (!profile.adultConfirmed) {
        const { error: adultError } = await supabase.rpc('confirm_adult');
        if (adultError) throw new Error(adultError.message);
      }
      if (!adultOnly) {
        const { error: nameError } = await supabase.rpc('confirm_username');
        if (nameError) throw new Error(nameError.message);
      }
      refreshProfile();
    } catch (e) {
      setError(e instanceof Error && e.message === 'username_taken' ? t('uname.taken') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  // Until the box is ticked, say why Continuer is off (also read out in order, before the button).
  const message = error ?? (adult ? null : t('ob.adultNeeded'));

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingHorizontal: 22 }}>
      <Logo width={96} tone={dark ? 'white' : 'ink'} />
      <Display size={34} style={{ marginTop: 28 }}>
        {adultOnly ? t('ob.adultTitle') : t('uname.title')}
      </Display>
      <Txt size={15} color={c.ink2} style={{ marginTop: 8 }}>
        {adultOnly ? t('ob.adultBody') : t('uname.body')}
      </Txt>
      {adultOnly ? null : (
        <View style={{ marginTop: 22 }}>
          <Field label={t('uname.label')} value={name} onChangeText={setName} autoCapitalize="none" />
        </View>
      )}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('ob.adult')}
        accessibilityState={{ checked: adult }}
        onPress={() => {
          setAdult(!adult);
          setError(null);
        }}
        style={{ marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}
      >
        <Check on={adult} />
        <Txt size={15} style={{ flex: 1 }}>
          {t('ob.adult')}
        </Txt>
      </Pressable>
      {message ? (
        <View accessibilityLiveRegion="polite" style={{ marginTop: 8 }}>
          <Txt size={13} color={error ? c.plum : c.ink3}>
            {message}
          </Txt>
        </View>
      ) : null}
      <PrimaryButton
        label={busy ? t('common.loading') : t('uname.cta')}
        onPress={save}
        disabled={busy || !adult || (!adultOnly && !name.trim())}
        style={{ marginTop: 18 }}
      />
    </View>
  );
}
