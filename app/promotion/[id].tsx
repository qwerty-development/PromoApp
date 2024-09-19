import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Linking, 
  Image, 
  View, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  ActivityIndicator, 
  Dimensions 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface Promotion {
  pending: number;
  id: string;
  seller_id:string;
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
    push_token:string;
  };
}

const { width } = Dimensions.get('window');

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
    if (!user?.id || !promotion?.id) {
      console.error('User or promotion data is missing:', { userId: user?.id, promotionId: promotion?.id });
      Alert.alert('Error', 'Unable to claim promotion. Please try again later.');
      return;
    }
  
    try {
      console.log('Attempting to claim promotion:', { userId: user.id, promotionId: promotion.id });
  
      // Claim the promotion
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
  
      console.log('Promotion claimed successfully:', data);
  
      // Update the promotion's pending count
      const { error: updateError } = await supabase
        .from('promotions')
        .update({ pending: (promotion.pending || 0) + 1 })
        .eq('id', promotion.id);
  
      if (updateError) throw updateError;
  
      console.log('Promotion pending count updated');
  
      // Fetch the seller's push token
      const { data: sellerData, error: sellerError } = await supabase
      .from('users')
      .select('id, push_token')
      .eq('id', promotion.seller_id)
      .single();
  
      if (sellerError) throw sellerError;
  
      if (sellerData && sellerData.push_token) {
        console.log('Sending notification to seller:', sellerData.push_token);
      
        const message = {
          to: sellerData.push_token,
          sound: 'default',
          title: 'Promotion Claimed!',
          body: `${user.user_metadata?.full_name || 'A user'} claimed the promotion "${promotion.title}" (${(promotion.pending || 0) + 1}/${promotion.quantity} claimed)`,
          data: { promotionId: promotion.id },
        };
      
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
          });
      
          if (!response.ok) {
            console.error('Failed to send notification:', await response.text());
          } else {
            console.log('Notification sent successfully');
          }
        } catch (error) {
          console.error('Error sending notification:', error);
        }
      } else {
        console.log('No push token found for seller');
      }
  
      setIsClaimed(true);
      updateLocalClaimedStatus(true);
      Alert.alert('Success', 'Promotion claimed successfully! Your QR code is now ready to be scanned.');
      router.push('/my-qr-codes');
    } catch (error) {
      console.error('Error claiming promotion:', error);
      Alert.alert('Error', 'Failed to claim promotion. It may have already been claimed or an error occurred.');
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
  const discountPercentage = promotion.original_price
    ? Math.round(((promotion.original_price - promotion.promotional_price) / promotion.original_price) * 100)
    : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.bannerContainer}>
        {bannerUrl && (
          <Image
            source={{ uri: bannerUrl }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bannerGradient}
        >
          <View style={styles.businessInfoContainer}>
            {businessLogoUrl && (
              <Image
                source={{ uri: businessLogoUrl }}
                style={styles.businessLogo}
                resizeMode="contain"
              />
            )}
            <ThemedText style={[styles.businessName, { color: colors.background }]}>{promotion.seller.business_name}</ThemedText>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        <ThemedText style={[styles.title, { color: colors.text }]}>{promotion.title}</ThemedText>

        <View style={styles.tagsContainer}>
          <View style={[styles.tag, { backgroundColor: colors.primary }]}>
            <FontAwesome5 name="percentage" size={12} color={colors.background} />
            <ThemedText style={[styles.tagText, { color: colors.background }]}>{discountPercentage}% OFF</ThemedText>
          </View>
          <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
            <FontAwesome5 name="clock" size={12} color={colors.background} />
            <ThemedText style={[styles.tagText, { color: colors.background }]}>
              Ends {new Date(promotion.end_date).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <View>
            <ThemedText style={[styles.priceLabel, { color: colors.text }]}>Price</ThemedText>
            <ThemedText style={[styles.promotionalPrice, { color: colors.primary }]}>
              ${promotion.promotional_price.toFixed(2)}
            </ThemedText>
          </View>
          {promotion.original_price && (
            <View>
              <ThemedText style={[styles.priceLabel, { color: colors.text }]}>Original</ThemedText>
              <ThemedText style={[styles.originalPrice, { color: colors.text }]}>
                ${promotion.original_price.toFixed(2)}
              </ThemedText>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Description</ThemedText>
          <ThemedText style={[styles.description, { color: colors.text }]}>{promotion.description}</ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Availability</ThemedText>
          <View style={styles.availabilityContainer}>
            <ThemedText style={[styles.availabilityText, { color: colors.text }]}>
              {remainingQuantity} of {promotion.quantity} remaining
            </ThemedText>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { backgroundColor: colors.primary, width: `${(remainingQuantity / promotion.quantity) * 100}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>Location</ThemedText>
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
        </View>

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
          <BlurView intensity={100} tint={colorScheme} style={[styles.statusContainer, { backgroundColor: colors.success + '80' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.background} />
            <ThemedText style={[styles.statusText, { color: colors.background }]}>
              Promotion Claimed
            </ThemedText>
          </BlurView>
        )}

        {remainingQuantity <= 0 && (
          <BlurView intensity={100} tint={colorScheme} style={[styles.statusContainer, { backgroundColor: colors.error + '80' }]}>
            <Ionicons name="close-circle-outline" size={24} color={colors.background} />
            <ThemedText style={[styles.statusText, { color: colors.background }]}>
              Promotion Sold Out
            </ThemedText>
          </BlurView>
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
  bannerContainer: {
    position: 'relative',
    height: 250,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  businessInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  businessLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: 'white',
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 10,
  },
  tagText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  promotionalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  originalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  availabilityContainer: {
    marginTop: 8,
  },
  availabilityText: {
    fontSize: 14,
    marginBottom: 8,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginTop: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 16,
  },
  contactInfo: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  claimButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
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
    padding: 15,
    borderRadius: 10,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});