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
}

interface AuthValue {
  /** Null until the stored session has been read back. */
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
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
  useEffect(() => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, username, certified, identity_status, avatar_url, city')
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
        });
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

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
    () => ({ loading, session, profile, signUp, confirmEmail, resendCode, signIn, signOut }),
    [loading, session, profile, signUp, confirmEmail, resendCode, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export { backendConfigured };
