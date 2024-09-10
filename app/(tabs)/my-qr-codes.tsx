import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';

interface ClaimedPromotion {
  id: string;
  title: string;
  unique_code: string;
  scanned: boolean;
}

const { width } = Dimensions.get('window');

export default function MyQRCodesScreen() {
  const [promotions, setPromotions] = useState<ClaimedPromotion[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'claimed'>('pending');
  const [selectedPromotion, setSelectedPromotion] = useState<ClaimedPromotion | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchClaimedPromotions();
    }
  }, [user]);

  async function fetchClaimedPromotions() {
    if (!user) return;

    const { data, error } = await supabase
      .from('claimed_promotions')
      .select(`
        id,
        scanned,
        promotions (
          title,
          unique_code
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching claimed promotions:', error);
    } else if (data) {
      setPromotions(data.map(item => ({
        id: item.id,
        title: item.promotions.title,
        unique_code: item.promotions.unique_code,
        scanned: item.scanned
      })));
    }
  }

  const filteredPromotions = promotions.filter(promo => 
    activeTab === 'pending' ? !promo.scanned : promo.scanned
  );

  const renderPromotion = ({ item }: { item: ClaimedPromotion }) => (
    <TouchableOpacity 
      style={styles.promotionItem}
      onPress={() => setSelectedPromotion(item)}
    >
      <ThemedText style={styles.promotionTitle}>{item.title}</ThemedText>
      <Ionicons name="chevron-forward" size={24} color="#888" />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Pending</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'claimed' && styles.activeTab]}
          onPress={() => setActiveTab('claimed')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'claimed' && styles.activeTabText]}>Claimed</ThemedText>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={filteredPromotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedText style={styles.emptyText}>No {activeTab} promotions found.</ThemedText>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={selectedPromotion !== null}
        onRequestClose={() => setSelectedPromotion(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedPromotion(null)}
            >
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>
            {selectedPromotion && (
              <>
                <ThemedText style={styles.modalTitle}>{selectedPromotion.title}</ThemedText>
                <QRCode
                  value={selectedPromotion.unique_code}
                  size={width * 0.6}
                  color="black"
                  backgroundColor="white"
                />
                <ThemedText style={styles.statusText}>
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
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 16,
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  listContainer: {
    flexGrow: 1,
  },
  promotionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  promotionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
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
    right: 10,
    top: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
  },
});