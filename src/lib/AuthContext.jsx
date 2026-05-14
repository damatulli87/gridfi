import React, { createContext, useState, useContext } from 'react';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

// Auth is OPTIONAL. By default the app runs in open-access mode (no login required).
// To require login: uncomment the useEffect block below and set PHASE_2 = true.
const REQUIRE_AUTH = false;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!REQUIRE_AUTH);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [appPublicSettings] = useState(null);

  // ── Phase 2: uncomment to require Supabase login ──────────────────────────
  // import { useEffect } from 'react';
  // useEffect(() => {
  //   setIsLoadingAuth(true);
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setUser(session?.user ?? null);
  //     setIsAuthenticated(!!session);
  //     setIsLoadingAuth(false);
  //     setAuthChecked(true);
  //   });
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
  //     setUser(session?.user ?? null);
  //     setIsAuthenticated(!!session);
  //   });
  //   return () => subscription.unsubscribe();
  // }, []);
  // ──────────────────────────────────────────────────────────────────────────

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    if (REQUIRE_AUTH) setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (REQUIRE_AUTH) setIsAuthenticated(!!session);
    setAuthChecked(true);
  };

  const checkAppState = async () => {};

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
