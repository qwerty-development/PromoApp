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
  RefreshControl,
  useColorScheme
} from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { supabase } from '@/lib/supabase'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Colors, ColorScheme } from '@/constants/Colors'

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

  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme

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
      <BlurView intensity={80}  style={styles(colors).userItem}>
        <View style={styles(colors).userInfo}>
          <Text style={styles(colors).userName}>{item.name || 'N/A'}</Text>
          <Text style={styles(colors).userEmail}>{item.email}</Text>
          <Text style={styles(colors).userRole}>Current Role: {item.role}</Text>
        </View>
        <View style={styles(colors).rolePicker}>
          <RNPickerSelect
            onValueChange={value => handleChangeRole(item.id, value as Role)}
            items={[
              { label: 'User', value: 'user' },
              { label: 'Seller', value: 'seller' },
              { label: 'Admin', value: 'admin' }
            ]}
            value={item.role}
            style={pickerSelectStyles(colors)}
          />
        </View>
      </BlurView>
    ),
    [handleChangeRole, colors, colorScheme]
  )

  const renderTab = useCallback(
    (tab: Role) => (
      <TouchableOpacity
        style={[styles(colors).tab, activeTab === tab && styles(colors).activeTab]}
        onPress={() => setActiveTab(tab)}>
        <Text
          style={[styles(colors).tabText, activeTab === tab && styles(colors).activeTabText]}>
          {tab.charAt(0).toUpperCase() + tab.slice(1)}s
        </Text>
      </TouchableOpacity>
    ),
    [activeTab, colors]
  )

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await fetchUsers()
    setIsRefreshing(false)
  }, [fetchUsers])

  if (isLoading) {
    return (
      <View style={[styles(colors).container, styles(colors).centered]}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles(colors).container]}>
      <View style={styles(colors).tabContainer}>
        {renderTab('user')}
        {renderTab('seller')}
        {renderTab('admin')}
      </View>
      <View style={styles(colors).searchContainer}>
        <Ionicons
          name='search'
          size={24}
          color={colors.text}
          style={styles(colors).searchIcon}
        />
        <TextInput
          style={styles(colors).searchInput}
          placeholder='Search by name or email'
          placeholderTextColor={colors.tabIconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles(colors).sortButton}
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
          <Ionicons
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'}
            size={24}
            color={colors.card}
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
          <Text style={styles(colors).emptyListText}>No users found</Text>
        }
        contentContainerStyle={styles(colors).listContent}
      />
    </View>
  )
}

const styles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.card,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginVertical: 20,
    backgroundColor: colors.card,
    borderRadius: 25,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: 'bold',
    color: colors.text,
  },
  activeTabText: {
    color: colors.card,
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    backgroundColor: colors.card,
    borderRadius: 25,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  sortButton: {
    backgroundColor: colors.primary,
    padding: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  userItem: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 5,
  },
  userRole: {
    fontSize: 14,
    color: colors.secondary,
    fontStyle: 'italic',
  },
  rolePicker: {
    width: 120,
  },
  emptyListText: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.text,
    marginTop: 20,
  },
  listContent: {
    paddingHorizontal: 20,
  },
})

const pickerSelectStyles = (colors: ColorScheme) => StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    color: colors.text,
    paddingRight: 30,
    backgroundColor: colors.card,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    color: colors.text,
    paddingRight: 30,
    backgroundColor: colors.card,
  },
})