import React, { useState, useEffect } from 'react'
import {
	View,
	Text,
	TextInput,
	StyleSheet,
	Alert,
	ScrollView,
	TouchableOpacity
} from 'react-native'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
	const { user } = useAuth()
	const [name, setName] = useState('')
	const [contactNumber, setContactNumber] = useState('')
	const [isEditing, setIsEditing] = useState(false)

	const router = useRouter()

	useEffect(() => {
		if (user) {
			fetchProfile()
		}
	}, [user])

	async function fetchProfile() {
		const { data, error } = await supabase
			.from('users')
			.select('email, name, contact_number')
			.eq('id', user?.id)
			.single()

		if (error) {
			console.error('Error fetching profile:', error)
		} else if (data) {
			setName(data.name || '')
			setContactNumber(data.contact_number || '')
		}
	}

	async function updateProfile() {
		const { error } = await supabase
			.from('users')
			.update({
				name: name,
				contact_number: contactNumber
			})
			.eq('id', user?.id)

		if (error) {
			Alert.alert('Error', error.message)
		} else {
			Alert.alert('Success', 'Profile updated successfully')
			setIsEditing(false)
		}
	}

	async function handleSignOut() {
		const { error } = await supabase.auth.signOut()
		if (error) {
			Alert.alert('Error signing out', error.message)
		}
	}

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Ionicons name='person-circle-outline' size={100} color='#0a7ea4' />
				<Text style={styles.headerText}>{user?.email}</Text>
				<Text style={styles.infoText}>Name: {name}</Text>
				<Text style={styles.infoText}>Contact Number: {contactNumber}</Text>
			</View>

			<TouchableOpacity
				style={styles.editButton}
				onPress={() => setIsEditing(!isEditing)}>
				<Text style={styles.editButtonText}>
					{isEditing ? 'Cancel' : 'Edit Profile'}
				</Text>
			</TouchableOpacity>

			{isEditing && (
				<View>
					<View style={styles.inputContainer}>
						<Text style={styles.label}>Name:</Text>
						<TextInput
							style={styles.input}
							value={name}
							onChangeText={setName}
							placeholder='Enter your name'
						/>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Contact Number:</Text>
						<TextInput
							style={styles.input}
							value={contactNumber}
							onChangeText={setContactNumber}
							placeholder='Enter your contact number'
							keyboardType='phone-pad'
						/>
					</View>

					<TouchableOpacity style={styles.updateButton} onPress={updateProfile}>
						<Text style={styles.updateButtonText}>Update Profile</Text>
					</TouchableOpacity>
				</View>
			)}

			<TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
				<Text style={styles.signOutButtonText}>Sign Out</Text>
			</TouchableOpacity>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#f5f5f5'
	},
	header: {
		alignItems: 'center',
		marginBottom: 30
	},
	headerText: {
		fontSize: 18,
		fontWeight: 'bold',
		marginTop: 10,
		color: '#333'
	},
	infoText: {
		fontSize: 16,
		marginTop: 5,
		color: '#696969'
	},
	inputContainer: {
		marginBottom: 20
	},
	label: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5,
		color: '#555'
	},
	input: {
		height: 50,
		borderColor: '#ddd',
		borderWidth: 1,
		borderRadius: 10,
		paddingHorizontal: 15,
		fontSize: 16,
		backgroundColor: 'white'
	},
	updateButton: {
		backgroundColor: '#0a7ea4',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 20
	},
	updateButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold'
	},
	editButton: {
		backgroundColor: '#f0ad4e',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center',
		marginBottom: 20
	},
	editButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold'
	},
	signOutButton: {
		backgroundColor: '#d9534f',
		padding: 15,
		borderRadius: 10,
		alignItems: 'center'
	},
	signOutButtonText: {
		color: 'white',
		fontSize: 18,
		fontWeight: 'bold'
	}
})
