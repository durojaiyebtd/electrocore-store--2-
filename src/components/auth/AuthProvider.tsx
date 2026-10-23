'use client';

/**
 * Remembers who is signed in, for the whole storefront. The header reads it to
 * show "Sign in" or "Account" and to reveal the "Admin Portal" link to admins
 * only. Pages that sign a shopper in or out call setUser so the header updates
 * instantly, without a page reload.
 *
 * Note: hiding a link is a convenience, not security. The real protection is
 * in src/middleware.ts and requireAdmin() on the server.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api-client';
import type { SessionUserDTO } from '@/types';

interface AuthContextValue {
  /** undefined = still checking, null = signed out */
  user: SessionUserDTO | null | undefined;
  setUser: (user: SessionUserDTO | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUserDTO | null | undefined>(undefined);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiFetch<{ user: SessionUserDTO | null }>('/api/auth/me');
      setUser(result.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(() => ({ user, setUser, refreshUser }), [user, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
