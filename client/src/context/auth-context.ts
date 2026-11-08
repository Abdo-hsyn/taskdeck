import { createContext, useContext } from 'react';
import type { User } from '../api/client';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authed'; user: User }
  | { status: 'guest'; user: null };

export type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
