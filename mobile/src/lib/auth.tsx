import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usernameError } from '../state/auth';
import { backendConfigured, supabase } from './supabase';

export interface Profile {
  id: string;
  username: string;
  certified: boolean;
  identityStatus: 'none' | 'pending' | 'verified' | 'rejected';
  avatarUrl: string | null;
  city: string | null;
  bio: string | null;
  showCity: boolean;
}

interface AuthValue {
  /** Null until the stored session has been read back. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Rota staff see the back office (staff_members, migration 004). */
  isStaff: boolean;
  /** Re-reads the profile, e.g. after an identity check finished. */
  refreshProfile: () => void;
  /**
   * Signed in with a password but two-step verification is on and the code
   * hasn't been entered yet (Supabase aal1 → aal2). The app shows the code
   * screen and nothing else until it is.
   */
  needsMfa: boolean;
  refreshMfa: () => Promise<void>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<string | null>;
  confirmEmail: (input: { email: string; code: string }) => Promise<string | null>;
  resendCode: (email: string) => Promise<string | null>;
  signIn: (input: { email: string; password: string }) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const NOT_CONFIGURED =
  'Le serveur n’est pas configuré sur cet appareil. Ajoutez vos clés dans mobile/.env.';

/** Supabase speaks English and leaks internals; members should not see that. */
function toFrench(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'Un compte existe déjà avec cet e-mail.';
  }
  if (m.includes('invalid login credentials')) return 'E-mail ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirmez votre e-mail avec le code reçu.';
  if (m.includes('token has expired') || m.includes('expired')) {
    return 'Ce code a expiré. Demandez-en un nouveau.';
  }
  if (m.includes('invalid') && m.includes('token')) return 'Code incorrect. Vérifiez vos e-mails.';
  if (m.includes('database error')) return 'Ce nom d’utilisateur est déjà pris.';
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Trop de tentatives. Réessayez dans quelques minutes.';
  }
  if (m.includes('password')) return 'Mot de passe refusé : 8 caractères, majuscule, chiffre et symbole.';
  if (m.includes('network') || m.includes('fetch')) return 'Pas de connexion au serveur. Vérifiez votre réseau.';
  return 'Une erreur est survenue. Réessayez.';
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);

  const refreshMfa = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    setNeedsMfa(!!data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2');
  }, []);
  useEffect(() => {
    if (session) refreshMfa();
    else setNeedsMfa(false);
  }, [session, refreshMfa]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  // The profile row is created by a database trigger at signup.
  const [profileTick, setProfileTick] = useState(0);
  const refreshProfile = useCallback(() => setProfileTick((n) => n + 1), []);
  const [isStaff, setIsStaff] = useState(false);
  useEffect(() => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setProfile(null);
      setIsStaff(false);
      return;
    }
    let cancelled = false;
    // Before migration 004 the function doesn't exist: not staff.
    supabase.rpc('is_staff').then(({ data }) => !cancelled && setIsStaff(data === true));
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setProfile({
          id: data.id,
          username: data.username,
          certified: data.certified,
          identityStatus: data.identity_status,
          avatarUrl: data.avatar_url,
          city: data.city,
          bio: data.bio ?? null,
          showCity: data.show_city ?? true,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, profileTick]);

  const signUp = useCallback<AuthValue['signUp']>(async ({ username, email, password }) => {
    if (!supabase) return NOT_CONFIGURED;
    const handle = username.trim().toLowerCase();
    const localError = usernameError(handle);
    if (localError) return localError;

    const { data: free, error: rpcError } = await supabase.rpc('username_available', { name: handle });
    if (rpcError) return toFrench(rpcError.message);
    if (!free) return 'Ce nom d’utilisateur est déjà pris.';

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: handle } },
    });
    return error ? toFrench(error.message) : null;
  }, []);

  const confirmEmail = useCallback<AuthValue['confirmEmail']>(async ({ email, code }) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'email' });
    return error ? toFrench(error.message) : null;
  }, []);

  const resendCode = useCallback<AuthValue['resendCode']>(async (email) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    return error ? toFrench(error.message) : null;
  }, []);

  const signIn = useCallback<AuthValue['signIn']>(async ({ email, password }) => {
    if (!supabase) return NOT_CONFIGURED;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error ? toFrench(error.message) : null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      profile,
      isStaff,
      refreshProfile,
      needsMfa,
      refreshMfa,
      signUp,
      confirmEmail,
      resendCode,
      signIn,
      signOut,
    }),
    [loading, session, profile, isStaff, refreshProfile, needsMfa, refreshMfa, signUp, confirmEmail, resendCode, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export { backendConfigured };
