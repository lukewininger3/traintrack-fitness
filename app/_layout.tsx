import { router, Stack, useRootNavigationState, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { TimerProvider } from '../src/contexts/TimerContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import ErrorBoundary from '../src/components/ErrorBoundary';

function RootLayoutNav() {
  const { user, loading, profileLoading, needsUsername, needsOnboarding } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    // Don't do anything until navigation is ready and auth/profile is loaded
    if (!navigationState?.key || loading || profileLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const onUsernameSetup = segments[1] === 'username-setup';
    const onOnboarding = segments[0] === 'onboarding';

    if (!user && !inAuthGroup) {
      // User not logged in and trying to access app - redirect to login
      router.replace('/auth/login' as any);
    } else if (user && needsUsername && !onUsernameSetup) {
      // User logged in but needs to set up username - redirect to username setup
      router.replace('/auth/username-setup' as any);
    } else if (user && !needsUsername && needsOnboarding && !onOnboarding) {
      // User has username but hasn't completed onboarding
      router.replace('/onboarding' as any);
    } else if (user && !needsUsername && !needsOnboarding && (inAuthGroup || onOnboarding)) {
      // User IS fully set up but still on auth/onboarding screen - redirect to app
      router.replace('/(tabs)' as any);
    }
  }, [user, loading, profileLoading, needsUsername, needsOnboarding, segments, navigationState?.key]);

  // Show loading screen while checking auth/profile or navigation not ready
  if (loading || profileLoading || !navigationState?.key) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="onboarding"
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="workout-builder"
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="workout-details"
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="custom-exercises"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="personal-records"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="templates"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="friend-profile"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="planned-workouts"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="generate-workout"
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary fallbackMessage="The app encountered an error. Please restart the app.">
        <ThemeProvider>
          <AuthProvider>
            <TimerProvider>
              <RootLayoutNav />
            </TimerProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
