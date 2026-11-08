import { useEffect, useState, type ReactNode } from 'react';
import { auth } from '../api/client';
import { AuthContext, type AuthContextValue, type AuthState } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  // Restore session on boot (HttpOnly cookie → /auth/me)
  useEffect(() => {
    let cancelled = false;
    auth
      .me()
      .then(({ user }) => {
        if (!cancelled) setState({ status: 'authed', user });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'guest', user: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login: AuthContextValue['login'] = async (email, password) => {
    const { user } = await auth.login({ email, password });
    setState({ status: 'authed', user });
    return user;
  };

  const register: AuthContextValue['register'] = async (name, email, password) => {
    const { user } = await auth.register({ name, email, password });
    setState({ status: 'authed', user });
    return user;
  };

  const logout: AuthContextValue['logout'] = async () => {
    await auth.logout();
    setState({ status: 'guest', user: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
