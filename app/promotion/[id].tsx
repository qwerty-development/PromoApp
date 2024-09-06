import React, { useEffect, useState } from 'react';
import { StyleSheet, Linking, Image, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

interface Promotion {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchPromotionDetails();
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

  if (!promotion) {
    return <ThemedText>Loading...</ThemedText>;
  }

  const bannerUrl = getPublicUrl(promotion.banner_url);
  const businessLogoUrl = getPublicUrl(promotion.seller.business_logo);

  return (
    <ThemedView style={styles.container}>
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
        <ThemedText style={styles.businessName}>{promotion.seller.business_name}</ThemedText>
      </View>

      <ThemedText style={[styles.title, { color: colors.primary }]}>{promotion.title}</ThemedText>
      <ThemedText style={styles.description}>{promotion.description}</ThemedText>
      <ThemedText style={styles.dates}>
        {new Date(promotion.start_date).toLocaleDateString()} - {new Date(promotion.end_date).toLocaleDateString()}
      </ThemedText>
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
      <ThemedText style={styles.locationInfo}>
        Location: {promotion.seller.latitude.toFixed(6)}, {promotion.seller.longitude.toFixed(6)}
      </ThemedText>
      <ThemedText style={styles.contactInfo} onPress={handleCallSeller}>
        Contact Seller: {promotion.seller.contact_number}
      </ThemedText>
    </ThemedView>
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
  },
});