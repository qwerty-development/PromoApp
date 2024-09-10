import React, { useEffect, useState } from 'react';
import { StyleSheet, Linking, Image, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface Promotion {
  pending: number;
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  quantity: number;
  used_quantity: number;
  original_price: number | null;
  promotional_price: number;
  seller: {
    contact_number: string;
    latitude: number;
    longitude: number;
    business_name: string;
    business_logo: string;
  };
}

export default function PromotionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchPromotionDetails();
  }, [id]);

  async function fetchPromotionDetails() {
    try {
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          seller:users (contact_number, latitude, longitude, business_name, business_logo)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setPromotion(data);
      await checkIfClaimedLocally();
      await checkIfClaimedOnServer();
    } catch (error) {
      console.error('Error fetching promotion details:', error);
      Alert.alert('Error', 'Failed to load promotion details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function checkIfClaimedLocally() {
    try {
      const claimedPromotions = await AsyncStorage.getItem('claimedPromotions');
      if (claimedPromotions) {
        const claimedPromotionsArray = JSON.parse(claimedPromotions);
        setIsClaimed(claimedPromotionsArray.includes(id));
      }
    } catch (error) {
      console.error('Error checking local claimed status:', error);
    }
  }

  async function checkIfClaimedOnServer() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('claimed_promotions')
        .select('id')
        .eq('user_id', user.id)
        .eq('promotion_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      const isClaimedOnServer = !!data;
      setIsClaimed(isClaimedOnServer);
      updateLocalClaimedStatus(isClaimedOnServer);
    } catch (error) {
      console.error('Error checking claimed status:', error);
    }
  }

  async function updateLocalClaimedStatus(claimed: boolean) {
    try {
      const claimedPromotions = await AsyncStorage.getItem('claimedPromotions');
      let claimedPromotionsArray = claimedPromotions ? JSON.parse(claimedPromotions) : [];
      
      if (claimed && !claimedPromotionsArray.includes(id)) {
        claimedPromotionsArray.push(id);
      } else if (!claimed && claimedPromotionsArray.includes(id)) {
        claimedPromotionsArray = claimedPromotionsArray.filter((promoId: string) => promoId !== id);
      }

      await AsyncStorage.setItem('claimedPromotions', JSON.stringify(claimedPromotionsArray));
    } catch (error) {
      console.error('Error updating local claimed status:', error);
    }
  }

  const handleCallSeller = () => {
    if (promotion?.seller.contact_number) {
      Linking.openURL(`tel:${promotion.seller.contact_number}`);
    }
  };

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    const cleanPath = path.replace(/^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/promotion-banners\//, '');
    const { data } = supabase.storage.from('promotion-banners').getPublicUrl(cleanPath);
    return data?.publicUrl;
  };

  async function handleClaimPromotion() {
    if (!user || !promotion) return;
  
    try {
      const { data, error } = await supabase
        .from('claimed_promotions')
        .insert({
          user_id: user.id,
          promotion_id: promotion.id,
          scanned: false,
          claimed_at: new Date().toISOString()
        })
        .select()
        .single();
  
      if (error) throw error;
  
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ pending: promotion.pending + 1 })
        .eq('id', promotion.id);
  
      if (updateError) throw updateError;
  
      setIsClaimed(true);
      updateLocalClaimedStatus(true);
      Alert.alert('Success', 'Promotion claimed successfully! Your QR code is now ready to be scanned.');
      router.push('/my-qr-codes');
    } catch (error) {
      console.error('Error claiming promotion:', error);
      Alert.alert('Error', 'Failed to claim promotion. It may have already been claimed.');
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!promotion) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>Failed to load promotion details.</ThemedText>
      </ThemedView>
    );
  }

  const bannerUrl = getPublicUrl(promotion.banner_url);
  const businessLogoUrl = getPublicUrl(promotion.seller.business_logo);
  const remainingQuantity = promotion.quantity - promotion.used_quantity;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {bannerUrl && (
        <Image
          source={{ uri: bannerUrl }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.contentContainer}>
        <View style={styles.businessInfoContainer}>
          {businessLogoUrl && (
            <Image
              source={{ uri: businessLogoUrl }}
              style={styles.businessLogo}
              resizeMode="contain"
            />
          )}
          <ThemedText style={[styles.businessName, { color: colors.text }]}>{promotion.seller.business_name}</ThemedText>
        </View>

        <ThemedText style={[styles.title, { color: colors.primary }]}>{promotion.title}</ThemedText>

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color={colors.text} />
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
            </ThemedText>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="pricetag-outline" size={20} color={colors.text} />
            <ThemedText style={[styles.infoText, { color: colors.text }]}>
              Remaining: {remainingQuantity} / {promotion.quantity}
            </ThemedText>
          </View>
        </View>

        <ThemedText style={[styles.description, { color: colors.text }]}>{promotion.description}</ThemedText>
        
        <View style={styles.priceContainer}>
          {promotion.original_price && (
            <ThemedText style={[styles.originalPrice, { color: colors.text }]}>
              Original: ${promotion.original_price.toFixed(2)}
            </ThemedText>
          )}
          <ThemedText style={[styles.promotionalPrice, { color: colors.primary }]}>
            Now: ${promotion.promotional_price.toFixed(2)}
          </ThemedText>
        </View>

        <MapView
          style={styles.map}
          initialRegion={{
            latitude: promotion.seller.latitude,
            longitude: promotion.seller.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          <Marker
            coordinate={{
              latitude: promotion.seller.latitude,
              longitude: promotion.seller.longitude,
            }}
            title={promotion.seller.business_name}
          />
        </MapView>

        <TouchableOpacity onPress={handleCallSeller} style={[styles.contactButton, { backgroundColor: colors.secondary }]}>
          <Ionicons name="call-outline" size={20} color={colors.background} />
          <ThemedText style={[styles.contactInfo, { color: colors.background }]}>
            Contact Seller
          </ThemedText>
        </TouchableOpacity>

        {!isClaimed && remainingQuantity > 0 && (
          <TouchableOpacity style={[styles.claimButton, { backgroundColor: colors.primary }]} onPress={handleClaimPromotion}>
            <ThemedText style={styles.claimButtonText}>Claim Promotion</ThemedText>
          </TouchableOpacity>
        )}

        {isClaimed && (
          <View style={[styles.statusContainer, { backgroundColor: colors.success }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.background} />
            <ThemedText style={[styles.statusText, { color: colors.background }]}>
              Promotion Claimed
            </ThemedText>
          </View>
        )}

        {remainingQuantity <= 0 && (
          <View style={[styles.statusContainer, { backgroundColor: colors.error }]}>
            <Ionicons name="close-circle-outline" size={24} color={colors.background} />
            <ThemedText style={[styles.statusText, { color: colors.background }]}>
              Promotion Sold Out
            </ThemedText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
  },
  contentContainer: {
    padding: 16,
  },
  bannerImage: {
    width: '100%',
    height: 200,
  },
  businessInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  businessLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 16,
    lineHeight: 24,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
  },
  promotionalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  map: {
    width: '100%',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  contactInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  claimButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});