import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

// The profile may arrive nested (user.profile) or flat; support both.
function normalizeUser(raw) {
  if (!raw) return null;
  const u = raw.user || raw;
  const p = u.profile || {};
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    educationLevel: p.educationLevel ?? u.educationLevel ?? '',
    experienceLevel: p.experienceLevel ?? u.experienceLevel ?? '',
    weeklyStudyHours: p.weeklyStudyHours ?? u.weeklyStudyHours ?? 5,
    learningFormat: p.learningFormat ?? u.learningFormat ?? 'mixed',
    targetCareerId: p.targetCareerId ?? u.targetCareerId ?? null,
    targetCareer: u.targetCareer ?? p.targetCareer ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(api.getToken()));

  const refreshUser = useCallback(async () => {
    const me = normalizeUser(await api.getMe());
    setUser(me);
    return me;
  }, []);

  // Restore the session on first load.
  useEffect(() => {
    if (!api.getToken()) return;
    refreshUser()
      .catch(() => api.clearToken())
      .finally(() => setLoading(false));
  }, [refreshUser]);

  // api.js fires this when the server rejects the token.
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const data = await api.loginUser({ email: email.trim().toLowerCase(), password });
      api.setToken(data.token);
      return refreshUser();
    },
    [refreshUser]
  );

  const register = useCallback(
    async ({ name, email, password }) => {
      const cleanEmail = email.trim().toLowerCase();
      const data = await api.registerUser({ name: name.trim(), email: cleanEmail, password });
      // Use the token from registration if the backend returns one; otherwise log in.
      if (data?.token) {
        api.setToken(data.token);
        return refreshUser();
      }
      return login(cleanEmail, password);
    },
    [login, refreshUser]
  );

  const logout = useCallback(() => {
    api.clearToken();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (changes) => {
      await api.updateMe(changes);
      return refreshUser();
    },
    [refreshUser]
  );

  const value = { user, loading, login, register, logout, updateProfile, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
