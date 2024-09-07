import React, { useEffect, useState, useCallback } from 'react'
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	TouchableOpacity,
	Alert,
	TextInput,
	ActivityIndicator,
	RefreshControl
} from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface User {
	id: string
	email: string
	role: string
	created_at: string
	name: string
}

type Role = 'user' | 'seller' | 'admin'

export default function AdminUsers() {
	const [users, setUsers] = useState<User[]>([])
	const [filteredUsers, setFilteredUsers] = useState<User[]>([])
	const [activeTab, setActiveTab] = useState<Role>('user')
	const [searchQuery, setSearchQuery] = useState('')
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
	const [isLoading, setIsLoading] = useState(true)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const insets = useSafeAreaInsets()

	const fetchUsers = useCallback(async () => {
		setIsLoading(true)
		const { data, error } = await supabase
			.from('users')
			.select('*')
			.order('created_at', { ascending: false })

		if (error) {
			console.error('Error fetching users:', error)
			Alert.alert('Error', 'Failed to fetch users. Please try again.')
		} else {
			setUsers(data || [])
		}
		setIsLoading(false)
	}, [])

	useEffect(() => {
		fetchUsers()
	}, [fetchUsers])

	useEffect(() => {
		filterAndSortUsers()
	}, [users, activeTab, searchQuery, sortOrder])

	const filterAndSortUsers = useCallback(() => {
		let filtered = users.filter(user => user.role === activeTab)

		if (searchQuery) {
			const query = searchQuery.toLowerCase()
			filtered = filtered.filter(
				user =>
					user.email.toLowerCase().includes(query) ||
					(user.name && user.name.toLowerCase().includes(query))
			)
		}

		filtered.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime()
			const dateB = new Date(b.created_at).getTime()
			return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
		})

		setFilteredUsers(filtered)
	}, [users, activeTab, searchQuery, sortOrder])

	const handleChangeRole = useCallback(
		async (userId: string, newRole: Role) => {
			// Optimistic update
			setUsers(prevUsers =>
				prevUsers.map(user =>
					user.id === userId ? { ...user, role: newRole } : user
				)
			)

			const { error } = await supabase
				.from('users')
				.update({ role: newRole })
				.eq('id', userId)

			if (error) {
				console.error('Error updating user role:', error)
				Alert.alert('Error', 'Failed to update user role. Please try again.')
				// Revert the optimistic update
				setUsers(prevUsers =>
					prevUsers.map(user =>
						user.id === userId ? { ...user, role: user.role } : user
					)
				)
			}
		},
		[]
	)

	const renderUser = useCallback(
		({ item }: { item: User }) => (
			<View style={styles.userItem}>
				<View style={styles.userInfo}>
					<Text style={styles.userName}>{item.name || 'N/A'}</Text>
					<Text style={styles.userEmail}>{item.email}</Text>
					<Text style={styles.userRole}>Current Role: {item.role}</Text>
				</View>
				<View style={styles.rolePicker}>
					<RNPickerSelect
						onValueChange={value => handleChangeRole(item.id, value as Role)}
						items={[
							{ label: 'User', value: 'user' },
							{ label: 'Seller', value: 'seller' },
							{ label: 'Admin', value: 'admin' }
						]}
						value={item.role}
						style={pickerSelectStyles}
					/>
				</View>
			</View>
		),
		[handleChangeRole]
	)

	const renderTab = useCallback(
		(tab: Role) => (
			<TouchableOpacity
				style={[styles.tab, activeTab === tab && styles.activeTab]}
				onPress={() => setActiveTab(tab)}>
				<Text
					style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
					{tab.charAt(0).toUpperCase() + tab.slice(1)}s
				</Text>
			</TouchableOpacity>
		),
		[activeTab]
	)

	const onRefresh = useCallback(async () => {
		setIsRefreshing(true)
		await fetchUsers()
		setIsRefreshing(false)
	}, [fetchUsers])

	if (isLoading) {
		return (
			<View style={[styles.container, styles.centered]}>
				<ActivityIndicator size='large' color='#0a7ea4' />
			</View>
		)
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<Text style={styles.title}>User Management</Text>
			<View style={styles.tabContainer}>
				{renderTab('user')}
				{renderTab('seller')}
				{renderTab('admin')}
			</View>
			<View style={styles.searchContainer}>
				<Ionicons
					name='search'
					size={24}
					color='#666'
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder='Search by name or email'
					value={searchQuery}
					onChangeText={setSearchQuery}
				/>
				<TouchableOpacity
					style={styles.sortButton}
					onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
					<Ionicons
						name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
						size={24}
						color='white'
					/>
				</TouchableOpacity>
			</View>
			<FlatList
				data={filteredUsers}
				renderItem={renderUser}
				keyExtractor={item => item.id}
				refreshControl={
					<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
				}
				ListEmptyComponent={
					<Text style={styles.emptyListText}>No users found</Text>
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
		backgroundColor: '#f8f9fa'
	},
	centered: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	title: {
		fontSize: 28,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#333'
	},
	tabContainer: {
		flexDirection: 'row',
		marginBottom: 20,
		backgroundColor: '#e0e0e0',
		borderRadius: 10,
		overflow: 'hidden'
	},
	tab: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center'
	},
	activeTab: {
		backgroundColor: '#0a7ea4'
	},
	tabText: {
		fontWeight: 'bold',
		color: '#666'
	},
	activeTabText: {
		color: 'white'
	},
	searchContainer: {
		flexDirection: 'row',
		marginBottom: 15,
		backgroundColor: 'white',
		borderRadius: 25,
		padding: 10,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	searchIcon: {
		marginRight: 10
	},
	searchInput: {
		flex: 1,
		fontSize: 16
	},
	sortButton: {
		backgroundColor: '#0a7ea4',
		padding: 10,
		borderRadius: 20,
		marginLeft: 10
	},
	userItem: {
		backgroundColor: 'white',
		padding: 15,
		borderRadius: 10,
		marginBottom: 15,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3
	},
	userInfo: {
		flex: 1
	},
	userName: {
		fontSize: 18,
		fontWeight: 'bold',
		color: '#333'
	},
	userEmail: {
		fontSize: 14,
		color: '#666',
		marginBottom: 5
	},
	userRole: {
		fontSize: 14,
		color: '#0a7ea4',
		fontStyle: 'italic'
	},
	rolePicker: {
		width: 120
	},
	emptyListText: {
		textAlign: 'center',
		fontSize: 16,
		color: '#666',
		marginTop: 20
	}
})

const pickerSelectStyles = StyleSheet.create({
	inputIOS: {
		fontSize: 16,
		paddingVertical: 12,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: '#0a7ea4',
		borderRadius: 4,
		color: '#0a7ea4',
		paddingRight: 30
	},
	inputAndroid: {
		fontSize: 16,
		paddingHorizontal: 10,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: '#0a7ea4',
		borderRadius: 8,
		color: '#0a7ea4',
		paddingRight: 30
	}
})
