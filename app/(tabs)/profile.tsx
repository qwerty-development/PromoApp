import React, { useState, useEffect } from 'react'
import {
	StyleSheet,
	ScrollView,
	View,
	TouchableOpacity,
	Image,
	Alert,
	Linking,
	TextInput,
	Modal,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { ThemedView } from '@/components/ThemedView'
import { ThemedText } from '@/components/ThemedText'
import { Colors } from '@/constants/Colors'
import { useColorScheme } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface UserProfile {
	id: string
	email: string
	name: string
	avatar_url: string | null
}

const PasswordFeedback = ({
	error,
	success
}: {
	error: string
	success: string
}) => (
	<View style={styles.feedbackContainer}>
		{error ? (
			<ThemedText style={[styles.feedbackText, styles.errorText]}>
				<Ionicons name='alert-circle' size={16} /> {error}
			</ThemedText>
		) : success ? (
			<ThemedText style={[styles.feedbackText, styles.successText]}>
				<Ionicons name='checkmark-circle' size={16} /> {success}
			</ThemedText>
		) : null}
	</View>
)

// Add password requirements component
const PasswordRequirements = () => (
	<View style={styles.passwordRequirements}>
		<ThemedText style={styles.requirementText}>Password must:</ThemedText>
		<ThemedText style={styles.requirementItem}>
			• Be at least 8 characters long
		</ThemedText>
		<ThemedText style={styles.requirementItem}>
			• Contain at least one letter
		</ThemedText>
		<ThemedText style={styles.requirementItem}>
			• Contain at least one number
		</ThemedText>
	</View>
)

export default function ProfileScreen() {
	const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
	const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true)
	const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false)
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [passwordChangeError, setPasswordChangeError] = useState('')
	const [passwordChangeSuccess, setPasswordChangeSuccess] = useState('')
	const colorScheme = useColorScheme()
	const colors = Colors[colorScheme ?? 'light']
	const { user } = useAuth()
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(false)

	const validatePassword = (password: string) => {
		const requirements = {
			length: password.length >= 8,
			letter: /[A-Za-z]/.test(password),
			number: /\d/.test(password)
		}

		const isValid = Object.values(requirements).every(Boolean)
		return {
			isValid,
			requirements,
			message: !isValid ? 'Password does not meet requirements' : ''
		}
	}

	const cleanupPasswordChange = () => {
		setCurrentPassword('')
		setNewPassword('')
		setConfirmPassword('')
		setPasswordChangeError('')
		setPasswordChangeSuccess('')
		setIsLoading(false)
	}

	const handleModalClose = () => {
		cleanupPasswordChange()
		setIsPasswordModalVisible(false)
	}

	useEffect(() => {
		if (user) {
			fetchUserProfile()
		}
	}, [user])

	async function fetchUserProfile() {
		try {
			const { data, error } = await supabase
				.from('users')
				.select('*')
				.eq('id', user?.id)
				.single()

			if (error) throw error
			setUserProfile(data)
		} catch (error) {
			console.error('Error fetching user profile:', error)
			Alert.alert('Error', 'Failed to load user profile. Please try again.')
		}
	}

	const handleEditProfile = () => {
		router.push('/edit-profile')
	}

	const handleSignOut = async () => {
		try {
			setIsLoading(true)
			await supabase.auth.signOut()
			await AsyncStorage.clear()
			router.replace('/(auth)/login')
		} catch (error) {
			console.error('Error signing out:', error)
			Alert.alert('Error', 'Failed to sign out. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleToggleNotifications = () => {
		setIsNotificationsEnabled(!isNotificationsEnabled)
		// TODO: Implement actual notification toggle logic
	}

	const handleSupport = () => {
		Linking.openURL('mailto:support@yourapp.com')
	}

	const handleTerms = () => {
		router.push('/terms-of-service')
	}

	const handlePrivacy = () => {
		router.push('/privacy-policy')
	}

	const handlePaymentMethods = () => {
		router.push('/payment-methods')
	}

	const handleNotificationSettings = () => {
		router.push('/notification-settings')
	}

	const handleHelpCenter = () => {
		router.push('/help-center')
	}

	const handleReportProblem = () => {
		router.push('/report-problem')
	}

	const handleGiveFeedback = () => {
		router.push('/give-feedback')
	}
	const handleChangePassword = async () => {
		setPasswordChangeError('')
		setPasswordChangeSuccess('')
		setIsLoading(true)

		if (newPassword !== confirmPassword) {
			setPasswordChangeError("New passwords don't match")
			setIsLoading(false)
			return
		}

		const validation = validatePassword(newPassword)
		if (!validation.isValid) {
			setPasswordChangeError(validation.message)
			setIsLoading(false)
			return
		}

		try {
			// First verify current password
			const { data: signInData, error: signInError } =
				await supabase.auth.signInWithPassword({
					email: user?.email!,
					password: currentPassword
				})

			if (signInError) {
				setPasswordChangeError('Current password is incorrect')
				setIsLoading(false)
				return
			}

			// Update password
			const { error } = await supabase.auth.updateUser({
				password: newPassword
			})

			if (error) throw error

			setPasswordChangeSuccess('Password changed successfully')

			// Wait for success message to be visible
			await new Promise(resolve => setTimeout(resolve, 1500))

			// Clear modal and states
			handleModalClose()

			// Clear local session
			await AsyncStorage.removeItem('supabase-auth')

			// Sign out and redirect
			const { error: signOutError } = await supabase.auth.signOut({
				scope: 'local'
			})

			if (signOutError) {
				console.error('Error signing out:', signOutError)
				return
			}
			router.push('/(auth)/login')
		} catch (error) {
			console.error('Error changing password:', error)
			setPasswordChangeError('Failed to change password. Please try again.')
		} finally {
			setIsLoading(false)
		}
	}

	const renderSection = (title: string, icon: string, onPress: () => void) => (
		<TouchableOpacity style={styles.sectionButton} onPress={onPress}>
			<View style={styles.sectionIconContainer}>
				<FontAwesome5 name={icon} size={18} color={colors.primary} />
			</View>
			<ThemedText style={styles.sectionButtonText}>{title}</ThemedText>
			<Ionicons name='chevron-forward' size={24} color={colors.text} />
		</TouchableOpacity>
	)

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: colors.background }]}>
			<SafeAreaView>
				<BlurView intensity={100} tint='default' style={styles.headerContainer}>
					<Image
						source={{
							uri: userProfile?.avatar_url || 'https://via.placeholder.com/150'
						}}
						style={styles.avatar}
					/>
					<View style={styles.userInfo}>
						<ThemedText style={styles.userName}>
							{userProfile?.name || 'User Name'}
						</ThemedText>
						<ThemedText style={styles.userEmail}>
							{userProfile?.email || 'user@example.com'}
						</ThemedText>
					</View>
					<TouchableOpacity
						style={[styles.editButton, { backgroundColor: colors.primary }]}
						onPress={handleEditProfile}>
						<ThemedText
							style={[styles.editButtonText, { color: colors.background }]}>
							Edit Profile
						</ThemedText>
					</TouchableOpacity>
				</BlurView>
				<View style={styles.statsContainer}>
					<View style={styles.statItem}>
						<ThemedText style={styles.statValue}>23</ThemedText>
						<ThemedText style={styles.statLabel}>Claimed</ThemedText>
					</View>
					<View style={styles.statItem}>
						<ThemedText style={styles.statValue}>15</ThemedText>
						<ThemedText style={styles.statLabel}>Redeemed</ThemedText>
					</View>
					<View style={styles.statItem}>
						<ThemedText style={styles.statValue}>$142</ThemedText>
						<ThemedText style={styles.statLabel}>Saved</ThemedText>
					</View>
				</View>

				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Account</ThemedText>
					{renderSection(
						'Personal Information',
						'user-circle',
						handleEditProfile
					)}
					{renderSection(
						'Payment Methods',
						'credit-card',
						handlePaymentMethods
					)}
					{renderSection(
						'Notification Settings',
						'bell',
						handleNotificationSettings
					)}
					{renderSection('Change Password', 'lock', () =>
						setIsPasswordModalVisible(true)
					)}
				</View>

				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Support</ThemedText>
					{renderSection('Help Center', 'question-circle', handleHelpCenter)}
					{renderSection(
						'Report a Problem',
						'exclamation-circle',
						handleReportProblem
					)}
					{renderSection('Give Feedback', 'comment-alt', handleGiveFeedback)}
				</View>

				<View style={styles.section}>
					<ThemedText style={styles.sectionTitle}>Legal</ThemedText>
					{renderSection('Terms of Service', 'file-contract', handleTerms)}
					{renderSection('Privacy Policy', 'shield-alt', handlePrivacy)}
				</View>

				<TouchableOpacity
					style={[styles.signOutButton, { backgroundColor: colors.error }]}
					onPress={handleSignOut}>
					<ThemedText
						style={[styles.signOutButtonText, { color: colors.background }]}>
						Sign Out
					</ThemedText>
				</TouchableOpacity>

				<Modal
					animationType='fade'
					transparent={true}
					visible={isPasswordModalVisible}
					onRequestClose={handleModalClose}>
					<BlurView
						intensity={100}
						tint='default'
						style={styles.modalContainer}>
						<KeyboardAvoidingView
							behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
							style={styles.keyboardAvoidingView}>
							<View
								style={[
									styles.modalContent,
									{ backgroundColor: colors.background }
								]}>
								<TouchableOpacity
									style={styles.closeButton}
									onPress={handleModalClose}>
									<Ionicons name='close' size={24} color={colors.text} />
								</TouchableOpacity>

								<ThemedText style={styles.modalTitle}>
									Change Password
								</ThemedText>

								<TextInput
									style={[
										styles.input,
										{ color: colors.text, borderColor: colors.border }
									]}
									placeholderTextColor={colors.text}
									placeholder='Current Password'
									secureTextEntry
									value={currentPassword}
									onChangeText={setCurrentPassword}
									autoCapitalize='none'
								/>

								<TextInput
									style={[
										styles.input,
										{ color: colors.text, borderColor: colors.border }
									]}
									placeholderTextColor={colors.text}
									placeholder='New Password'
									secureTextEntry
									value={newPassword}
									onChangeText={setNewPassword}
									autoCapitalize='none'
								/>

								<TextInput
									style={[
										styles.input,
										{ color: colors.text, borderColor: colors.border }
									]}
									placeholderTextColor={colors.text}
									placeholder='Confirm New Password'
									secureTextEntry
									value={confirmPassword}
									onChangeText={setConfirmPassword}
									autoCapitalize='none'
								/>

								<PasswordRequirements />

								<PasswordFeedback
									error={passwordChangeError}
									success={passwordChangeSuccess}
								/>

								<TouchableOpacity
									style={[
										styles.changePasswordButton,
										{ backgroundColor: colors.primary }
									]}
									onPress={handleChangePassword}
									disabled={
										isLoading ||
										!currentPassword ||
										!newPassword ||
										!confirmPassword
									}>
									{isLoading ? (
										<ActivityIndicator color={colors.background} />
									) : (
										<ThemedText
											style={[
												styles.changePasswordButtonText,
												{ color: colors.background }
											]}>
											Change Password
										</ThemedText>
									)}
								</TouchableOpacity>
							</View>
						</KeyboardAvoidingView>
					</BlurView>
				</Modal>
			</SafeAreaView>
			{isLoading && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size='large' color={colors.primary} />
				</View>
			)}
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	headerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'black',
		padding: 20,
		marginBottom: 20
	},
	avatar: {
		width: 80,
		height: 80,
		borderRadius: 40,
		marginRight: 20
	},
	userInfo: {
		flex: 1
	},
	userName: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 5
	},
	userEmail: {
		fontSize: 14,
		opacity: 0.7
	},
	editButton: {
		paddingHorizontal: 15,
		paddingVertical: 8,
		borderRadius: 20
	},
	editButtonText: {
		fontSize: 14,
		fontWeight: 'bold'
	},
	statsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 20,
		paddingVertical: 15,
		backgroundColor: 'rgba(0, 0, 0, 0.25)',
		borderRadius: 10,
		marginHorizontal: 20
	},
	statItem: {
		alignItems: 'center'
	},
	statValue: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 5
	},
	statLabel: {
		fontSize: 12,
		opacity: 0.7
	},
	section: {
		marginBottom: 20,
		paddingHorizontal: 20
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10
	},
	sectionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 15,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0, 0, 0, 0.1)'
	},
	sectionIconContainer: {
		width: 30,
		alignItems: 'center',
		marginRight: 10
	},
	sectionButtonText: {
		flex: 1,
		fontSize: 16
	},
	signOutButton: {
		margin: 20,
		padding: 15,
		borderRadius: 10,
		alignItems: 'center'
	},
	signOutButtonText: {
		fontSize: 18,
		fontWeight: 'bold'
	},

	modalContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20
	},
	changePasswordButton: {
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginTop: 10,
		width: '100%'
	},
	changePasswordButtonText: {
		fontSize: 18,
		fontWeight: 'bold'
	},
	cancelButton: {
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginTop: 10,
		width: '100%'
	},
	cancelButtonText: {
		fontSize: 16,
		fontWeight: 'bold'
	},
	errorText: {
		color: 'red',
		marginBottom: 10,
		textAlign: 'center'
	},
	successText: {
		color: 'green',
		marginBottom: 10,
		textAlign: 'center'
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 1000
	},
	keyboardAvoidingView: {
		flex: 1,
		justifyContent: 'center',
		width: '100%',
		padding: 20
	},

	closeButton: {
		position: 'absolute',
		right: 15,
		top: 15,
		zIndex: 1
	},

	feedbackContainer: {
		marginVertical: 10,
		width: '100%',
		alignItems: 'center'
	},

	feedbackText: {
		flexDirection: 'row',
		alignItems: 'center',
		fontSize: 14,
		marginBottom: 5
	},

	passwordRequirements: {
		width: '100%',
		padding: 10,
		marginTop: 10,
		borderRadius: 8,
		backgroundColor: 'rgba(0,0,0,0.05)'
	},

	requirementText: {
		fontSize: 14,
		fontWeight: 'bold',
		marginBottom: 5
	},

	requirementItem: {
		fontSize: 14,
		marginLeft: 5,
		marginBottom: 3,
		opacity: 0.8
	},

	modalContent: {
		width: '100%',
		padding: 25,
		borderRadius: 20,
		alignItems: 'center'
	},

	input: {
		height: 50,
		width: '100%',
		borderWidth: 1,
		marginBottom: 12,
		paddingHorizontal: 15,
		borderRadius: 10,
		fontSize: 16
	}
})
