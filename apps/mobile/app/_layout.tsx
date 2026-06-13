import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { I18nProvider, SupabaseProvider, useAuth } from '@timesheetai/shared';

import { useColorScheme } from '@/components/useColorScheme';
import { supabase } from '@/lib/supabase';

export {
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

// By default expo-updates downloads a new OTA bundle in the background and only
// applies it on the *next* cold start — so a JS fix needs two launches to show
// up. This pulls and applies any pending update during the current launch, so
// one relaunch is enough. Disabled in dev / Expo Go, where Updates is inactive
// and reloadAsync() would throw.
function useApplyUpdatesOnLaunch() {
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!cancelled && check.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Offline or the update server is unreachable — keep running the
        // bundle we already have rather than blocking startup.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}

export default function RootLayout() {
  useApplyUpdatesOnLaunch();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SupabaseProvider client={supabase}>
        <I18nProvider>
          <RootLayoutNav />
        </I18nProvider>
      </SupabaseProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate />
    </ThemeProvider>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="add-workplace" options={{ presentation: 'modal' }} />
      <Stack.Screen name="add-shift" options={{ presentation: 'modal' }} />
      <Stack.Screen name="shift/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="workplace/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
