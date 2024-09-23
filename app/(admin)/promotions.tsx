import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, TextInput, useColorScheme, Image, ActivityIndicator } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, ColorScheme } from '@/constants/Colors';

interface Promotion {
  id: string;
  seller_id: string;
  industry_id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  is_approved: boolean;
  created_at: string;
  quantity: number;
  used_quantity: number;
  unique_code: string;
  original_price: number;
  promotional_price: number;
  pending: number;
  seller: {
    business_name: string;
    business_logo: string;
  };
  industry: {
    name: string;
  };
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
  const [expandedPromotion, setExpandedPromotion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme;

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        seller:users (business_name, business_logo),
        industry:industries (name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching promotions:', error);
    } else {
      setPromotions(data || []);
    }
    setLoading(false);
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
        promo.description.toLowerCase().includes(query) ||
        promo.seller.business_name.toLowerCase().includes(query)
      );
    }

    setFilteredPromotions(filtered);
  }

  async function handleApprove(promotion: Promotion) {
    const { error } = await supabase
      .from('promotions')
      .update({ is_approved: true })
      .eq('id', promotion.id);

    if (error) {
      console.error('Error approving promotion:', error);
      Alert.alert('Error', 'Failed to approve promotion');
    } else {
      await sendNotificationToSeller(promotion, true);
      fetchPromotions();
      Alert.alert('Success', 'Promotion approved');
    }
  }

  async function handleDecline(promotion: Promotion) {
    const { error } = await supabase
      .from('promotions')
      .update({ is_approved: false })
      .eq('id', promotion.id);

    if (error) { 
      console.error('Error declining promotion:', error);
      Alert.alert('Error', 'Failed to decline promotion');
    } else {
      await sendNotificationToSeller(promotion, false);
      fetchPromotions();
      Alert.alert('Success', 'Promotion declined');
    }
  }

  async function sendNotificationToSeller(promotion: Promotion, isApproved: boolean) {
    const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', promotion.seller_id)
      .single();

    if (sellerError || !sellerData?.push_token) {
      console.error('Error fetching seller push token:', sellerError);
      return;
    }

    const message = {
      to: sellerData.push_token,
      sound: 'default',
      title: isApproved ? 'Promotion Approved!' : 'Promotion Declined',
      body: `Your promotion "${promotion.title}" has been ${isApproved ? 'approved' : 'declined'}.`,
      data: { promotionId: promotion.id },
    };

    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  const renderPromotion = ({ item }: { item: Promotion }) => (
    <BlurView intensity={80} tint={colorScheme} style={styles(colors).promotionItem}>
      <TouchableOpacity onPress={() => setExpandedPromotion(expandedPromotion === item.id ? null : item.id)}>
        <View style={styles(colors).promotionHeader}>
          <Image 
            source={{ uri: item.seller.business_logo || 'https://via.placeholder.com/50' }} 
            style={styles(colors).sellerLogo} 
          />
          <View style={styles(colors).promotionHeaderText}>
            <Text style={styles(colors).promotionTitle}>{item.title}</Text>
            <Text style={styles(colors).sellerName}>{item.seller.business_name}</Text>
          </View>
          <View style={[styles(colors).statusBadge, item.is_approved ? styles(colors).approvedBadge : styles(colors).pendingBadge]}>
            <Text style={styles(colors).statusText}>{item.is_approved ? 'Approved' : 'Pending'}</Text>
          </View>
        </View>
        
        <Text style={styles(colors).promotionDescription} numberOfLines={expandedPromotion === item.id ? undefined : 2}>
          {item.description}
        </Text>

        {expandedPromotion === item.id && (
          <View style={styles(colors).expandedDetails}>
            <Image source={{ uri: item.banner_url }} style={styles(colors).bannerImage} />
            
            <View style={styles(colors).detailRow}>
              <View style={styles(colors).detailItem}>
                <FontAwesome5 name="calendar-alt" size={16} color={colors.text} />
                <Text style={styles(colors).detailText}>
                  {new Date(item.start_date).toLocaleDateString()} - {new Date(item.end_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles(colors).detailItem}>
                <FontAwesome5 name="tag" size={16} color={colors.text} />
                <Text style={styles(colors).detailText}>{item.industry.name}</Text>
              </View>
            </View>

            <View style={styles(colors).detailRow}>
              <View style={styles(colors).detailItem}>
                <FontAwesome5 name="box" size={16} color={colors.text} />
                <Text style={styles(colors).detailText}>
                  Quantity: {item.quantity} (Used: {item.used_quantity}, Pending: {item.pending})
                </Text>
              </View>
            </View>

            <View style={styles(colors).detailRow}>
              <View style={styles(colors).detailItem}>
                <FontAwesome5 name="dollar-sign" size={16} color={colors.text} />
                <Text style={styles(colors).detailText}>
                  Original: ${item.original_price.toFixed(2)} | Promo: ${item.promotional_price.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles(colors).detailRow}>
              <View style={styles(colors).detailItem}>
                <FontAwesome5 name="barcode" size={16} color={colors.text} />
                <Text style={styles(colors).detailText}>Code: {item.unique_code}</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles(colors).buttonContainer}>
        <TouchableOpacity
          style={[styles(colors).button, styles(colors).approveButton]}
          onPress={() => handleApprove(item)}
        >
          <Text style={styles(colors).buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles(colors).button, styles(colors).declineButton]}
          onPress={() => handleDecline(item)}
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

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles(colors).loader} />
      ) : (
        <FlatList
          data={filteredPromotions}
          renderItem={renderPromotion}
          keyExtractor={(item) => item.id}
          style={styles(colors).list}
          contentContainerStyle={styles(colors).listContent}
        />
      )}
    </View>
  );
}

const styles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  promotionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sellerLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  promotionHeaderText: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  sellerName: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10,
  },
  approvedBadge: {
    backgroundColor: colors.success,
  },
  pendingBadge: {
    backgroundColor: colors.warning,
  },
  statusText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 12,
  },
  promotionDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  expandedDetails: {
    marginTop: 10,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  declineButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.background,
    fontWeight: 'bold',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
iconContainer: {
  top: 10,
  right: 12,
},
});