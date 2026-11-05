import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// A lightweight LOCAL profile (display name only, stored in this browser). The prototype has no
// authentication; this exists so the profile menu and Logout are real, working controls.
const KEY = 'docushield_profile';
const Ctx = createContext(null);
export const useProfile = () => useContext(Ctx);

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
};

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(read);
  const signIn = useCallback((name) => {
    const p = { name: name.trim().slice(0, 40) };
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
    setProfile(p);
  }, []);
  const signOut = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    setProfile(null);
  }, []);
  const value = useMemo(() => ({ profile, signIn, signOut }), [profile, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'U';
