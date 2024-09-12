import React from 'react';
import { View, ActivityIndicator } from 'react-native';
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
    // ... (keep the existing authentication and routing logic)
  }, [user, segments, role, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

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
      
      {/* New screens */}
      <Stack.Screen
        name="edit-profile"
        options={{
          headerShown: true,
          headerTitle: 'Edit Profile',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="payment-methods"
        options={{
          headerShown: true,
          headerTitle: 'Payment Methods',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="notification-settings"
        options={{
          headerShown: true,
          headerTitle: 'Notification Settings',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="help-center"
        options={{
          headerShown: true,
          headerTitle: 'Help Center',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="report-problem"
        options={{
          headerShown: true,
          headerTitle: 'Report a Problem',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="give-feedback"
        options={{
          headerShown: true,
          headerTitle: 'Give Feedback',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="terms-of-service"
        options={{
          headerShown: true,
          headerTitle: 'Terms of Service',
          headerBackTitle: 'Back',
          gestureEnabled: true,
        }}
      />
      <Stack.Screen
        name="privacy-policy"
        options={{
          headerShown: true,
          headerTitle: 'Privacy Policy',
          headerBackTitle: 'Back',
          gestureEnabled: true,
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