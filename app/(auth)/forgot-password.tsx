import React, { useState, useRef, useEffect } from 'react'
import {
	View,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	Text,
	Dimensions,
	KeyboardAvoidingView,
	Platform,
	useColorScheme,
	Animated,
	Image,
	Alert,
	ActivityIndicator
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'

const { width, height } = Dimensions.get('window')

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('')
	const [token, setToken] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [step, setStep] = useState<'email' | 'token' | 'password'>('email')
	const [error, setError] = useState('')
	const logoPosition = useRef(new Animated.Value(-100)).current

	const colorScheme = useColorScheme()
	const colors = Colors[colorScheme ?? 'light']

	useEffect(() => {
		Animated.spring(logoPosition, {
			toValue: 0,
			useNativeDriver: true,
			tension: 5,
			friction: 3
		}).start()
	}, [])

	const handleSendCode = async () => {
		if (!email) {
			setError('Please enter your email address')
			return
		}

		setLoading(true)
		setError('')

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email)
			if (error) throw error

			setStep('token')
			Alert.alert('Success', 'A verification code has been sent to your email.')
		} catch (error) {
			console.error('Error sending reset code:', error)
			setError('Failed to send verification code. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const handleVerifyToken = async () => {
		if (!token || token.length !== 6) {
			setError('Please enter the 6-digit code')
			return
		}

		setLoading(true)
		setError('')

		try {
			const { error } = await supabase.auth.verifyOtp({
				email,
				token,
				type: 'recovery'
			})

			if (error) throw error

			setStep('password')
		} catch (error) {
			console.error('Error verifying code:', error)
			setError('Invalid verification code. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const handleResetPassword = async () => {
		if (newPassword !== confirmPassword) {
			setError("Passwords don't match")
			return
		}

		if (newPassword.length < 6) {
			setError('Password must be at least 6 characters')
			return
		}

		setLoading(true)
		setError('')

		try {
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error

			Alert.alert('Success', 'Password has been reset successfully', [
				{
					text: 'OK',
					onPress: () => router.replace('/login')
				}
			])
		} catch (error) {
			console.error('Error resetting password:', error)
			setError('Failed to reset password. Please try again.')
		} finally {
			setLoading(false)
		}
	}

	const renderStep = () => {
		switch (step) {
			case 'email':
				return (
					<>
						<Text style={[styles.title, { color: colors.text }]}>
							Forgot Password?
						</Text>
						<Text style={[styles.subtitle, { color: colors.text }]}>
							Enter your email to receive a verification code
						</Text>

						<View style={styles.inputContainer}>
							<TextInput
								style={[
									styles.input,
									{ color: colors.text, backgroundColor: colors.card }
								]}
								placeholder='Email'
								placeholderTextColor={colors.text}
								value={email}
								onChangeText={text => {
									setEmail(text)
									setError('')
								}}
								autoCapitalize='none'
								keyboardType='email-address'
							/>
							<Ionicons
								name='mail-outline'
								size={24}
								color={colors.text}
								style={styles.inputIcon}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: colors.primary },
								loading && styles.buttonDisabled
							]}
							onPress={handleSendCode}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color={colors.background} />
							) : (
								<Text style={styles.buttonText}>Send Code</Text>
							)}
						</TouchableOpacity>
					</>
				)

			case 'token':
				return (
					<>
						<Text style={[styles.title, { color: colors.text }]}>
							Enter Verification Code
						</Text>
						<Text style={[styles.subtitle, { color: colors.text }]}>
							Enter the 6-digit code sent to your email
						</Text>

						<View style={styles.inputContainer}>
							<TextInput
								style={[
									styles.input,
									{ color: colors.text, backgroundColor: colors.card }
								]}
								placeholder='000000'
								placeholderTextColor={colors.text}
								value={token}
								onChangeText={text => {
									setToken(text.replace(/[^0-9]/g, '').slice(0, 6))
									setError('')
								}}
								keyboardType='number-pad'
								maxLength={6}
							/>
							<Ionicons
								name='key-outline'
								size={24}
								color={colors.text}
								style={styles.inputIcon}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: colors.primary },
								loading && styles.buttonDisabled
							]}
							onPress={handleVerifyToken}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color={colors.background} />
							) : (
								<Text style={styles.buttonText}>Verify Code</Text>
							)}
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.resendButton}
							onPress={handleSendCode}
							disabled={loading}>
							<Text style={[styles.resendText, { color: colors.primary }]}>
								Resend Code
							</Text>
						</TouchableOpacity>
					</>
				)

			case 'password':
				return (
					<>
						<Text style={[styles.title, { color: colors.text }]}>
							Reset Password
						</Text>
						<Text style={[styles.subtitle, { color: colors.text }]}>
							Enter your new password
						</Text>

						<View style={styles.inputContainer}>
							<TextInput
								style={[
									styles.input,
									{ color: colors.text, backgroundColor: colors.card }
								]}
								placeholder='New Password'
								placeholderTextColor={colors.text}
								value={newPassword}
								onChangeText={text => {
									setNewPassword(text)
									setError('')
								}}
								secureTextEntry
							/>
							<Ionicons
								name='lock-closed-outline'
								size={24}
								color={colors.text}
								style={styles.inputIcon}
							/>
						</View>

						<View style={styles.inputContainer}>
							<TextInput
								style={[
									styles.input,
									{ color: colors.text, backgroundColor: colors.card }
								]}
								placeholder='Confirm Password'
								placeholderTextColor={colors.text}
								value={confirmPassword}
								onChangeText={text => {
									setConfirmPassword(text)
									setError('')
								}}
								secureTextEntry
							/>
							<Ionicons
								name='lock-closed-outline'
								size={24}
								color={colors.text}
								style={styles.inputIcon}
							/>
						</View>

						<TouchableOpacity
							style={[
								styles.button,
								{ backgroundColor: colors.primary },
								loading && styles.buttonDisabled
							]}
							onPress={handleResetPassword}
							disabled={loading}>
							{loading ? (
								<ActivityIndicator color={colors.background} />
							) : (
								<Text style={styles.buttonText}>Reset Password</Text>
							)}
						</TouchableOpacity>
					</>
				)
		}
	}

	return (
		<KeyboardAvoidingView
			style={[styles.container, { backgroundColor: colors.background }]}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
			<Animated.View
				style={[
					styles.logoContainer,
					{ transform: [{ translateY: logoPosition }] }
				]}>
				<Image
					source={require('../../assets/logo/icon.png')}
					style={styles.logo}
					resizeMode='contain'
				/>
			</Animated.View>

			<BlurView intensity={100} tint='default' style={styles.formContainer}>
				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				{renderStep()}

				<TouchableOpacity
					style={styles.backButton}
					onPress={() => {
						if (step === 'email') {
							router.back()
						} else {
							setStep('email')
						}
					}}>
					<Ionicons
						name='arrow-back'
						size={24}
						color={colors.primary}
						style={styles.backIcon}
					/>
					<Text style={[styles.backButtonText, { color: colors.primary }]}>
						{step === 'email' ? 'Back to Login' : 'Back'}
					</Text>
				</TouchableOpacity>
			</BlurView>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	logoContainer: {
		position: 'absolute',
		top: height * 0.1,
		alignSelf: 'center'
	},
	logo: {
		width: 180,
		height: 180
	},
	formContainer: {
		width: width * 0.9,
		maxWidth: 400,
		padding: 20,
		borderRadius: 20,
		alignItems: 'center'
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 10,
		textAlign: 'center'
	},
	subtitle: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 30,
		paddingHorizontal: 20,
		opacity: 0.8
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
		width: '100%',
		borderRadius: 12,
		overflow: 'hidden'
	},
	input: {
		flex: 1,
		height: 56,
		paddingHorizontal: 16,
		fontSize: 16
	},
	inputIcon: {
		position: 'absolute',
		right: 16
	},
	errorText: {
		color: 'red',
		marginBottom: 20,
		textAlign: 'center'
	},
	button: {
		width: '100%',
		height: 56,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
	buttonDisabled: {
		opacity: 0.7
	},
	buttonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold'
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10
	},
	backIcon: {
		marginRight: 8
	},
	backButtonText: {
		fontSize: 16,
		fontWeight: '600'
	},
	resendButton: {
		padding: 10,
		marginBottom: 10
	},
	resendText: {
		fontSize: 14,
		fontWeight: '600'
	}
})
