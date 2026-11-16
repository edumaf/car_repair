import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { rawSeed } from '@/core/data/seed';
import { validateSeed } from '@/core/data/seedSchema';
import { initDatabase, restoreSettings } from '@/db/db';
import { AppText } from '@/design/components/AppText';
import { space, useTheme } from '@/design/tokens';
import { fontAssets, fonts } from '@/design/typography';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 300 });

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });

// CLAUDE.md §3: seed data is validated with zod at startup in dev builds.
const seedProblems = __DEV__ ? validateSeed(rawSeed) : [];

export default function RootLayout() {
  const t = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(restoreSettings)
      .then(() => setDbReady(true))
      .catch((e: unknown) => setDbError(e instanceof Error ? e.message : String(e)));
  }, []);

  const ready = (fontsLoaded || fontError !== null) && (dbReady || dbError !== null);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The window behind every screen follows light/dark, so no white edge flashes during transitions.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  if (!ready) return null;

  const problems = [...(dbError ? [`Database: ${dbError}`] : []), ...seedProblems];
  if (problems.length > 0) {
    return (
      <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={styles.error}>
        <AppText variant="title">Something went wrong</AppText>
        <AppText tone="muted">
          {dbError ? 'We couldn’t open the app’s storage. Please restart the app.' : 'The bundled data files have errors (dev check):'}
        </AppText>
        {problems.map((p) => (
          <AppText key={p} variant="caption" tone="stop">
            {p}
          </AppText>
        ))}
      </ScrollView>
    );
  }

  const navTheme = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const pushedHeader = {
    headerShown: true,
    headerBackTitle: 'Back',
    headerTintColor: t.brand,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: t.bg },
    headerTitleStyle: { fontFamily: fonts.sansBold, color: t.ink },
  } as const;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        value={{
          ...navTheme,
          colors: { ...navTheme.colors, background: t.bg, card: t.surface, primary: t.brand, text: t.ink, border: t.border },
        }}>
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
          <Stack.Screen name="dev/design" options={{ ...pushedHeader, title: 'Design preview' }} />
          <Stack.Screen name="add/scan" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="add/vin" options={{ ...pushedHeader, title: 'Add a car' }} />
          <Stack.Screen name="add/ymm" options={{ ...pushedHeader, title: 'Add a car' }} />
          <Stack.Screen name="add/confirm" options={{ ...pushedHeader, title: 'Add a car' }} />
          <Stack.Screen name="add/model" options={{ ...pushedHeader, title: 'Add a car' }} />
          <Stack.Screen name="diagnose/code/[code]" options={{ ...pushedHeader, title: 'Error code' }} />
          <Stack.Screen name="diagnose/symptom/[id]" options={{ ...pushedHeader, title: 'Diagnose' }} />
          <Stack.Screen name="car/[id]/index" options={{ ...pushedHeader, title: '' }} />
          <Stack.Screen name="car/[id]/inspect" options={{ ...pushedHeader, title: 'Inspection' }} />
          <Stack.Screen name="car/[id]/verdict" options={{ ...pushedHeader, title: 'Verdict' }} />
          <Stack.Screen name="car/[id]/price" options={{ ...pushedHeader, title: 'Price check' }} />
          <Stack.Screen name="compare" options={{ ...pushedHeader, title: 'Compare' }} />
          <Stack.Screen name="car/[id]/share" options={{ ...pushedHeader, title: 'Share' }} />
          <Stack.Screen name="learn/[id]" options={{ ...pushedHeader, title: 'Learn' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  error: { flexGrow: 1, justifyContent: 'center', padding: space.xl, gap: space.md },
});
