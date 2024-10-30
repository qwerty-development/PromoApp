//root layout
import React, { useState, useCallback, useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import {
	DarkTheme,
	DefaultTheme,
	ThemeProvider
} from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import 'react-native-reanimated'

import { useColorScheme } from '@/hooks/useColorScheme'
import { useAuth } from '@/hooks/useAuth'
import AnimatedSplashScreen from '../components/AnimatedSplashScreen'

SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
	const { user, role, loading } = useAuth()
	const segments = useSegments()
	const router = useRouter()

	useEffect(() => {
		if (loading) return

		const inAuthGroup = segments[0] === '(auth)'
		const inAdminGroup = segments[0] === '(admin)'
		const inSellerGroup = segments[0] === '(seller)'

		if (!user) {
			if (!inAuthGroup) {
				router.replace('/(auth)/login')
			}
		} else {
			if (inAuthGroup) {
				if (role === 'admin') {
					router.replace('/(admin)')
				} else if (role === 'seller') {
					router.replace('/(seller)')
				} else {
					router.replace('/(tabs)')
				}
			} else {
				if (role === 'admin' && !inAdminGroup) {
					router.replace('/(admin)')
				} else if (role === 'seller' && !inSellerGroup) {
					router.replace('/(seller)')
				} else if (
					role !== 'admin' &&
					role !== 'seller' &&
					(inAdminGroup || inSellerGroup)
				) {
					router.replace('/(tabs)')
				}
			}
		}
	}, [user, segments, role, loading, router])

	if (loading) {
		return null // Don't show anything while loading to avoid the flicker
	}
	return (
		<Stack>
			<Stack.Screen name='(auth)/login' options={{ headerShown: false }} />
			<Stack.Screen name='(auth)/signup' options={{ headerShown: false }} />
			<Stack.Screen name='(seller)' options={{ headerShown: false }} />
			<Stack.Screen name='(tabs)' options={{ headerShown: false }} />
			<Stack.Screen name='(admin)' options={{ headerShown: false }} />
			<Stack.Screen name='confirm-email' options={{ headerShown: false }} />

			<Stack.Screen
				name='promotion/[id]'
				options={{
					headerShown: true,
					headerTitle: 'Promotion Details',
					headerBackTitle: 'Back',
					gestureEnabled: true,
					presentation: 'modal'
				}}
			/>
			<Stack.Screen
				name='promotion-details/[id]'
				options={{
					headerShown: true,
					headerTitle: 'Scanned Promotions',
					headerBackTitle: 'Back',
					gestureEnabled: true,
					presentation: 'modal'
				}}
			/>

			<Stack.Screen
				name='edit-promotion/[id]'
				options={{
					presentation: 'modal',
					headerShown: true,
					headerTitle: 'Edit Promotion',
					headerTintColor: 'white', // This will make the back button white
					headerStyle: {
						backgroundColor: 'purple' // This should match your screen background
					}
				}}
			/>

			<Stack.Screen
				name='edit-profile'
				options={{
					headerShown: true,
					headerTitle: 'Edit Profile',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='payment-methods'
				options={{
					headerShown: true,
					headerTitle: 'Payment Methods',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='notification-settings'
				options={{
					headerShown: true,
					headerTitle: 'Notification Settings',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='help-center'
				options={{
					headerShown: true,
					headerTitle: 'Help Center',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='report-problem'
				options={{
					headerShown: true,
					headerTitle: 'Report a Problem',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='give-feedback'
				options={{
					headerShown: true,
					headerTitle: 'Give Feedback',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='terms-of-service'
				options={{
					headerShown: true,
					headerTitle: 'Terms of Service',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>
			<Stack.Screen
				name='privacy-policy'
				options={{
					headerShown: true,
					headerTitle: 'Privacy Policy',
					headerBackTitle: 'Back',
					gestureEnabled: true
				}}
			/>

			<Stack.Screen name='+not-found' options={{ presentation: 'modal' }} />
		</Stack>
	)
}

export default function RootLayout() {
	const colorScheme = useColorScheme()
	const [loaded] = useFonts({
		SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf')
	})
	const [isSplashAnimationComplete, setIsSplashAnimationComplete] =
		useState(false)
	const [isAppReady, setIsAppReady] = useState(false)

	const handleAnimationComplete = useCallback(() => {
		setIsSplashAnimationComplete(true)
	}, [])

	useEffect(() => {
		if (loaded && isSplashAnimationComplete) {
			SplashScreen.hideAsync().then(() => {
				setIsAppReady(true)
			})
		}
	}, [loaded, isSplashAnimationComplete])

	if (!isAppReady) {
		return (
			<AnimatedSplashScreen onAnimationComplete={handleAnimationComplete} />
		)
	}

	return (
		<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
			<RootLayoutNav />
		</ThemeProvider>
	)
}
