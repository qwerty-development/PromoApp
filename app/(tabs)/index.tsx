import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  TextInput,
  View,
  RefreshControl,
  ActivityIndicator,
  Image,
  FlatList,
  Dimensions,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useDebounce } from 'use-debounce';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import TimeLeftTag from '../../components/TimeLeftTag';
import { Colors } from '@/constants/Colors';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Promotion {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  quantity: number;
  used_quantity: number;
  pending: number;
  original_price: number | null;
  promotional_price: number;
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
  icon: string;
}

const FEATURED_ITEM_SIZE = width / 1.8;
const ITEMS_PER_PAGE = 10;

export default function HomeScreen() {
  const [allPromotions, setAllPromotions] = useState<Promotion[]>([]);
  const [filteredPromotions, setFilteredPromotions] = useState<Promotion[]>([]);
  const [featuredPromotions, setFeaturedPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedIndustry, setSelectedIndustry] = useState<number | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const fetchPromotions = async (
    pageNumber: number,
    query: string = '',
    industryId: number | null = null
  ) => {
    setLoadingMore(true);
    let promotionsQuery = supabase
      .from('promotions')
      .select(
        `
        *,
        seller:users (id, contact_number, business_name, business_logo),
        industry:industries (id, name)
      `,
        { count: 'exact' }
      )
      .eq('is_approved', true);

    if (query) {
      promotionsQuery = promotionsQuery.or(
        `title.ilike.%${query}%,description.ilike.%${query}%,seller.business_name.ilike.%${query}%`
      );
    }

    if (industryId !== null) {
      promotionsQuery = promotionsQuery.eq('industry_id', industryId);
    }

    promotionsQuery = promotionsQuery.order('created_at', { ascending: false });

    try {
      const { count } = await promotionsQuery;

      const totalItems = count || 0;
      const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
      const safePage = Math.min(pageNumber, totalPages);
      const startRange = safePage * ITEMS_PER_PAGE;
      const endRange = Math.min(
        (safePage + 1) * ITEMS_PER_PAGE - 1,
        totalItems - 1
      );

      const { data, error } = await promotionsQuery.range(startRange, endRange);

      if (error) {
        console.error('Error fetching promotions:', error);
      } else {
        if (pageNumber === 0) {
          setAllPromotions(data);
          setFilteredPromotions(data);
          setFeaturedPromotions(data.slice(0, 5));
        } else {
          setAllPromotions(prevPromotions => [...prevPromotions, ...data]);
          setFilteredPromotions(prevPromotions => [...prevPromotions, ...data]);
        }
        setHasMore(data.length === ITEMS_PER_PAGE);
      }
    } catch (error) {
      console.error('Error in fetchPromotions:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };


  const fetchIndustries = async () => {
    const { data, error } = await supabase
      .from('industries')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching industries:', error);
    } else {
      setIndustries(
        data.map(industry => ({
          ...industry,
          icon: getIndustryIcon(industry.name),
        }))
      );
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await Promise.all([
      fetchPromotions(0, debouncedSearchQuery, selectedIndustry),
      fetchIndustries(),
    ]);
    setRefreshing(false);
  }, [debouncedSearchQuery, selectedIndustry]);

  useEffect(() => {
    fetchPromotions(0);
    fetchIndustries();
  }, []);

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchPromotions(0, debouncedSearchQuery, selectedIndustry);
  }, [debouncedSearchQuery, selectedIndustry]);

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path; // If it's already a full URL, return it as is
    const { data } = supabase.storage
      .from('logos') // Change this to 'logos' for business logos
      .getPublicUrl(path);
    return data?.publicUrl;
  };
  const handlePromotionPress = (id: number) => {
    router.push(`/promotion/${id}`);
  };

  const getIndustryIcon = (name: string) => {
    const iconMap: { [key: string]: string } = {
      Food: 'utensils',
      Technology: 'laptop',
      Fashion: 'tshirt',
      Pharmaceuticals: 'pills',
      Health: 'heartbeat',
      Retail: 'store',
      Automotive: 'car',
      Entertainment: 'film',
      Electronics: 'microchip',
      Manufacturing: 'industry',
      LegalServices: 'balance-scale',
      Finance: 'money-bill-wave',
      Education: 'graduation-cap',
      Healthcare: 'hospital',
      Hospitality: 'hotel',
      RealEstate: 'home',
      Energy: 'bolt',
      Agriculture: 'leaf',
      Transport: 'truck',
      Construction: 'hard-hat',
      Telecommunications: 'satellite-dish',
    };
    return iconMap[name] || 'briefcase';
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleIndustryPress = (industryId: number) => {
    setSelectedIndustry(selectedIndustry === industryId ? null : industryId);
  };

  const loadMorePromotions = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPromotions(nextPage, debouncedSearchQuery, selectedIndustry);
    }
  };

  const calculateSavings = (originalPrice: number | null, promotionalPrice: number | null) => {
    if (originalPrice && promotionalPrice && originalPrice > promotionalPrice) {
      return ((originalPrice - promotionalPrice) / originalPrice) * 100;
    }
    return null;
  };

  const renderFeaturedPromotion = ({ item }: { item: Promotion }) => {
    const bannerUrl = getPublicUrl(item.banner_url);
    const savings = calculateSavings(item.original_price, item.promotional_price);

    return (
      <View>
        <TouchableOpacity
          onPress={() => handlePromotionPress(item.id)}
          style={styles.featuredPromotionItem}
        >
          <Image
            source={{ uri: bannerUrl ?? undefined }}
            style={styles.featuredPromotionImage}
          />
          {savings !== null && (
            <View style={[styles.savingsTagSmall, { backgroundColor: colors.accent }]}>
              <ThemedText style={[styles.savingsText, { color: colors.background }]}>
                Save {savings.toFixed(0)}%
              </ThemedText>
            </View>
          )}
          <View style={[styles.businessLogoContainer, { backgroundColor: colors.background }]}>
            <Image
              source={{ uri: getPublicUrl(item.seller.business_logo) ?? undefined }}
              style={styles.businessLogo}
            />
            <ThemedText style={[styles.featuredPromotionBusiness, { color: colors.text }]}>
              {item.seller.business_name}
            </ThemedText>
          </View>
          <View style={[styles.industryContainer, { backgroundColor: colors.secondary }]}>
            <FontAwesome5 name={getIndustryIcon(item.industry.name)} size={12} color={colors.background} />
            <ThemedText style={[styles.industryName, { color: colors.background }]}>{item.industry.name}</ThemedText>
          </View>
        </TouchableOpacity>

        <View style={styles.promotionDetailsContainer}>
          <ThemedText style={[styles.featuredPromotionTitle, { color: colors.text }]}>
            {item.title}
          </ThemedText>

        </View>
      </View>

    );
  };

  const renderPromotion = ({ item }: { item: Promotion }) => {
    const bannerUrl = getPublicUrl(item.banner_url);
    const businessLogoUrl = getPublicUrl(item.seller.business_logo);
    const remainingQuantity = item.quantity - item.used_quantity;
    const waitingForScan = item.pending;
    const isLowQuantity = remainingQuantity <= 20;
    const savings = calculateSavings(item.original_price, item.promotional_price);

    return (
      <TouchableOpacity onPress={() => handlePromotionPress(item.id)}>
        <ThemedView style={[styles.promotionItem, { backgroundColor: colors.card }]}>
          <Image
            source={{ uri: bannerUrl ?? undefined }}
            style={styles.promotionBanner}
          />
          <View>
          </View>
          <View style={styles.timeLeftContainer}>
            <TimeLeftTag endDate={item.end_date} />
          </View>

          <View style={styles.promotionContent}>
            <ThemedText style={[styles.promotionTitle, { color: colors.text }]}>{item.title}</ThemedText>
            <View style={styles.priceContainer}>
              {item.original_price !== null && (
                <ThemedText style={[styles.originalPrice, { color: colors.text }]}>${item.original_price.toFixed(2)}</ThemedText>
              )}
              {item.promotional_price !== null && (
                <ThemedText style={[styles.promotionalPrice, { color: colors.primary }]}>${item.promotional_price.toFixed(2)}</ThemedText>
              )}
              {savings !== null && (
                <View style={[styles.savingsTag, { backgroundColor: colors.accent }]}>
                  <ThemedText style={[styles.savingsText, { color: colors.background }]}>Save {savings.toFixed(0)}%</ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={[styles.promotionDescription, { color: colors.text }]} numberOfLines={2}>
              {item.description}
            </ThemedText>

            <View style={[styles.quantityInfo, { borderColor: colors.border }]}>
              <View style={styles.quantityItem}>
                <FontAwesome5 name="users" size={14} color={colors.text} style={styles.quantityIcon} />
                <ThemedText style={[styles.quantityText, { color: colors.text }]}>
                  Claimed: {remainingQuantity} out of {item.quantity}
                </ThemedText>
                {isLowQuantity && <ThemedText style={styles.fireEmoji}>🔥</ThemedText>}
              </View>
              <View style={styles.quantityItem}>
                <FontAwesome5 name="clock" size={14} color={colors.primary} style={styles.quantityIcon} />
                <ThemedText style={[styles.quantityText, { color: colors.text }]}>
                  Pending: {waitingForScan}
                </ThemedText>
              </View>
            </View>
            <View style={styles.promotionFooter}>

              <View style={styles.businessInfo}>
                {businessLogoUrl ? (
                  <Image
                    source={{ uri: businessLogoUrl }}
                    style={styles.businessLogoBig}
                  />
                ) : (
                  <View style={[styles.businessLogoBig, { backgroundColor: colors.primary }]}>
                    <ThemedText style={[styles.businessLogoPlaceholder, { color: colors.background }]}>
                      {item.seller.business_name.charAt(0)}
                    </ThemedText>
                  </View>
                )}
                <ThemedText style={[styles.businessNameBig, { color: colors.text }]}>
                  {item.seller.business_name}
                </ThemedText>
              </View>
              <View style={[styles.industryBadge, { backgroundColor: colors.secondary }]}>
                <FontAwesome5 name={getIndustryIcon(item.industry.name)} size={12} color={colors.background} />
                <ThemedText style={[styles.industryName, { color: colors.background }]}>{item.industry.name}</ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <SafeAreaView>
        <BlurView  style={[styles.searchContainer, { backgroundColor: colors.border }]}>
          <FontAwesome5
            name="search"
            size={20}
            color={colors.text}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search promotions..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={colors.text}
          />
        </BlurView>

        <View style={styles.categoriesContainer}>
          <FlatList
            data={industries}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.industryFilter,
                  selectedIndustry === item.id && styles.selectedIndustryFilter,
                  { backgroundColor: selectedIndustry === item.id ? colors.tint : colors.border }
                ]}
                onPress={() => handleIndustryPress(item.id)}
              >
                <FontAwesome5
                  name={getIndustryIcon(item.name)}
                  size={20}
                  color={
                    selectedIndustry === item.id
                      ? colors.background
                      : colors.text
                  }
                />
                <ThemedText
                  style={[
                    styles.industryFilterText,
                    selectedIndustry === item.id && styles.selectedIndustryFilterText,
                    { color: selectedIndustry === item.id ? colors.background : colors.text }
                  ]}
                >
                  {item.name}
                </ThemedText>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.industryFilterList}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : (
          <FlatList
            data={filteredPromotions}
            renderItem={renderPromotion}
            keyExtractor={item => item.id.toString()}
            onEndReached={loadMorePromotions}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooter}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListHeaderComponent={
              <>
                <View style={styles.sectionContainer}>
                  <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                    Featured Promotions
                  </ThemedText>
                  <FlatList
                    data={featuredPromotions}
                    renderItem={renderFeaturedPromotion}
                    keyExtractor={item => `featured-${item.id}`}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.featuredList}
                  />
                </View>
                <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
                  All Promotions
                </ThemedText>
              </>
            }
            ListEmptyComponent={
              <ThemedView style={styles.emptyListContainer}>
                <ThemedText style={[styles.emptyListText, { color: colors.text }]}>
                  No promotions found
                </ThemedText>
              </ThemedView>
            }
          />
        )}
        </SafeAreaView>
      </ThemedView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  featuredPromotionItem: {
    width: FEATURED_ITEM_SIZE,
    height: FEATURED_ITEM_SIZE / 2,
    marginRight: 16,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: 'relative',
  },

  featuredPromotionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  businessLogoContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 2,
    borderTopRightRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 0,
    left: 0,
  },

  industryContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    padding: 2,
    borderBottomLeftRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    top: 0,
    right: 0,
  },

  savingsTagSmall: {
    position: 'absolute',
    padding: 2,
    borderTopLeftRadius: 10,
    bottom: 0,
    right: 0,
  },

  promotionDetailsContainer: {
    paddingVertical: 10,
  },

  featuredPromotionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    width: FEATURED_ITEM_SIZE, // Same width as the featured image
    overflow: 'hidden',   // Hides any overflow beyond the width

  },

  featuredPromotionBusiness: {
    fontSize: 12,
    color: Colors.light.background,
  },

  container: {
    flex: 1,
    paddingBottom:140,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginBottom:20,
    marginHorizontal: 16,
    marginVertical: 10,
    height: 50,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  industryFilterList: {
    paddingLeft: 16,
  },
  industryFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom:10,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedIndustryFilter: {
    backgroundColor: Colors.light.tint,
  },
  timeLeftContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  industryFilterText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  selectedIndustryFilterText: {
    color: Colors.light.background,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    marginLeft: 16,
  },
  featuredList: {
    paddingLeft: 16,
  },




  promotionItem: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  promotionBanner: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  promotionContent: {
    padding: 15,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  promotionDescription: {
    fontSize: 14,
    marginBottom: 10,
    opacity: 0.7,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    opacity: 0.7,
    marginRight: 8,
  },
  promotionalPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  savingsTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  savingsText: {
    fontWeight: 'bold',
    fontSize: 12,
  },

  businessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareButton: {
    padding: 4,
    marginLeft: 'auto', // This pushes the share button to the end of the line
  },
  businessLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessLogoBig: {
    width: 45,
    height: 45,
    borderRadius: 20,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  businessLogoPlaceholder: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  businessName: {
    fontSize: 14,
    fontWeight: '500',
  },
  businessNameBig: {
    fontSize: 16,
    fontWeight: '500',
  },
  industryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  industryName: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyListContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    opacity: 0.6,
  },
  footerLoader: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInfo: {
    justifyContent: 'space-between',
    marginBottom: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  quantityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  quantityIcon: {
    marginRight: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fireEmoji: {
    fontSize: 16,
    marginLeft: 4,
  },
});