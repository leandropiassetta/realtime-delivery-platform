import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../api/resources';
import {
  observeSession,
  refreshAccessToken,
  setSession as setSharedSession,
} from '../api/session-store';
import type { SessionData, User } from '../types';

type AuthContextValue = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (body: { email: string; password: string }) => Promise<User>;
  register: (body: { name: string; email: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stopObserving = observeSession((nextSession) => setSession(nextSession));
    void refreshAccessToken()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    return stopObserving;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      loading,
      login: async (body) => {
        const nextSession = await authApi.login(body);
        setSharedSession(nextSession);
        return nextSession.user;
      },
      register: async (body) => {
        const nextSession = await authApi.register(body);
        setSharedSession(nextSession);
        return nextSession.user;
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setSharedSession(null);
        }
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
