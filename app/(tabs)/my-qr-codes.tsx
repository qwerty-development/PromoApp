import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Dimensions,
  RefreshControl,
  useColorScheme,
  Image,
  Animated
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome5 } from '@expo/vector-icons';
import { Colors, ColorScheme } from '@/constants/Colors';
import { format, differenceInDays } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ClaimedPromotion {
  id: string;
  title: string;
  description: string;
  unique_code: string;
  scanned: boolean;
  claimed_at: string;
  expiry_date: string;
  original_price: number;
  promotional_price: number;
  banner_url: string;
}

const { width } = Dimensions.get('window');

export default function MyQRCodesScreen() {
  const [promotions, setPromotions] = useState<ClaimedPromotion[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'claimed'>('pending');
  const [selectedPromotion, setSelectedPromotion] = useState<ClaimedPromotion | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme;

  const fetchClaimedPromotions = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('claimed_promotions')
      .select(`
        id,
        scanned,
        claimed_at,
        promotions (
          title,
          description,
          unique_code,
          end_date,
          original_price,
          promotional_price,
          banner_url
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching claimed promotions:', error);
    } else if (data) {
      setPromotions(data.map(item => ({
        id: item.id,
        title: item.promotions.title,
        description: item.promotions.description,
        unique_code: item.promotions.unique_code,
        scanned: item.scanned,
        claimed_at: item.claimed_at,
        expiry_date: item.promotions.end_date,
        original_price: item.promotions.original_price,
        promotional_price: item.promotions.promotional_price,
        banner_url: item.promotions.banner_url
      })));
    }
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchClaimedPromotions();
    }
  }, [user, fetchClaimedPromotions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchClaimedPromotions();
  }, [fetchClaimedPromotions]);

  const filteredPromotions = promotions.filter(promo => 
    activeTab === 'pending' ? !promo.scanned : promo.scanned
  );

  const renderPromotion = ({ item }: { item: ClaimedPromotion }) => {
    const discountPercentage = ((item.original_price - item.promotional_price) / item.original_price) * 100;
    const daysUntilExpiry = differenceInDays(new Date(item.expiry_date), new Date());
    
    return (
      <Animated.View style={styles.promotionItemContainer}>
        <TouchableOpacity 
          style={[styles.promotionItem, { backgroundColor: colors.card }]}
          onPress={() => setSelectedPromotion(item)}
        >
          <View style={styles.promotionImageContainer}>
            <Image 
              source={{ uri: item.banner_url }} 
              style={styles.promotionImage}
            />
            <View style={styles.promotionImageOverlay} />
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.promotionGradient}
          >
            <View style={styles.promotionContent}>
              <ThemedText style={[styles.promotionTitle, { color: colors.textonbanner }]} numberOfLines={2}>
                {item.title}
              </ThemedText>
              <View style={styles.promotionDetails}>
                <View style={styles.priceContainer}>
                  <ThemedText style={[styles.promotionPrice, { color: colors.textonbanner}]}>
                    ${item.promotional_price.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={[styles.originalPrice, {  color: colors.textonbanner }]}>
                    ${item.original_price.toFixed(2)}
                  </ThemedText>
                </View>
                <View style={[styles.discountTag, { backgroundColor: colors.accent }]}>
                  <ThemedText style={[styles.promotionDiscount, { color: colors.text }]}>
                    {discountPercentage.toFixed(0)}% OFF
                  </ThemedText>
                </View>
              </View>
              <View style={styles.promotionFooter}>
                <View style={[styles.expiryTag, { backgroundColor: daysUntilExpiry <= 3 ? colors.error : colors.success }]}>
                  <FontAwesome5 name="clock" size={12} color={colors.text} />
                  <ThemedText style={[styles.expiryText, { color: colors.text }]}>
                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} days left` : 'Expired'}
                  </ThemedText>
                </View>
                <View style={[styles.statusTag, { backgroundColor: item.scanned ? colors.success : colors.primary }]}>
                  <FontAwesome5 name={item.scanned ? "check-circle" : "hourglass-half"} size={12} color={colors.text} />
                  <ThemedText style={[styles.statusText, { color: colors.text }]}>
                    {item.scanned ? 'Claimed' : 'Pending'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'pending' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeTab === 'pending' && [styles.activeTabText, { color: colors.primary }]
          ]}>
            Pending
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'claimed' && [styles.activeTab, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('claimed')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeTab === 'claimed' && [styles.activeTabText, { color: colors.primary }]
          ]}>
            Claimed
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="qrcode" size={64} color={colors.tabIconDefault} />
            <ThemedText style={[styles.emptyText, { color: colors.tabIconDefault }]}>
              No {activeTab} promotions found.
            </ThemedText>
          </View>
        }
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={selectedPromotion !== null}
        onRequestClose={() => setSelectedPromotion(null)}
      >
        <BlurView intensity={100} style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPromotion(null)}
            >
              <FontAwesome5 name="times" size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedPromotion && (
              <>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedPromotion.title}
                </ThemedText>
                <QRCode
                  value={selectedPromotion.unique_code}
                  size={width * 0.5}
                  color={colors.text}
                  backgroundColor={colors.card}
                />
                <View style={styles.modalPriceContainer}>
                  <ThemedText style={[styles.modalPrice, { color: colors.text }]}>
                    ${selectedPromotion.promotional_price.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={[styles.modalOriginalPrice, { color: colors.tabIconDefault }]}>
                    ${selectedPromotion.original_price.toFixed(2)}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.modalDate, { color: colors.tabIconDefault }]}>
                  Expires: {format(new Date(selectedPromotion.expiry_date), 'MMM dd, yyyy')}
                </ThemedText>
                <View style={[
                  styles.modalStatus, 
                  { backgroundColor: selectedPromotion.scanned ? colors.success : colors.primary }
                ]}>
                  <FontAwesome5 
                    name={selectedPromotion.scanned ? "check-circle" : "hourglass-half"} 
                    size={16} 
                    color={colors.background} 
                  />
                  <ThemedText style={[styles.modalStatusText, { color: colors.background }]}>
                    {selectedPromotion.scanned ? 'Claimed' : 'Pending'}
                  </ThemedText>
                </View>
              </>
            )}
          </View>
        </BlurView>
      </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  promotionItemContainer: {
    marginBottom: 20,
  },
  promotionItem: {
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  promotionImageContainer: {
    position: 'relative',
  },
  promotionImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  promotionImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  promotionGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 15,
  },
  promotionContent: {
    flex: 1,
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 5,
  },
  promotionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  promotionPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 5,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  discountTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promotionDiscount: {
    fontSize: 14,
    fontWeight: '500',
  },
  promotionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expiryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiryText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width * 0.85,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalPriceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalPrice: {
    fontSize: 24,
    fontWeight: '600',
    marginRight: 10,
  },
  modalOriginalPrice: {
    fontSize: 18,
    textDecorationLine: 'line-through',
  },
  modalDate: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});
