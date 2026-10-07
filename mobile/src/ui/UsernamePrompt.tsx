/**
 * After Sign in with Apple / Google the database gives the member a
 * placeholder username (migration 011). They choose their own once, here,
 * before anything else.
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
  // Apple and Google sign-ups declare 18+ here (029); e-mail sign-up does it on its first step.
  const [adult, setAdult] = useState(profile?.adultConfirmed ?? false);

  const save = async () => {
    if (!profile || !supabase) return;
    if (!adult) {
      setError(t('ob.adultNeeded'));
      return;
    }
    const handle = name.trim().toLowerCase();
    const local = usernameError(handle);
    if (local) {
      setError(local);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (handle !== profile.username) {
        if (!(await usernameFree(handle))) throw new Error('username_taken');
        await saveProfile(profile.id, { username: handle });
      }
      if (!profile.adultConfirmed) {
        const { error: adultError } = await supabase.rpc('confirm_adult');
        if (adultError) throw new Error(adultError.message);
      }
      await supabase.rpc('confirm_username');
      refreshProfile();
    } catch (e) {
      setError(e instanceof Error && e.message === 'username_taken' ? t('uname.taken') : friendlyError(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 40, paddingHorizontal: 22 }}>
      <Logo width={96} tone={dark ? 'white' : 'ink'} />
      <Display size={34} style={{ marginTop: 28 }}>
        {t('uname.title')}
      </Display>
      <Txt size={15} color={c.ink2} style={{ marginTop: 8 }}>
        {t('uname.body')}
      </Txt>
      <View style={{ marginTop: 22 }}>
        <Field label={t('uname.label')} value={name} onChangeText={setName} autoCapitalize="none" />
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={t('ob.adult')}
        accessibilityState={{ checked: adult }}
        onPress={() => setAdult(!adult)}
        style={{ marginTop: 16, flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}
      >
        <Check on={adult} />
        <Txt size={15} style={{ flex: 1 }}>
          {t('ob.adult')}
        </Txt>
      </Pressable>
      {error ? (
        <Txt size={13} color={c.plum} style={{ marginTop: 8 }}>
          {error}
        </Txt>
      ) : null}
      <PrimaryButton label={busy ? t('common.loading') : t('uname.cta')} onPress={save} disabled={busy || !name.trim() || !adult} style={{ marginTop: 18 }} />
    </View>
  );
}
