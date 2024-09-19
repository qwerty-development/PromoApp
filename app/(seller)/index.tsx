import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  useColorScheme,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {askForNotificationPermission} from '../../lib/notification'
 
interface Promotion {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  is_approved: boolean;
  industries: {
    name: string;
  } | null;
  quantity: number;
  used_quantity: number;
  pending: number;
  original_price: number;
  promotional_price: number;
  unique_code: string;
}

type SortOrder = 'asc' | 'desc';

export default function MyPromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const { user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();

  const isDarkMode = colorScheme === 'dark';

  const fetchPromotions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('promotions')
      .select('*, industries(name)')
      .eq('seller_id', user.id);

    if (error) {
      console.error('Error fetching promotions:', error);
      Alert.alert('Error', 'Failed to fetch promotions');
    } else {
      setPromotions(data as Promotion[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      async function requestNotificationPermission() {
        const token = await askForNotificationPermission();
        if (token) {
          // Save the push token in your backend (Supabase, for example)
          await savePushToken(token);
        }
      }

      requestNotificationPermission();
      fetchPromotions();
    }
  }, [user, fetchPromotions]);

  // Function to save the push token to the backend
  async function savePushToken(token: string) {
    if (!user) return;
    const { error } = await supabase
      .from('users')  // Assuming you have a 'users' table with a 'push_token' field
      .update({ push_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving push token:', error);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPromotions();
  }, [fetchPromotions]);



  const handleDelete = useCallback(async (id: string) => {
    Alert.alert(
      "Delete Promotion",
      "Are you sure you want to delete this promotion?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const { error } = await supabase
              .from('promotions')
              .delete()
              .eq('id', id);

            if (error) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Error', 'Failed to delete promotion');
            } else {
              fetchPromotions();
              Alert.alert('Success', 'Promotion deleted successfully');
            }
          }
        }
      ]
    );
  }, [fetchPromotions]);

  const handleEdit = useCallback((item: Promotion) => {
    router.push({
      pathname: '/edit-promotion',
      params: { id: item.id }
    });
  }, [router]);

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prevOrder => prevOrder === 'asc' ? 'desc' : 'asc');
  }, []);

  const filteredAndSortedPromotions = useMemo(() => {
    return promotions
      .filter(promo => 
        promo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [promotions, searchQuery, sortOrder]);

  const renderPromotion = useCallback(({ item }: { item: Promotion }) => {
    const discountPercentage = ((item.original_price - item.promotional_price) / item.original_price) * 100;
    const daysLeft = Math.max(0, Math.ceil((new Date(item.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <View style={[styles.promotionItem, isDarkMode && styles.promotionItemDark]}>
        <View style={styles.bannerContainer}>
          <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
          <View style={styles.daysLeftBadge}>
            <Text style={styles.daysLeftText}>{daysLeft} days left</Text>
          </View>
        </View>
        <View style={styles.promotionContent}>
          <View style={styles.promotionHeader}>
            <Text style={[styles.promotionTitle, isDarkMode && styles.textDark]} numberOfLines={1}>{item.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.is_approved ? '#4ecdc4' : '#ffd166' }]}>
              <Text style={styles.statusText}>{item.is_approved ? 'Active' : 'Pending'}</Text>
            </View>
          </View>
          
          <View style={styles.priceRow}>
            <Text style={[styles.price, isDarkMode && styles.textDark]}>${item.promotional_price.toFixed(2)}</Text>
            <Text style={styles.discount}>{discountPercentage.toFixed(0)}% OFF</Text>
          </View>
          
          <Text style={[styles.dateRange, isDarkMode && styles.textDark]}>
            {`${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}`}
          </Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={16} color={isDarkMode ? '#61dafb' : '#0a7ea4'} />
              <Text style={[styles.statText, isDarkMode && styles.textDark]}>{item.quantity - item.used_quantity - item.pending} available</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="hourglass-outline" size={16} color={isDarkMode ? '#61dafb' : '#0a7ea4'} />
              <Text style={[styles.statText, isDarkMode && styles.textDark]}>{item.pending} pending</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color={isDarkMode ? '#61dafb' : '#0a7ea4'} />
              <Text style={[styles.statText, isDarkMode && styles.textDark]}>{item.used_quantity} claimed</Text>
            </View>
          </View>
          
          <Text style={[styles.description, isDarkMode && styles.textDark]} numberOfLines={2}>{item.description}</Text>
          
          <Text style={[styles.industry, isDarkMode && styles.textDark]}>
            <Ionicons name="business-outline" size={12} color={isDarkMode ? '#999' : '#666'} /> {item.industries?.name || 'N/A'}
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [handleDelete, handleEdit, isDarkMode]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, isDarkMode && styles.containerDark]}>
        <ActivityIndicator size="large" color={isDarkMode ? '#61dafb' : '#0a7ea4'} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent, isDarkMode && styles.containerDark]}>
        <Text style={[styles.messageText, isDarkMode && styles.textDark]}>Please log in to view your promotions.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={[styles.searchSortContainer, isDarkMode && styles.searchSortContainerDark]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={isDarkMode ? '#999' : '#666'} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.searchInputDark]}
            placeholder="Search promotions..."
            placeholderTextColor={isDarkMode ? '#999' : '#666'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity onPress={toggleSortOrder} style={styles.sortButton}>
          <Ionicons 
            name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
            size={24} 
            color={isDarkMode ? '#61dafb' : '#0a7ea4'} 
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={filteredAndSortedPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={[styles.emptyText, isDarkMode && styles.textDark]}>No promotions found.</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  containerDark: {
    backgroundColor: '#121212',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSortContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  searchSortContainerDark: {
    backgroundColor: '#1e1e1e',
    borderBottomColor: '#333',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#333',
  },
  searchInputDark: {
    backgroundColor: '#333',
    color: '#fff',
  },
  sortButton: {
    marginLeft: 16,
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  promotionItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  promotionItemDark: {
    backgroundColor: '#2a2a2a',
    shadowColor: "#fff",
  },
  bannerContainer: {
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  daysLeftBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysLeftText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  promotionContent: {
    padding: 16,
  },
  promotionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a7ea4',
    marginRight: 8,
  },
  discount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  dateRange: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  industry: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecdc4',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  textDark: {
    color: '#f0f0f0',
  },
});
