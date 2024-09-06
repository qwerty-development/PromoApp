import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Promotion {
  id: number;
  title: string;
  description: string;
  is_approved: boolean;
  industry_id: number;
}

interface Industry {
  id: number;
  name: string;
}

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  const fetchPromotions = useCallback(async () => {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
    } else {
      setPromotions(data || []);
    }
  }, []);

  const fetchIndustries = useCallback(async () => {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching industries:', error);
    } else {
      setIndustries(data || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPromotions();
      fetchIndustries();
    }, [fetchPromotions, fetchIndustries])
  );

  useEffect(() => {
    filterPromotions();
  }, [promotions, selectedIndustry, searchQuery, activeTab]);

  function filterPromotions() {
    let filtered = promotions;

    if (activeTab === 'pending') {
      filtered = filtered.filter(promo => !promo.is_approved);
    }

    if (selectedIndustry !== null) {
      filtered = filtered.filter(promo => promo.industry_id === selectedIndustry);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(promo =>
        promo.title.toLowerCase().includes(query) ||
        promo.description.toLowerCase().includes(query)
      );
    }

    setFilteredPromotions(filtered);
  }

  async function handleApprove(id: number) {
    const { error } = await supabase
      .from('promotions')
      .update({ is_approved: true })
      .eq('id', id);

    if (error) {
      console.error('Error approving promotion:', error);
      Alert.alert('Error', 'Failed to approve promotion');
    } else {
      fetchPromotions();
      Alert.alert('Success', 'Promotion approved');
    }
  }

  async function handleDecline(id: number) {
    const { error } = await supabase
      .from('promotions')
      .update({ is_approved: false })
      .eq('id', id);

    if (error) {
      console.error('Error declining promotion:', error);
      Alert.alert('Error', 'Failed to decline promotion');
    } else {
      fetchPromotions();
      Alert.alert('Success', 'Promotion declined');
    }
  }

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <View style={styles.promotionItem}>
      <Text style={styles.promotionTitle}>{item.title}</Text>
      <Text style={styles.promotionDescription}>{item.description}</Text>
      <Text style={[styles.promotionStatus, item.is_approved ? styles.statusApproved : styles.statusPending]}>
        Status: {item.is_approved ? 'Approved' : 'Pending'}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.declineButton]}
          onPress={() => handleDecline(item.id)}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Promotions</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search promotions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.pickerContainer}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedIndustry(value)}
            items={[
              { label: 'All Industries', value: null },
              ...industries.map((industry) => ({
                label: industry.name,
                value: industry.id,
              })),
            ]}
            style={pickerSelectStyles}
            value={selectedIndustry}
            placeholder={{ label: 'Select an industry', value: null }}
          />
        </View>
      </View>

      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
  },
  activeTab: {
    backgroundColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  activeTabText: {
    color: 'white',
  },
  filterContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 5,
    paddingHorizontal: 10,
    marginRight: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  pickerContainer: {
    width: 150,
  },
  list: {
    flex: 1,
  },
  promotionItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  promotionDescription: {
    marginBottom: 10,
    color: '#666',
  },
  promotionStatus: {
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statusApproved: {
    color: 'green',
  },
  statusPending: {
    color: 'orange',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 5,
    width: '48%',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
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