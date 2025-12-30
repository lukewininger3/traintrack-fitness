import { router, Slot, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Don't do anything until navigation is ready and auth is loaded
    if (!navigationState?.key || loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // User not logged in and trying to access app - redirect to login
      router.replace('/auth/login' as any);
    } else if (user && inAuthGroup) {
      // User IS logged in but still on auth screen - redirect to app
      router.replace('/(tabs)' as any);
    }
  }, [user, loading, segments, navigationState?.key]);

  // Show loading screen while checking auth or navigation not ready
  if (loading || !navigationState?.key) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
});
