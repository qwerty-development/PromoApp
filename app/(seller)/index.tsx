import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { BlurView } from 'expo-blur';

const { height } = Dimensions.get('window');

interface Promotion {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  is_approved: boolean | null;
  industries: { name: string } | null;
  industry_id: number | null;
  quantity: number;
  used_quantity: number;
  pending: number;
  original_price: number;
  promotional_price: number;
  unique_code: string;
  created_at: string;
}

interface Industry {
  id: number;
  name: string;
}

type TabType = 'all' | 'approved' | 'pending' | 'rejected';
type SortOption = 'newest' | 'oldest' | 'az' | 'za';

export default function MyPromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const panY = useRef(new Animated.Value(0)).current;
  const translateY = panY.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 0, 1],
  });

  const resetPositionAnim = Animated.timing(panY, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  });

  const closeAnim = Animated.timing(panY, {
    toValue: height,
    duration: 300,
    useNativeDriver: true,
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderMove: Animated.event([null, { dy: panY }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if(gestureState.dy > 50) {
          closeModal();
        } else {
          resetPositionAnim.start();
        }
      },
    })
  ).current;

  const closeModal = useCallback(() => {
    closeAnim.start(() => {
      setModalVisible(false);
      setEditingPromotion(null);
      panY.setValue(0);
    });
  }, [closeAnim, panY]);

  const fetchPromotions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('promotions')
        .select('*, industries(name)')
        .eq('seller_id', user.id);

      if (error) throw error;
      setPromotions(data as Promotion[]);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      Alert.alert('Error', 'Failed to fetch promotions');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchIndustries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('industries')
        .select('*')
        .order('name');

      if (error) throw error;
      setIndustries(data);
    } catch (error) {
      console.error('Error fetching industries:', error);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchIndustries();
  }, [fetchPromotions, fetchIndustries]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      "Delete Promotion",
      "Are you sure you want to delete this promotion?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', id);

              if (error) throw error;
              fetchPromotions();
              Alert.alert('Success', 'Promotion deleted successfully');
            } catch (error) {
              console.error('Error deleting promotion:', error);
              Alert.alert('Error', 'Failed to delete promotion');
            }
          }
        }
      ]
    );
  }, [fetchPromotions]);

  const handleEdit = useCallback((promotion: Promotion) => {
    setEditingPromotion({...promotion});
    setModalVisible(true);
  }, []);

  const handleUpdate = async () => {
    if (!editingPromotion) return;

    try {
      const { error } = await supabase
        .from('promotions')
        .update({
          title: editingPromotion.title,
          description: editingPromotion.description,
          start_date: editingPromotion.start_date,
          end_date: editingPromotion.end_date,
          industry_id: editingPromotion.industry_id,
          original_price: editingPromotion.original_price,
          promotional_price: editingPromotion.promotional_price,
          quantity: editingPromotion.quantity,
        })
        .eq('id', editingPromotion.id);

      if (error) throw error;

      Alert.alert('Success', 'Promotion updated successfully');
      closeModal();
      fetchPromotions();
    } catch (error) {
      console.error('Error updating promotion:', error);
      Alert.alert('Error', 'Failed to update promotion');
    }
  };

  const filteredAndSortedPromotions = useCallback(() => {
    let filtered = [...promotions];

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(promo => {
        if (activeTab === 'approved') return promo.is_approved === true;
        if (activeTab === 'pending') return promo.is_approved === null;
        if (activeTab === 'rejected') return promo.is_approved === false;
        return true;
      });
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(promo =>
        promo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        promo.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    switch (sortOption) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'az':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'za':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return filtered;
  }, [promotions, activeTab, searchQuery, sortOption]);

  const renderPromotion = useCallback(({ item }: { item: Promotion }) => {
    const discountPercentage = ((item.original_price - item.promotional_price) / item.original_price) * 100;
    const daysLeft = Math.max(0, Math.ceil((new Date(item.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <View style={[styles.promotionCard, { backgroundColor: colors.card }]}>
        <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.gradientOverlay}
        >
          <View style={styles.headerBadges}>
            <View style={[styles.badge, getStatusBadgeStyle(item.is_approved)]}>
              <ThemedText style={styles.badgeText}>
                {item.is_approved === true ? 'Active' : item.is_approved === null ? 'Pending' : 'Rejected'}
              </ThemedText>
            </View>
            <View style={[styles.badge, styles.daysLeftBadge]}>
              <ThemedText style={styles.badgeText}>
                {daysLeft} days left
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentContainer}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {item.title}
          </ThemedText>

          <View style={styles.priceSection}>
            <View>
              <ThemedText style={styles.originalPrice}>
                ${item.original_price.toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.promoPrice}>
                ${item.promotional_price.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>
                {discountPercentage.toFixed(0)}% OFF
              </ThemedText>
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatItem
              icon="layers-outline"
              value={item.quantity - item.used_quantity - item.pending}
              label="Available"
              color={colors.primary}
            />
            <StatItem
              icon="time-outline"
              value={item.pending}
              label="Pending"
              color="#ffd166"
            />
            <StatItem
              icon="checkmark-circle-outline"
              value={item.used_quantity}
              label="Claimed"
              color="#4ecdc4"
            />
          </View>

          <View style={styles.industryTag}>
            <Ionicons name="business-outline" size={14} color={colors.text} />
            <ThemedText style={styles.industryText}>
              {item.industries?.name || 'N/A'}
            </ThemedText>
          </View>

          <ThemedText style={styles.description} numberOfLines={2}>
            {item.description}
          </ThemedText>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => handleEdit(item)}
            >
              <Ionicons name="create-outline" size={20} color="white" />
              <ThemedText style={styles.actionButtonText}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#ff6b6b' }]}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <ThemedText style={styles.actionButtonText}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [colors, handleDelete, handleEdit]);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.searchBar, { backgroundColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.text} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search promotions..."
            placeholderTextColor={colors.text}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: colors.border }]}
          onPress={() => setSortModalVisible(true)}
        >
          <Ionicons name="funnel-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {['all', 'approved', 'pending', 'rejected'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && styles.activeTab,
              { borderBottomColor: activeTab === tab ? colors.primary : 'transparent' }
            ]}
            onPress={() => setActiveTab(tab as TabType)}
          >
            <ThemedText style={[
              styles.tabText,
              activeTab === tab && { color: colors.primary }
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedPromotions()}
          renderItem={renderPromotion}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.promotionList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={colors.text} />
              <ThemedText style={styles.emptyText}>No promotions found</ThemedText>
            </View>
          }
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSortModalVisible(false)}
        >
          <View style={[styles.sortModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.sortModalHeader}>
              <ThemedText style={styles.sortModalTitle}>Sort By</ThemedText>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {[
              { id: 'newest', label: 'Newest First', icon: 'time-outline' },
              { id: 'oldest', label: 'Oldest First', icon: 'hourglass-outline' },
              { id: 'az', label: 'A-Z', icon: 'arrow-down-outline' },
              { id: 'za', label: 'Z-A', icon: 'arrow-up-outline' },
            ].map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sortOption,
                  sortOption === option.id && styles.selectedSortOption,
                ]}
                onPress={() => {
                  setSortOption(option.id as SortOption);
                  setSortModalVisible(false);
                }}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={sortOption === option.id ? colors.primary : colors.text}
                />
                <ThemedText
                  style={[
                    styles.sortOptionText,
                    sortOption === option.id && { color: colors.primary },
                  ]}
                >
                  {option.label}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY }],
                backgroundColor: colors.background,
              }
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.modalHeader}>
              <View style={[styles.modalHeaderBar, { backgroundColor: colors.border }]} />
              <ThemedText style={[styles.modalTitle, { color: colors.text }]}>Edit Promotion</ThemedText>
            </View>
            <ScrollView>
              {editingPromotion && (
                <>
                  <FormField
                    label="Title"
                    value={editingPromotion.title}
                    onChangeText={(text: string) => setEditingPromotion({...editingPromotion, title: text})}
                    placeholder="Enter promotion title"
                    colors={colors}
                  />
                  <FormField
                    label="Description"
                    value={editingPromotion.description}
                    onChangeText={(text: string) => setEditingPromotion({...editingPromotion, description: text})}
                    placeholder="Enter promotion description"
                    multiline
                    colors={colors}
                  />
                  <DatePickerField
                    label="Start Date"
                    value={new Date(editingPromotion.start_date)}
                    onChange={(date: Date) => setEditingPromotion({...editingPromotion, start_date: date.toISOString()})}
                    colors={colors}
                  />
                  <DatePickerField
                    label="End Date"
                    value={new Date(editingPromotion.end_date)}
                    onChange={(date: Date) => setEditingPromotion({...editingPromotion, end_date: date.toISOString()})}
                    colors={colors}
                  />
                  <IndustryPickerField
                    label="Industry"
                    value={editingPromotion.industry_id}
                    onValueChange={(value: number) => setEditingPromotion({...editingPromotion, industry_id: value})}
                    industries={industries}
                    colors={colors}
                    colorScheme={colorScheme}
                  />
                  <FormField
                    label="Original Price"
                    value={editingPromotion.original_price.toString()}
                    onChangeText={(text: string) => setEditingPromotion({...editingPromotion, original_price: parseFloat(text) || 0})}
                    keyboardType="numeric"
                    placeholder="Enter original price"
                    colors={colors}
                  />
                  <FormField
                    label="Promotional Price"
                    value={editingPromotion.promotional_price.toString()}
                    onChangeText={(text: string) => setEditingPromotion({...editingPromotion, promotional_price: parseFloat(text) || 0})}
                    keyboardType="numeric"
                    placeholder="Enter promotional price"
                    colors={colors}
                  />
                  <FormField
                    label="Quantity"
                    value={editingPromotion.quantity.toString()}
                    onChangeText={(text: string) => setEditingPromotion({...editingPromotion, quantity: parseInt(text) || 0})}
                    keyboardType="numeric"
                    placeholder="Enter quantity"
                    colors={colors}
                  />
                  <TouchableOpacity 
                    style={[styles.updateButton, { backgroundColor: colors.primary }]}
                    onPress={handleUpdate}
                  >
                    <ThemedText style={styles.updateButtonText}>Update Promotion</ThemedText>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const StatItem = ({ icon, value, label, color }: any) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={16} color={color} />
    <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
    <ThemedText style={styles.statLabel}>{label}</ThemedText>
  </View>
);

const FormField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', colors }: any) => (
  <View style={styles.formField}>
    <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
    <TextInput
      style={[
        styles.input,
        multiline && styles.textArea,
        { color: colors.text, backgroundColor: colors.card }
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.text}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  </View>
);

const DatePickerField = ({ label, value, onChange, colors }: any) => (
  <View style={styles.formField}>
    <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
    <DateTimePicker
      value={value}
      mode="date"
      display="default"
      onChange={(event, selectedDate) => {
        const currentDate = selectedDate || value;
        onChange(currentDate);
      }}
      textColor={colors.text}
    />
  </View>
);

const IndustryPickerField = ({ label, value, onValueChange, industries, colors, colorScheme }: any) => (
  <View style={styles.formField}>
    <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
    <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
      <Picker
        selectedValue={value}
        onValueChange={onValueChange}
        style={{ color: colors.text }}
      >
        <Picker.Item
          label="Select an industry"
          value={null}
          color={colorScheme === 'dark' ? 'white' : colors.text}
        />
        {industries.map((industry: Industry) => (
          <Picker.Item
            key={industry.id}
            label={industry.name}
            value={industry.id}
            color={colorScheme === 'dark' ? 'white' : colors.text}
          />
        ))}
      </Picker>
    </View>
  </View>
);

const getStatusBadgeStyle = (isApproved: boolean | null) => {
  switch (isApproved) {
    case true:
      return { backgroundColor: '#4ecdc4' };
    case false:
      return { backgroundColor: '#ff6b6b' };
    default:
      return { backgroundColor: '#ffd166' };
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 23,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  sortButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  promotionList: {
    paddingBottom: 20,
  },
  promotionCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bannerImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    padding: 16,
  },
  headerBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  daysLeftBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 14,
    textDecorationLine: 'line-through',
    color: '#999',
  },
  promoPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  discountBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  industryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  industryText: {
    fontSize: 14,
    color: '#999',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
  },
  sortModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 12,
  },
  selectedSortOption: {
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
  },
  sortOptionText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  updateButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

