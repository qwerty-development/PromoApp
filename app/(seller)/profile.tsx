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
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
	const { user } = useAuth()
	const [phone, setPhone] = useState('')
	const [latitude, setLatitude] = useState('')
	const [longitude, setLongitude] = useState('')
	const [businessName, setBusinessName] = useState('')
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
			.select('contact_number, latitude, longitude, business_name')
			.eq('id', user?.id)
			.single()

		if (error) {
			console.error('Error fetching profile:', error)
		} else if (data) {
			setPhone(data.contact_number || '')
			setLatitude(data.latitude?.toString() || '')
			setLongitude(data.longitude?.toString() || '')
			setBusinessName(data.business_name || '')
		}
	}

	async function updateProfile() {
		const { error } = await supabase
			.from('users')
			.update({
				contact_number: phone,
				latitude: parseFloat(latitude),
				longitude: parseFloat(longitude),
				business_name: businessName
			})
			.eq('id', user?.id)

		if (error) {
			Alert.alert('Error', error.message)
		} else {
			Alert.alert('Success', 'Profile updated successfully')
			setIsEditing(false)
		}
	}

	async function getCurrentLocation() {
		let { status } = await Location.requestForegroundPermissionsAsync()
		if (status !== 'granted') {
			Alert.alert('Permission denied', 'Allow the app to use location service.')
			return
		}

		let location = await Location.getCurrentPositionAsync({})
		setLatitude(location.coords.latitude.toString())
		setLongitude(location.coords.longitude.toString())
	}

	async function handleSignOut() {
		const { error } = await supabase.auth.signOut()
		if (error) {
			Alert.alert('Error signing out', error.message)
		} else {
			router.replace('/login')
		}
	}

	return (
		<ScrollView style={styles.container}>
			<View style={styles.header}>
				<Ionicons name='person-circle-outline' size={100} color='#0a7ea4' />
				<Text style={styles.headerText}>{user?.email}</Text>
				<Text style={styles.infoText}>Business Name: {businessName}</Text>
				<Text style={styles.infoText}>Phone: {phone}</Text>
				<Text style={styles.infoText}>Latitude: {latitude}</Text>
				<Text style={styles.infoText}>Longitude: {longitude}</Text>
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
						<Text style={styles.label}>Business Name:</Text>
						<TextInput
							style={styles.input}
							value={businessName}
							onChangeText={setBusinessName}
							placeholder='Enter your business name'
						/>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Phone Number:</Text>
						<TextInput
							style={styles.input}
							value={phone}
							onChangeText={setPhone}
							placeholder='Enter your phone number'
							keyboardType='phone-pad'
						/>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Latitude:</Text>
						<TextInput
							style={styles.input}
							value={latitude}
							onChangeText={setLatitude}
							placeholder='Enter latitude'
							keyboardType='numeric'
						/>
					</View>

					<View style={styles.inputContainer}>
						<Text style={styles.label}>Longitude:</Text>
						<TextInput
							style={styles.input}
							value={longitude}
							onChangeText={setLongitude}
							placeholder='Enter longitude'
							keyboardType='numeric'
						/>
					</View>

					<TouchableOpacity
						style={styles.locationButton}
						onPress={getCurrentLocation}>
						<Ionicons name='location-outline' size={24} color='white' />
						<Text style={styles.locationButtonText}>Get Current Location</Text>
					</TouchableOpacity>

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
		color: '#555'
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
	locationButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#4ecdc4',
		padding: 15,
		borderRadius: 10,
		marginBottom: 20
	},
	locationButtonText: {
		color: 'white',
		fontSize: 16,
		marginLeft: 10
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
