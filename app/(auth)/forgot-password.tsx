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
	ActivityIndicator,
	Keyboard,
	Pressable,
	ScrollView,
	StatusBar
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { Colors } from '@/constants/Colors'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import AsyncStorage from '@react-native-async-storage/async-storage'

const { width, height } = Dimensions.get('window')
const RATE_LIMIT_DURATION = 60 * 1000 // 1 minute
const MAX_ATTEMPTS = 3
const MIN_PASSWORD_LENGTH = 8

interface PasswordStrength {
	score: number
	feedback: string
	color: string
	requirements: {
		length: boolean
		uppercase: boolean
		lowercase: boolean
		number: boolean
		special: boolean
	}
}

interface EmailValidationState {
	isValid: boolean
	message: string
}

export default function ForgotPasswordScreen() {
	// State Management
	const [email, setEmail] = useState('')
	const [token, setToken] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [step, setStep] = useState<'email' | 'token' | 'password'>('email')
	const [error, setError] = useState('')
	const [attempts, setAttempts] = useState(0)
	const [lastAttemptTime, setLastAttemptTime] = useState(0)
	const [resendTimer, setResendTimer] = useState(60)
	const [canResend, setCanResend] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [emailValidation, setEmailValidation] = useState<EmailValidationState>({
		isValid: false,
		message: ''
	})
	const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
		score: 0,
		feedback: '',
		color: '#ff4444',
		requirements: {
			length: false,
			uppercase: false,
			lowercase: false,
			number: false,
			special: false
		}
	})

	// Animations and Refs
	const logoAnimation = useRef(new Animated.Value(0)).current
	const fadeAnim = useRef(new Animated.Value(0)).current
	const slideAnim = useRef(new Animated.Value(width)).current
	const shakeAnimation = useRef(new Animated.Value(0)).current

	const inputRefs = useRef<Array<TextInput | null>>([])

	// Theme
	const colorScheme = useColorScheme()
	const colors = Colors[colorScheme ?? 'light']

	// Effects
	useEffect(() => {
		StatusBar.setBarStyle(
			colorScheme === 'dark' ? 'light-content' : 'dark-content'
		)
		initializeScreen()
		return () => {
			clearInterval(timerRef.current)
		}
	}, [])

	useEffect(() => {
		validateEmail(email)
	}, [email])

	useEffect(() => {
		if (token.length === 6) {
			handleVerifyToken()
		}
	}, [token])

	const timerRef = useRef<NodeJS.Timeout>()

	// Initialization
	const initializeScreen = async () => {
		animateEntry()
		await loadAttempts()
		startResendTimer()
	}

	const animateEntry = () => {
		Animated.parallel([
			Animated.spring(logoAnimation, {
				toValue: 1,
				tension: 10,
				friction: 2,
				useNativeDriver: true
			}),
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 800,
				useNativeDriver: true
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				tension: 30,
				friction: 7,
				useNativeDriver: true
			})
		]).start()
	}

	// Validation Functions
	const validateEmail = (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		const isValid = emailRegex.test(email)
		setEmailValidation({
			isValid,
			message: isValid
				? 'Valid email address'
				: 'Please enter a valid email address'
		})
	}

	const calculatePasswordStrength = (password: string): PasswordStrength => {
		const requirements = {
			length: password.length >= MIN_PASSWORD_LENGTH,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /[0-9]/.test(password),
			special: /[^A-Za-z0-9]/.test(password)
		}

		const score = Object.values(requirements).filter(Boolean).length
		let feedback = ''
		let color = ''

		switch (score) {
			case 0:
			case 1:
				feedback = 'Very Weak'
				color = '#ff4444'
				break
			case 2:
				feedback = 'Weak'
				color = '#ffbb33'
				break
			case 3:
				feedback = 'Fair'
				color = '#00C851'
				break
			case 4:
				feedback = 'Good'
				color = '#33b5e5'
				break
			case 5:
				feedback = 'Strong'
				color = '#2BBBAD'
				break
		}

		return { score, feedback, color, requirements }
	}

	// Rate Limiting
	const loadAttempts = async () => {
		try {
			const storedAttempts = await AsyncStorage.getItem('resetAttempts')
			const storedTime = await AsyncStorage.getItem('lastAttemptTime')
			if (storedAttempts) setAttempts(parseInt(storedAttempts))
			if (storedTime) setLastAttemptTime(parseInt(storedTime))
		} catch (error) {
			console.error('Error loading attempts:', error)
		}
	}

	const checkRateLimit = async () => {
		const now = Date.now()
		if (
			attempts >= MAX_ATTEMPTS &&
			now - lastAttemptTime < RATE_LIMIT_DURATION
		) {
			const remainingTime = Math.ceil(
				(RATE_LIMIT_DURATION - (now - lastAttemptTime)) / 1000
			)
			throw new Error(
				`Too many attempts. Please try again in ${remainingTime} seconds.`
			)
		}

		if (now - lastAttemptTime >= RATE_LIMIT_DURATION) {
			setAttempts(0)
			await AsyncStorage.setItem('resetAttempts', '0')
		}
	}

	const updateAttempts = async () => {
		const newAttempts = attempts + 1
		const now = Date.now()
		setAttempts(newAttempts)
		setLastAttemptTime(now)
		await AsyncStorage.multiSet([
			['resetAttempts', newAttempts.toString()],
			['lastAttemptTime', now.toString()]
		])
	}

	// Timer Management
	const startResendTimer = () => {
		setCanResend(false)
		setResendTimer(60)

		timerRef.current = setInterval(() => {
			setResendTimer(prev => {
				if (prev <= 1) {
					clearInterval(timerRef.current)
					setCanResend(true)
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}

	// Animation Helpers
	const shakeError = () => {
		Animated.sequence([
			Animated.timing(shakeAnimation, {
				toValue: 10,
				duration: 100,
				useNativeDriver: true
			}),
			Animated.timing(shakeAnimation, {
				toValue: -10,
				duration: 100,
				useNativeDriver: true
			}),
			Animated.timing(shakeAnimation, {
				toValue: 10,
				duration: 100,
				useNativeDriver: true
			}),
			Animated.timing(shakeAnimation, {
				toValue: 0,
				duration: 100,
				useNativeDriver: true
			})
		]).start()
	}

	// Handler Functions
	const handleSendCode = async () => {
		Keyboard.dismiss()
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

			if (!emailValidation.isValid) {
				shakeError()
				await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
				setError('Please enter a valid email address')
				return
			}

			await checkRateLimit()
			setLoading(true)
			setError('')

			const { error: supabaseError } =
				await supabase.auth.resetPasswordForEmail(email)
			if (supabaseError) throw supabaseError

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
			await updateAttempts()

			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 200,
					useNativeDriver: true
				}),
				Animated.timing(slideAnim, {
					toValue: -width,
					duration: 300,
					useNativeDriver: true
				})
			]).start(() => {
				setStep('token')
				startResendTimer()
				slideAnim.setValue(width)
				Animated.parallel([
					Animated.timing(fadeAnim, {
						toValue: 1,
						duration: 200,
						useNativeDriver: true
					}),
					Animated.spring(slideAnim, {
						toValue: 0,
						tension: 30,
						friction: 7,
						useNativeDriver: true
					})
				]).start()
			})
		} catch (error) {
			console.error('Error sending reset code:', error)
			shakeError()
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
			setError(error instanceof Error ? error.message : 'Failed to send code')
		} finally {
			setLoading(false)
		}
	}

	const handleVerifyToken = async () => {
		if (token.length !== 6) return

		try {
			setLoading(true)
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

			const { error } = await supabase.auth.verifyOtp({
				email,
				token,
				type: 'recovery'
			})

			if (error) throw error

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

			setTimeout(() => {
				Animated.parallel([
					Animated.timing(fadeAnim, {
						toValue: 0,
						duration: 200,
						useNativeDriver: true
					}),
					Animated.timing(slideAnim, {
						toValue: -width,
						duration: 300,
						useNativeDriver: true
					})
				]).start(() => {
					setStep('password')
					slideAnim.setValue(width)
					Animated.parallel([
						Animated.timing(fadeAnim, {
							toValue: 1,
							duration: 200,
							useNativeDriver: true
						}),
						Animated.spring(slideAnim, {
							toValue: 0,
							tension: 30,
							friction: 7,
							useNativeDriver: true
						})
					]).start()
				})
			}, 1500)
		} catch (error) {
			console.error('Error verifying token:', error)
			shakeError()
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
			setError('Invalid verification code. Please try again.')
			setToken('')
		} finally {
			setLoading(false)
		}
	}

	const handleResetPassword = async () => {
		try {
			if (newPassword !== confirmPassword) {
				throw new Error("Passwords don't match")
			}

			if (passwordStrength.score < 3) {
				throw new Error('Please choose a stronger password')
			}

			setLoading(true)
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error

			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

			Alert.alert(
				'Success',
				'Your password has been reset successfully',
				[
					{
						text: 'Login',
						onPress: () => router.replace('/login')
					}
				],
				{ cancelable: false }
			)
		} catch (error) {
			console.error('Error resetting password:', error)
			shakeError()
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
			setError(
				error instanceof Error ? error.message : 'Failed to reset password'
			)
		} finally {
			setLoading(false)
		}
	}

	const handlePasteCode = async () => {
		try {
			const text = await Clipboard.getStringAsync()
			if (text.length === 6 && /^\d+$/.test(text)) {
				setToken(text)
				await Haptics.notificationAsync(
					Haptics.NotificationFeedbackType.Success
				)
			}
		} catch (error) {
			console.error('Error pasting code:', error)
		}
	}

	// Render Methods
	const renderPasswordStrengthIndicator = () => {
		const { requirements } = passwordStrength
		return (
			<View style={styles.strengthIndicator}>
				<View style={styles.strengthBars}>
					{[1, 2, 3, 4, 5].map(level => (
						<Animated.View
							key={level}
							style={[
								styles.strengthBar,
								{
									backgroundColor:
										level <= passwordStrength.score
											? passwordStrength.color
											: colors.border
								}
							]}
						/>
					))}
				</View>
				<Text style={[styles.strengthText, { color: passwordStrength.color }]}>
					{passwordStrength.feedback}
				</Text>
				<View style={styles.requirementsList}>
					{Object.entries(requirements).map(([key, met]) => (
						<View key={key} style={styles.requirementItem}>
							<MaterialCommunityIcons
								name={met ? 'check-circle' : 'circle-outline'}
								size={16}
								color={met ? colors.success : colors.text}
							/>
							<Text
								style={[
									styles.requirementText,
									{ color: met ? colors.success : colors.text }
								]}>
								{key === 'length'
									? `At least ${MIN_PASSWORD_LENGTH} characters`
									: key === 'uppercase'
									? 'Uppercase letter'
									: key === 'lowercase'
									? 'Lowercase letter'
									: key === 'number'
									? 'Number'
									: 'Special character'}
							</Text>
						</View>
					))}
				</View>
			</View>
		)
	}

	const renderEmailStep = () => (
		<View style={styles.stepContainer}>
			<Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
			<Text style={[styles.subtitle, { color: colors.text }]}>
				Enter your email to receive a verification code
			</Text>

			<View style={styles.inputContainer}>
				<Ionicons
					name='mail'
					size={20}
					color={colors.text}
					style={styles.inputIcon}
				/>
				<TextInput
					style={[styles.input, { color: colors.text }]}
					placeholder='Email'
					placeholderTextColor={colors.text}
					value={email}
					onChangeText={setEmail}
					keyboardType='email-address'
					autoCapitalize='none'
					autoCorrect={false}
					autoComplete='email'
					returnKeyType='send'
					onSubmitEditing={handleSendCode}
					ref={ref => (inputRefs.current[0] = ref)}
				/>
				{emailValidation.isValid && (
					<Ionicons name='checkmark-circle' size={20} color={colors.success} />
				)}
			</View>

			<TouchableOpacity
				style={[
					styles.button,
					loading && styles.buttonDisabled,
					{ backgroundColor: colors.primary }
				]}
				onPress={handleSendCode}
				disabled={loading}>
				{loading ? (
					<ActivityIndicator color={colors.background} />
				) : (
					<Text style={styles.buttonText}>Send Code</Text>
				)}
			</TouchableOpacity>
		</View>
	)

	const renderTokenStep = () => (
		<View style={styles.stepContainer}>
			<Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
			<Text style={[styles.subtitle, { color: colors.text }]}>
				Enter the 6-digit code sent to {email}
			</Text>

			<View style={styles.codeContainer}>
				{Array(6)
					.fill(0)
					.map((_, index) => (
						<TextInput
							key={index}
							style={[styles.codeInput, { borderColor: colors.border }]}
							value={token[index] || ''}
							onChangeText={value => {
								const newToken = token.split('')
								newToken[index] = value
								setToken(newToken.join(''))
								if (value && index < 5) {
									inputRefs.current[index + 2]?.focus()
								}
							}}
							keyboardType='number-pad'
							maxLength={1}
							ref={ref => (inputRefs.current[index + 1] = ref)}
						/>
					))}
			</View>

			<TouchableOpacity style={styles.pasteButton} onPress={handlePasteCode}>
				<Ionicons name='clipboard-outline' size={20} color={colors.primary} />
				<Text style={[styles.pasteText, { color: colors.primary }]}>
					Paste Code
				</Text>
			</TouchableOpacity>

			{loading ? (
				<ActivityIndicator color={colors.primary} style={styles.loader} />
			) : (
				<TouchableOpacity
					style={[
						styles.resendButton,
						!canResend && styles.resendButtonDisabled
					]}
					onPress={canResend ? handleSendCode : undefined}
					disabled={!canResend}>
					<Text
						style={[
							styles.resendText,
							{ color: canResend ? colors.primary : colors.border }
						]}>
						{canResend ? 'Resend Code' : `Resend in ${resendTimer}s`}
					</Text>
				</TouchableOpacity>
			)}
		</View>
	)

	const renderPasswordStep = () => (
		<View style={styles.stepContainer}>
			<Text style={[styles.title, { color: colors.text }]}>New Password</Text>
			<Text style={[styles.subtitle, { color: colors.text }]}>
				Choose a strong password for your account
			</Text>

			<View style={styles.inputContainer}>
				<Ionicons
					name='lock-closed'
					size={20}
					color={colors.text}
					style={styles.inputIcon}
				/>
				<TextInput
					style={[styles.input, { color: colors.text }]}
					placeholder='New Password'
					placeholderTextColor={colors.text}
					value={newPassword}
					onChangeText={text => {
						setNewPassword(text)
						setPasswordStrength(calculatePasswordStrength(text))
					}}
					secureTextEntry={!showPassword}
					autoCapitalize='none'
					ref={ref => (inputRefs.current[7] = ref)}
				/>
				<TouchableOpacity
					style={styles.showPasswordButton}
					onPress={() => setShowPassword(!showPassword)}>
					<Ionicons
						name={showPassword ? 'eye-off' : 'eye'}
						size={20}
						color={colors.text}
					/>
				</TouchableOpacity>
			</View>

			{renderPasswordStrengthIndicator()}

			<View style={styles.inputContainer}>
				<Ionicons
					name='lock-closed'
					size={20}
					color={colors.text}
					style={styles.inputIcon}
				/>
				<TextInput
					style={[styles.input, { color: colors.text }]}
					placeholder='Confirm Password'
					placeholderTextColor={colors.text}
					value={confirmPassword}
					onChangeText={setConfirmPassword}
					secureTextEntry={!showPassword}
					autoCapitalize='none'
					ref={ref => (inputRefs.current[8] = ref)}
					returnKeyType='done'
					onSubmitEditing={handleResetPassword}
				/>
			</View>

			<TouchableOpacity
				style={[
					styles.button,
					loading && styles.buttonDisabled,
					{ backgroundColor: colors.primary }
				]}
				onPress={handleResetPassword}
				disabled={loading}>
				{loading ? (
					<ActivityIndicator color={colors.background} />
				) : (
					<Text style={styles.buttonText}>Reset Password</Text>
				)}
			</TouchableOpacity>
		</View>
	)

	return (
		<KeyboardAvoidingView
			style={[styles.container, { backgroundColor: colors.background }]}
			behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
			<StatusBar
				barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
				animated={true}
			/>

			<Animated.View
				style={[
					styles.logoContainer,
					{
						transform: [
							{
								translateY: logoAnimation.interpolate({
									inputRange: [0, 1],
									outputRange: [-100, 0]
								})
							}
						]
					}
				]}>
				<Image
					source={require('../../assets/logo/icon.png')}
					style={styles.logo}
					resizeMode='contain'
				/>
			</Animated.View>

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				keyboardShouldPersistTaps='handled'
				showsVerticalScrollIndicator={false}>
				<Animated.View
					style={[
						styles.formContainer,
						{
							opacity: fadeAnim,
							transform: [{ translateX: slideAnim }]
						}
					]}>
					<BlurView
						intensity={100}
						tint={colorScheme === 'dark' ? 'dark' : 'light'}
						style={styles.blurContainer}>
						<Animated.View
							style={[
								styles.errorContainer,
								{ transform: [{ translateX: shakeAnimation }] }
							]}>
							{error ? (
								<View style={styles.errorContent}>
									<Ionicons
										name='alert-circle'
										size={24}
										color={colors.error}
									/>
									<Text style={[styles.errorText, { color: colors.error }]}>
										{error}
									</Text>
								</View>
							) : null}
						</Animated.View>

						{step === 'email' && renderEmailStep()}
						{step === 'token' && renderTokenStep()}
						{step === 'password' && renderPasswordStep()}

						<TouchableOpacity
							style={styles.backButton}
							onPress={() => {
								if (step === 'email') {
									router.back()
								} else {
									setStep('email')
								}
							}}>
							<Ionicons name='arrow-back' size={24} color={colors.primary} />
							<Text style={[styles.backText, { color: colors.primary }]}>
								{step === 'email' ? 'Back to Login' : 'Back'}
							</Text>
						</TouchableOpacity>
					</BlurView>
				</Animated.View>
			</ScrollView>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 40
	},
	logoContainer: {
		position: 'absolute',
		top: height * 0.1,
		alignSelf: 'center',
		zIndex: 10
	},
	logo: {
		width: 120,
		height: 120
	},
	formContainer: {
		width: '100%',
		maxWidth: 400,
		alignSelf: 'center',
		borderRadius: 24,
		overflow: 'hidden'
	},
	blurContainer: {
		padding: 24,
		borderRadius: 24
	},
	stepContainer: {
		width: '100%'
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 8,
		textAlign: 'center'
	},
	subtitle: {
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 24,
		opacity: 0.8
	},
	inputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'rgba(0, 0, 0, 0.1)',
		borderRadius: 12,
		paddingHorizontal: 16,
		marginBottom: 16,
		height: 56
	},
	input: {
		flex: 1,
		fontSize: 16,
		marginLeft: 12
	},
	inputIcon: {
		opacity: 0.5
	},
	button: {
		height: 56,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8
	},
	buttonDisabled: {
		opacity: 0.7
	},
	buttonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold'
	},
	errorContainer: {
		marginBottom: 16
	},
	errorContent: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 0, 0, 0.1)',
		padding: 12,
		borderRadius: 12
	},
	errorText: {
		marginLeft: 8,
		fontSize: 14,
		flex: 1
	},
	codeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 24
	},
	codeInput: {
		width: 45,
		height: 56,
		borderWidth: 1,
		borderRadius: 12,
		fontSize: 24,
		textAlign: 'center',
		color: 'white'
	},
	strengthIndicator: {
		marginBottom: 16
	},
	strengthBars: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	strengthBar: {
		flex: 1,
		height: 4,
		borderRadius: 2,
		marginHorizontal: 2
	},
	strengthText: {
		textAlign: 'center',
		fontSize: 14,
		marginBottom: 8
	},
	requirementsList: {
		marginTop: 8
	},
	requirementItem: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4
	},
	requirementText: {
		marginLeft: 8,
		fontSize: 14
	},
	backButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 24
	},
	backText: {
		marginLeft: 8,
		fontSize: 16
	},
	pasteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16
	},
	pasteText: {
		marginLeft: 8,
		fontSize: 14,
		fontWeight: '600'
	},
	resendButton: {
		alignItems: 'center',
		padding: 12
	},
	resendButtonDisabled: {
		opacity: 0.5
	},
	resendText: {
		fontSize: 14,
		fontWeight: '600'
	},
	showPasswordButton: {
		padding: 8
	},
	loader: {
		marginVertical: 16
	},
	successAnimation: {
		position: 'absolute',
		width: 200,
		height: 200,
		alignSelf: 'center',
		top: '50%',
		marginTop: -100,
		pointerEvents: 'none'
	}
})

// Password validation schema
const passwordSchema = {
	minLength: MIN_PASSWORD_LENGTH,
	requireUppercase: true,
	requireLowercase: true,
	requireNumbers: true,
	requireSpecialChars: true,
	forbiddenPatterns: [/password/i, /123456/, /qwerty/i]
}

// API rate limiting configuration
const rateLimitConfig = {
	maxAttempts: MAX_ATTEMPTS,
	windowMs: RATE_LIMIT_DURATION,
	message: 'Too many attempts. Please try again later.'
}

// Analytics tracking
const trackPasswordReset = async (step: string, success: boolean) => {
	try {
		// Implement your analytics tracking here
		console.log('Password reset tracking:', { step, success })
	} catch (error) {
		console.error('Analytics error:', error)
	}
}

// Enhanced error messages
const errorMessages = {
	invalidEmail: 'Please enter a valid email address',
	invalidCode: 'Invalid verification code. Please check and try again.',
	passwordMismatch: 'Passwords do not match. Please try again.',
	weakPassword:
		'Please choose a stronger password that meets all requirements.',
	networkError: 'Network error. Please check your connection and try again.',
	rateLimited: 'Too many attempts. Please try again later.',
	serverError: 'Server error. Please try again later.'
}

// Enhanced success messages
const successMessages = {
	codeSent: 'Verification code sent successfully!',
	codeVerified: 'Code verified successfully!',
	passwordReset: 'Password reset successfully!'
}

// Animation configurations
const animationConfig = {
	spring: {
		tension: 30,
		friction: 7,
		useNativeDriver: true
	},
	timing: {
		duration: 300,
		useNativeDriver: true
	}
}

// Theme configurations

// Input validation helpers
const inputValidators = {
	email: (email: string) => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		return {
			isValid: emailRegex.test(email),
			message: emailRegex.test(email) ? '' : errorMessages.invalidEmail
		}
	},
	code: (code: string) => {
		return {
			isValid: code.length === 6 && /^\d+$/.test(code),
			message:
				code.length === 6 && /^\d+$/.test(code) ? '' : errorMessages.invalidCode
		}
	},
	password: (password: string) => {
		const strength = calculatePasswordStrength(password)
		return {
			isValid: strength.score >= 3,
			message: strength.score >= 3 ? '' : errorMessages.weakPassword,
			strength
		}
	}
}

// Enhanced haptic feedback patterns
const hapticPatterns = {
	error: async () => {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
	},
	success: async () => {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
	},
	warning: async () => {
		await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
		await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
	}
}

// Export types for external use
export type { PasswordStrength, EmailValidationState }

// Export constants and configurations
export {
	passwordSchema,
	rateLimitConfig,
	errorMessages,
	successMessages,
	animationConfig,
	inputValidators,
	hapticPatterns
}
function calculatePasswordStrength(password: string) {
	const requirements = {
		length: password.length >= MIN_PASSWORD_LENGTH,
		uppercase: /[A-Z]/.test(password),
		lowercase: /[a-z]/.test(password),
		number: /[0-9]/.test(password),
		special: /[^A-Za-z0-9]/.test(password)
	}

	const score = Object.values(requirements).filter(Boolean).length
	let feedback = ''
	let color = ''

	switch (score) {
		case 0:
		case 1:
			feedback = 'Very Weak'
			color = '#ff4444'
			break
		case 2:
			feedback = 'Weak'
			color = '#ffbb33'
			break
		case 3:
			feedback = 'Fair'
			color = '#00C851'
			break
		case 4:
			feedback = 'Good'
			color = '#33b5e5'
			break
		case 5:
			feedback = 'Strong'
			color = '#2BBBAD'
			break
	}

	return { score, feedback, color, requirements }
}
