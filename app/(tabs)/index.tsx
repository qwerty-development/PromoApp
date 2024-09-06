import React, { useEffect, useState, useCallback } from 'react';
import { Image, StyleSheet, FlatList, useColorScheme, TouchableOpacity, TextInput, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';

interface Promotion {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  seller: {
    id: string;
    contact_number: string;
    business_name: string;
    business_logo: string;
  };
  industry: {
    id: number;
    name: string;
  };
}

interface Industry {
  id: number;
  name: string;
}

export default function HomeScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const fetchPromotions = async () => {
    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        seller:users (id, contact_number, business_name, business_logo),
        industry:industries (id, name)
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
    } else {
      setPromotions(data);
    }
    setLoading(false);
  };

  const fetchIndustries = async () => {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching industries:', error);
    } else {
      setIndustries(data);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPromotions();
    await fetchIndustries();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchIndustries();
  }, []);

  useEffect(() => {
    filterPromotions();
  }, [searchQuery, selectedIndustry, promotions]);

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/promotion-banners\//, '');
    const { data } = supabase.storage.from('promotion-banners').getPublicUrl(cleanPath);
    return data?.publicUrl;
  };

  const filterPromotions = () => {
    let filtered = promotions;
    if (searchQuery) {
      filtered = filtered.filter(promo =>
        promo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.seller.business_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedIndustry) {
      filtered = filtered.filter(promo => promo.industry.id === selectedIndustry);
    }
    setFilteredPromotions(filtered);
  };

  const handlePromotionPress = (id: number) => {
    router.push(`/promotion/${id}`);
  };

  const renderPromotion = ({ item }: { item: Promotion }) => {
    const bannerUrl = getPublicUrl(item.banner_url);
    const businessLogoUrl = getPublicUrl(item.seller.business_logo);

    return (
      <TouchableOpacity onPress={() => handlePromotionPress(item.id)}>
        <ThemedView style={styles.promotionItem}>
          <View style={styles.promotionBannerContainer}>
            {bannerUrl ? (
              <Image
                source={{ uri: bannerUrl }}
                style={styles.promotionBanner}
                resizeMode="cover"
                onError={(e) => console.log('Error loading image:', e.nativeEvent.error)}
              />
            ) : (
              <ThemedView style={styles.noImageContainer}>
                <ThemedText style={styles.noImageText}>No image available</ThemedText>
              </ThemedView>
            )}
          </View>
          <View style={styles.promotionContent}>
            <ThemedText style={styles.promotionTitle}>{item.title}</ThemedText>
            <ThemedText style={styles.promotionDescription}>{item.description}</ThemedText>
            <ThemedText style={styles.promotionDates}>
              {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
            </ThemedText>
            <View style={styles.businessInfo}>
              {businessLogoUrl ? (
                <Image
                  source={{ uri: businessLogoUrl }}
                  style={styles.businessLogo}
                  resizeMode="cover"
                  onError={(e) => console.log('Error loading business logo:', e.nativeEvent.error)}
                />
              ) : (
                <View style={[styles.businessLogo, styles.noLogoPlaceholder]} />
              )}
              <ThemedText style={styles.businessName}>{item.seller.business_name}</ThemedText>
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaProvider>
      <ThemedView style={styles.container}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={24} color={colors.text} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search promotions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.text}
          />
        </View>

        <FlatList
          data={industries}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.industryFilter,
                selectedIndustry === item.id && styles.selectedIndustryFilter
              ]}
              onPress={() => setSelectedIndustry(selectedIndustry === item.id ? null : item.id)}
            >
              <ThemedText style={styles.industryFilterText}>{item.name}</ThemedText>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          style={styles.industryFilterList}
        />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <FlatList
            data={filteredPromotions}
            renderItem={renderPromotion}
            keyExtractor={(item) => item.id.toString()}
            style={styles.promotionsList}
            contentContainerStyle={styles.promotionsListContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <ThemedView style={styles.emptyListContainer}>
                <ThemedText style={styles.emptyListText}>No promotions found</ThemedText>
              </ThemedView>
            }
          />
        )}
      </ThemedView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0,
    padding: 16,
    marginBottom:64,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  industryFilterList: {
    marginBottom: 16,
  },
  industryFilter: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedIndustryFilter: {
    backgroundColor: '#0a7ea4',
  },
  industryFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  promotionsList: {
  },
  promotionsListContent: {
    paddingBottom: 24,
  },
  promotionItem: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  promotionBannerContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
  },
  promotionBanner: {
    width: '100%',
    height: 150,
  },
  promotionContent: {
    padding: 16,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  promotionDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  promotionDates: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '500',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#888',
  },
  noLogoPlaceholder: {
    backgroundColor: '#ddd',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyListText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#888',
  },
});