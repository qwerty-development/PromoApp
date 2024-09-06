import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

type Role = 'user' | 'seller' | 'admin';

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<Role>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterAndSortUsers();
  }, [users, activeTab, searchQuery, sortOrder]);

  async function fetchUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data);
    }
  }

  function filterAndSortUsers() {
    let filtered = users.filter(user => user.role === activeTab);
    
    if (searchQuery) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    setFilteredUsers(filtered);
  }

  async function handleChangeRole(userId: string, newRole: Role) {
    const { error } = await supabase
      .from('users')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      Alert.alert('Error', 'Failed to update user role');
    } else {
      fetchUsers();
      Alert.alert('Success', 'User role updated');
    }
  }

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <Text style={styles.userEmail}>{item.email}</Text>
      <Text style={styles.userRole}>Current Role: {item.role}</Text>
      <RNPickerSelect
        onValueChange={(value) => handleChangeRole(item.id, value as Role)}
        items={[
          { label: 'User', value: 'user' },
          { label: 'Seller', value: 'seller' },
          { label: 'Admin', value: 'admin' },
        ]}
        value={item.role}
        style={pickerSelectStyles}
      />
    </View>
  );

  const renderTab = (tab: Role) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={styles.tabText}>{tab.charAt(0).toUpperCase() + tab.slice(1)}s</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>User Management</Text>
      <View style={styles.tabContainer}>
        {renderTab('user')}
        {renderTab('seller')}
        {renderTab('admin')}
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by email"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        >
          <Text style={styles.sortButtonText}>
            Sort {sortOrder === 'asc' ? '↑' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    padding: 10,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0a7ea4',
  },
  tabText: {
    fontWeight: 'bold',
    color: 'black',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  sortButton: {
    backgroundColor: '#0a7ea4',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
  },
  sortButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  userItem: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userRole: {
    marginBottom: 10,
    fontStyle: 'italic',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 4,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: 'purple',
    borderRadius: 8,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
});