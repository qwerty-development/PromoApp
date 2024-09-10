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
  Platform
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ColorScheme } from '@/constants/Colors';
import { format } from 'date-fns'; // Make sure to install this package

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
          promotional_price
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
        promotional_price: item.promotions.promotional_price
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
    
    return (
      <TouchableOpacity 
        style={[styles.promotionItem, { backgroundColor: colors.card }]}
        onPress={() => setSelectedPromotion(item)}
      >
        <View style={styles.promotionContent}>
          <ThemedText style={[styles.promotionTitle, { color: colors.text }]}>{item.title}</ThemedText>
          <ThemedText style={[styles.promotionDescription, { color: colors.tabIconDefault }]} numberOfLines={2}>
            {item.description}
          </ThemedText>
          <View style={styles.promotionDetails}>
            <ThemedText style={[styles.promotionPrice, { color: colors.text }]}>
              ${item.promotional_price.toFixed(2)}
            </ThemedText>
            <ThemedText style={[styles.promotionDiscount, { color: colors.success }]}>
              {discountPercentage.toFixed(0)}% OFF
            </ThemedText>
          </View>
          <ThemedText style={[styles.promotionDate, { color: colors.tabIconDefault }]}>
            Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
          </ThemedText>
        </View>
        <View style={styles.promotionStatus}>
          <ThemedText style={[
            styles.statusText, 
            { color: item.scanned ? colors.success : colors.primary }
          ]}>
            {item.scanned ? 'Claimed' : 'Pending'}
          </ThemedText>
          <Ionicons name="chevron-forward" size={24} color={colors.tabIconDefault} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'pending' && styles.activeTab,
            { borderBottomColor: colors.primary }
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
            activeTab === 'claimed' && styles.activeTab,
            { borderBottomColor: colors.primary }
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
          <ThemedText style={[styles.emptyText, { color: colors.tabIconDefault }]}>
            No {activeTab} promotions found.
          </ThemedText>
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
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPromotion(null)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            {selectedPromotion && (
              <>
                <ThemedText style={[styles.modalTitle, { color: colors.text }]}>
                  {selectedPromotion.title}
                </ThemedText>
                <QRCode
                  value={selectedPromotion.unique_code}
                  size={width * 0.6}
                  color={colors.text}
                  backgroundColor={colors.background}
                />
                <ThemedText style={[styles.modalPrice, { color: colors.text }]}>
                  Price: ${selectedPromotion.promotional_price.toFixed(2)}
                </ThemedText>
                <ThemedText style={[styles.modalDate, { color: colors.tabIconDefault }]}>
                  Expires: {format(new Date(selectedPromotion.expiry_date), 'MMM dd, yyyy')}
                </ThemedText>
                <ThemedText style={[
                  styles.modalStatus, 
                  { color: selectedPromotion.scanned ? colors.success : colors.primary }
                ]}>
                  Status: {selectedPromotion.scanned ? 'Claimed' : 'Pending'}
                </ThemedText>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  promotionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  promotionContent: {
    flex: 1,
    marginRight: 10,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  promotionDescription: {
    fontSize: 14,
    marginBottom: 5,
  },
  promotionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  promotionPrice: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  promotionDiscount: {
    fontSize: 14,
    fontWeight: '500',
  },
  promotionDate: {
    fontSize: 12,
  },
  promotionStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: width * 0.8,
  },
  closeButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  modalPrice: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  modalDate: {
    fontSize: 14,
    marginBottom: 10,
  },
  modalStatus: {
    fontSize: 16,
    fontWeight: '500',
  },
});