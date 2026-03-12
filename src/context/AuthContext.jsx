import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile', error);
      setAuthError(error.message);
      setProfileLoading(false);
      return null;
    }

    setProfile(data);
    setProfileLoading(false);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Don't set loading=false on INITIAL_SESSION — let getSession() handle initial load
      // so we reliably read the persisted session from storage before rendering
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id); // don't await: load profile in background so we don't block loading
      } else {
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      }
    });

    // Primary initializer: read persisted session from storage before showing UI
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
        setProfileLoading(false);
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
        setUser(newUser);
        let profileData = await fetchProfile(newUser.id);
        // Ensure profile exists; create if trigger didn't run
        if (!profileData) {
          const { error: insertErr } = await supabase
            .from('profiles')
            .upsert(
              {
                id: newUser.id,
                email: newUser.email,
                full_name: newUser.user_metadata?.full_name || '',
                role: 'student',
              },
              { onConflict: 'id' }
            );
          if (!insertErr) {
            profileData = await fetchProfile(newUser.id);
          }
        }
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
      return { data: null, profile: null, error };
    }

    const signedInUser = data?.user;
    let profileData = null;
    if (signedInUser) {
      setUser(signedInUser);
      profileData = await fetchProfile(signedInUser.id);
    }

    return { data, profile: profileData, error: null };
  }, [fetchProfile]);

  const updateRole = useCallback(async (newRole) => {
    if (!user) return { error: new Error('Not authenticated') };
    const dbRole = newRole;
    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ role: dbRole })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[Onboarding] Error updating role:', error);
      return { error };
    }
    if (!updated) {
      const { error: upsertErr } = await supabase.from('profiles').upsert(
        { id: user.id, email: user.email, full_name: user.user_metadata?.full_name || '', role: dbRole },
        { onConflict: 'id' }
      );
      if (upsertErr) {
        console.error('[Onboarding] Error creating profile:', upsertErr);
        return { error: upsertErr };
      }
    }
    console.log('[Onboarding] Role saved to database:', { role: dbRole, userId: user.id });
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
    setProfileLoading(false);
    return { error: null };
  }, []);

  const refreshProfile = useCallback(() => {
    if (user?.id) {
      return fetchProfile(user.id);
    }
    return Promise.resolve(null);
  }, [user, fetchProfile]);

  const value = {
    user,
    profile,
    role: profile?.role ?? null,
    full_name: profile?.full_name ?? null,
    has_hardware: profile?.has_hardware ?? false,
    can_exam: profile?.can_exam ?? false,
    loading,
    profileLoading,
    authError,
    signIn,
    signUpStudent,
    updateRole,
    signOut,
    refreshProfile,
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

