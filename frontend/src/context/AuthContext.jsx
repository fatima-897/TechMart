import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session } from '../api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(() => (session.token ? session.user : null));
  const [modal, setModal] = useState({ open: false, hint: '' });

  // On page load: re-validate the saved token and refresh the user (so a newly granted admin role shows up).
  useEffect(() => {
    if (!session.token) return undefined;
    let cancelled = false;
    api('/auth/me', { auth: true })
      .then(({ user: fresh }) => { if (!cancelled) { session.saveUser(fresh); setUser(fresh); } })
      .catch(() => {}); // an expired token is handled by the 'session-expired' event below
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onExpired = () => { setUser(null); toast('Your session expired. Please log in again.', 'error'); };
    window.addEventListener('session-expired', onExpired);
    return () => window.removeEventListener('session-expired', onExpired);
  }, [toast]);

  const finish = useCallback(({ token, user: u }) => {
    session.save(token, u);
    setUser(u);
    setModal({ open: false, hint: '' });
    toast(`Welcome, ${u.name}!`, 'ok');
  }, [toast]);

  const login = useCallback(async (email, password) => {
    finish(await api('/auth/login', { method: 'POST', body: { email, password } }));
  }, [finish]);

  const register = useCallback(async (name, email, password) => {
    finish(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  }, [finish]);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
    toast('Logged out.');
  }, [toast]);

  const openAuth = useCallback((hint = '') => setModal({ open: true, hint }), []);
  const closeAuth = useCallback(() => setModal({ open: false, hint: '' }), []);

  const value = useMemo(() => ({
    user, isAdmin: user?.role === 'admin', modal, openAuth, closeAuth, login, register, logout,
  }), [user, modal, openAuth, closeAuth, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
