import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@rota/shared';
import { api } from './api';
import { initLocalDb } from './localDb';
import { sessionStore } from './storage';

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { email: string; password: string; name: string; handle: string }) => Promise<void>;
  magicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    await initLocalDb();
    const token = await sessionStore.getToken();
    if (!token) {
      setUser(null);
      return;
    }
    const me = await api.me();
    setUser(me);
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const { user } = await api.login(email, password);
        setUser(user);
      },
      async signUp(input) {
        const { user } = await api.signup(input);
        setUser(user);
      },
      async magicLink(email) {
        const { user } = await api.magicLink(email);
        setUser(user);
      },
      async signOut() {
        await api.logout();
        setUser(null);
      },
      refresh,
    }),
    [user, loading, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
