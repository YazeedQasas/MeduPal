import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile', error);
      setAuthError(error.message);
      return null;
    }

    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // End loading as soon as we get initial session (don't wait for fetchProfile)
      if (event === 'INITIAL_SESSION') {
        setLoading(false);
      }

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id); // don't await: load profile in background so we don't block loading
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    // Fallback: if INITIAL_SESSION never fires (e.g. some envs), unstuck after getSession()
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mounted) return;
      if (error) {
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUpStudent = useCallback(
    async ({ email, password, fullName }) => {
      setAuthError(null);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student',
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return { data: null, error };
      }

      const newUser = data?.user;

      if (newUser) {
        // Profile is created by DB trigger (handle_new_user) on auth.users insert.
        // No client-side insert, so we avoid RLS issues right after signUp.
        setUser(newUser);
        await fetchProfile(newUser.id);
      }

      return { data, error: null };
    },
    [fetchProfile]
  );

  const signIn = useCallback(async ({ email, password }) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setAuthError(error.message);
      return { data: null, error };
    }

    const signedInUser = data?.user;
    if (signedInUser) {
      setUser(signedInUser);
      await fetchProfile(signedInUser.id);
    }

    return { data, error: null };
  }, [fetchProfile]);

  const updateRole = useCallback(async (newRole) => {
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', user.id);
    if (error) {
      console.error('Error updating role', error);
      return { error };
    }
    // Refresh local profile
    await fetchProfile(user.id);
    return { error: null };
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      console.error('Error signing out', error);
      return { error };
    }
    setUser(null);
    setProfile(null);
    return { error: null };
  }, []);

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    authError,
    signIn,
    signUpStudent,
    updateRole,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

