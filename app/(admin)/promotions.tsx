import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, useColorScheme } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, ColorScheme } from '@/constants/Colors';

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

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme;

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
    <BlurView intensity={80}  style={styles(colors).promotionItem}>
      <Text style={styles(colors).promotionTitle}>{item.title}</Text>
      <Text style={styles(colors).promotionDescription}>{item.description}</Text>
      <Text style={[styles(colors).promotionStatus, item.is_approved ? styles(colors).statusApproved : styles(colors).statusPending]}>
        Status: {item.is_approved ? 'Approved' : 'Pending'}
      </Text>
      <View style={styles(colors).buttonContainer}>
        <TouchableOpacity
          style={[styles(colors).button, styles(colors).approveButton]}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles(colors).buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(colors).button, styles(colors).declineButton]}
          onPress={() => handleDecline(item.id)}
        >
          <Text style={styles(colors).buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </BlurView>
  );

  return (
    <View style={styles(colors).container}>
      
      <View style={styles(colors).tabContainer}>
        <TouchableOpacity
          style={[styles(colors).tab, activeTab === 'all' && styles(colors).activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles(colors).tabText, activeTab === 'all' && styles(colors).activeTabText]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(colors).tab, activeTab === 'pending' && styles(colors).activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles(colors).tabText, activeTab === 'pending' && styles(colors).activeTabText]}>Pending</Text>
        </TouchableOpacity>
      </View>

      <View style={styles(colors).filterContainer}>
        <View style={styles(colors).searchContainer}>
          <Ionicons name="search" size={24} color={colors.text} style={styles(colors).searchIcon} />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search promotions..."
            placeholderTextColor={colors.tabIconDefault}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles(colors).pickerContainer}>
          <RNPickerSelect
            onValueChange={(value) => setSelectedIndustry(value)}
            items={[
              { label: 'All Industries', value: null },
              ...industries.map((industry) => ({
                label: industry.name,
                value: industry.id,
              })),
            ]}
            style={pickerSelectStyles(colors)}
            value={selectedIndustry}
            placeholder={{ label: 'Select an industry', value: null }}
          />
        </View>
      </View>

      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id.toString()}
        style={styles(colors).list}
        contentContainerStyle={styles(colors).listContent}
      />
    </View>
  );
}

const styles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
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
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  activeTabText: {
    color: colors.card,
  },
  filterContainer: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  pickerContainer: {
    width: 150,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  promotionItem: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: colors.text,
  },
  promotionDescription: {
    marginBottom: 10,
    color: colors.text,
  },
  promotionStatus: {
    fontStyle: 'italic',
    marginBottom: 10,
  },
  statusApproved: {
    color: colors.success,
  },
  statusPending: {
    color: colors.warning,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    padding: 10,
    borderRadius: 20,
    width: '48%',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.card,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

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
});