import React, { useEffect, useState } from 'react';
import { StyleSheet, Linking, Image, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

interface Promotion {
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchPromotionDetails();
    checkIfClaimed();
  }, [id]);

  async function fetchPromotionDetails() {
    const { data, error } = await supabase
      .from('promotions')
      .select(`
        *,
        seller:users (contact_number, latitude, longitude, business_name, business_logo)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching promotion details:', error);
    } else {
      setPromotion(data);
    }
  }

  async function checkIfClaimed() {
    if (!user) return;

    const { data, error } = await supabase
      .from('claimed_promotions')
      .select('id')
      .eq('user_id', user.id)
      .eq('promotion_id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking claimed status:', error);
    } else {
      setIsClaimed(!!data);
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

    if (promotion.used_quantity >= promotion.quantity) {
      Alert.alert('Sorry', 'This promotion has reached its usage limit.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('claimed_promotions')
        .insert({
          user_id: user.id,
          promotion_id: promotion.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Update the promotion's used_quantity
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ used_quantity: promotion.used_quantity + 1 })
        .eq('id', promotion.id);

      if (updateError) throw updateError;

      // Update user's analytics
      const moneySaved = promotion.original_price
        ? promotion.original_price - promotion.promotional_price
        : 0;
      const { error: analyticsError } = await supabase.rpc('update_user_analytics', {
        user_id: user.id,
        items_bought: 1,
        money_saved: moneySaved,
        money_spent: promotion.promotional_price,
      });

      if (analyticsError) throw analyticsError;

      setIsClaimed(true);
      Alert.alert('Success', 'Promotion claimed successfully!');
      router.push('/my-qr-codes');
    } catch (error) {
      console.error('Error claiming promotion:', error);
      Alert.alert('Error', 'Failed to claim promotion. Please try again.');
    }
  }


  if (!promotion) {
    return <ThemedText>Loading...</ThemedText>;
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
 

      <ThemedText style={[styles.quantity, { color: colors.text }]}>
        Remaining: {remainingQuantity} / {promotion.quantity}
      </ThemedText>
      <ThemedText style={[styles.dates, { color: colors.text }]}>
        {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
      </ThemedText>
      <ThemedText style={[styles.title, { color: colors.primary }]}>{promotion.title}</ThemedText>
      <ThemedText style={[styles.description, { color: colors.text }]}>{promotion.description}</ThemedText>
      
      <View style={styles.priceContainer}>
        {promotion.original_price && (
          <ThemedText style={[styles.originalPrice, { color: colors.text }]}>
            Original Price: ${promotion.original_price.toFixed(2)}
          </ThemedText>
        )}
        <ThemedText style={[styles.promotionalPrice, { color: colors.primary }]}>
          Promotional Price: ${promotion.promotional_price.toFixed(2)}
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
      <ThemedText style={[styles.locationInfo, { color: colors.text }]}>
        Location: {promotion.seller.latitude.toFixed(6)}, {promotion.seller.longitude.toFixed(6)}
      </ThemedText>
      <TouchableOpacity onPress={handleCallSeller}>
        <ThemedText style={[styles.contactInfo, { color: colors.primary }]}>
          Contact Seller: {promotion.seller.contact_number}
        </ThemedText>
      </TouchableOpacity>

      {!isClaimed && remainingQuantity > 0 && (
        <TouchableOpacity style={[styles.claimButton, { backgroundColor: colors.primary }]} onPress={handleClaimPromotion}>
          <ThemedText style={styles.claimButtonText}>Claim Promotion</ThemedText>
        </TouchableOpacity>
      )}

      {isClaimed && (
        <ThemedText style={[styles.claimedText, { color: colors.primary }]}>
          You've already claimed this promotion!
        </ThemedText>
      )}

      {remainingQuantity <= 0 && (
        <ThemedText style={styles.soldOutText}>This promotion is sold out!</ThemedText>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
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
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 8,
  },
  dates: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quantity: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: 200,
    marginBottom: 16,
  },
  locationInfo: {
    fontSize: 14,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    textDecorationLine: 'underline',
    marginBottom: 16,
  },
  claimButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  claimButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  claimedText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  soldOutText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  priceContainer: {
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  promotionalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
