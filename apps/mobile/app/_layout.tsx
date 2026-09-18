import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../lib/auth';
import { Loading } from '../components/ui';
import { colors } from '../constants/theme';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) router.replace('/(auth)/welcome');
    if (user && inAuth) router.replace('/(tabs)/feed');
  }, [user, loading, segments, router]);

  if (loading) return <Loading />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <AuthProvider>
        <StatusBar style="light" />
        <Guard>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="listing/[id]" options={{ headerShown: true, title: 'Pièce', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
            <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: 'Dates', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
            <Stack.Screen name="checkout/[id]" options={{ headerShown: true, title: 'Paiement', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
            <Stack.Screen name="list-piece" options={{ headerShown: true, title: 'Mettre en location', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
            <Stack.Screen name="promote" options={{ headerShown: true, title: 'Promouvoir', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
            <Stack.Screen name="u/[handle]" options={{ headerShown: true, title: 'Profil', headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink }} />
          </Stack>
        </Guard>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
