import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/hooks/useAuth'

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inConfirmEmailRoute = segments[0] === 'confirm-email';
    const inEditPromotionRoute = segments[0] === 'edit-promotion';

    if (!user) {
      // If no user, only allow access to auth group and confirm-email
      if (!inAuthGroup && !inConfirmEmailRoute) {
        router.replace('/(auth)/signup');
      }
    } else {
      // User is authenticated
      if (inAuthGroup || inConfirmEmailRoute) {
        // Redirect away from auth group if user is already authenticated
        if (role === 'admin') {
          router.replace('/(admin)');
        } else if (role === 'seller') {
          router.replace('/(seller)');
        } else {
          router.replace('/(tabs)');
        }
      } else if (!inEditPromotionRoute) {
        // Check if the user is trying to access a protected route
        const inProtectedGroup = segments[0] === '(seller)';
        const inAdminGroup = segments[0] === '(admin)';
        if (inProtectedGroup && role !== 'seller') {
          router.replace('/(tabs)');
        } else if (inAdminGroup && role !== 'admin') {
          router.replace('/(tabs)');
        } else if (!inProtectedGroup && !inAdminGroup && role === 'seller') {
          router.replace('/(seller)');
        } else if (!inProtectedGroup && !inAdminGroup && role === 'admin') {
          router.replace('/(admin)');
        }
      }
    }
  }, [user, segments, role, loading]);

  return (
    <Stack>
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/signup" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(seller)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="confirm-email" options={{ headerShown: false }} />
      <Stack.Screen
        name="promotion/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Promotion Details',
          headerBackTitle: 'Back',
          gestureEnabled: true,
          presentation: 'modal',
        }}
      />
            <Stack.Screen
        name="promotion-details/[id]"
        options={{
          headerShown: true,
          headerTitle: 'Scanned Promotions',
          headerBackTitle: 'Back',
          gestureEnabled: true,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="edit-promotion"
        options={{
          headerShown: true,
          headerTitle: 'Edit Promotion',
          headerBackTitle: 'Back',
          gestureEnabled: true,
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="+not-found" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootLayoutNav />
    </ThemeProvider>
  );
}