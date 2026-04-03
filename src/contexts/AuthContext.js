import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';

export const AuthContext = createContext({
  user: null,
  session: null,
  profile: null,
  loading: true,
  profileLoading: true,
  needsUsername: false,
  needsOnboarding: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  refreshProfile: async () => {},
  setProfile: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // Check if user needs to set up username
  const needsUsername = user && !profileLoading && !profile?.username;

  // Check if user needs onboarding (has username but hasn't completed onboarding)
  const needsOnboarding = user && !profileLoading && profile?.username && !onboardingCompleted;

  // Load onboarding status separately (non-blocking)
  const loadOnboardingStatus = useCallback(async () => {
    try {
      const onboardingData = await AsyncStorage.getItem('@traintrack_onboarding');
      setOnboardingCompleted(onboardingData ? JSON.parse(onboardingData).completed === true : false);
    } catch {
      setOnboardingCompleted(false);
    }
  }, []);

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    try {
      setProfileLoading(true);

      // Start onboarding check in parallel (non-blocking)
      loadOnboardingStatus();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist yet
        setProfile(null);
        setProfileLoading(false);
        return null;
      }

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile(null);
        setProfileLoading(false);
        return null;
      }

      setProfile(data);
      setProfileLoading(false);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setProfileLoading(false);
      return null;
    }
  }, [loadOnboardingStatus]);

  // Public method to refresh profile
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      return await fetchProfile(user.id);
    }
    return null;
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Fetch profile after getting session
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfileLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Fetch profile on auth change
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Migrate local data to cloud after successful login
      if (data?.user) {
        // Import the migration functions
        const { migrateLocalToCloud } = await import('../utils/storage');
        const { migrateGoalsToCloud } = await import('../utils/goalsStorage');

        // Run migrations in background (don't wait)
        migrateLocalToCloud().catch(() => {
          // Workout migration error
        });
        migrateGoalsToCloud().catch(() => {
          // Goals migration error
        });
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'yourapp://reset-password',
      });
      
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    profileLoading,
    needsUsername,
    needsOnboarding,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    setProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};