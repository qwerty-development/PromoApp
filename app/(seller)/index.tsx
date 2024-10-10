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

const { height } = Dimensions.get('window');

interface Promotion {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  is_approved: boolean;
  industries: { name: string } | null;
  industry_id: number | null;
  quantity: number;
  used_quantity: number;
  pending: number;
  original_price: number;
  promotional_price: number;
  unique_code: string;
}

interface Industry {
  id: number;
  name: string;
}

export default function MyPromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
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

  const renderPromotion = useCallback(({ item }: { item: Promotion }) => {
    const discountPercentage = ((item.original_price - item.promotional_price) / item.original_price) * 100;
    const daysLeft = Math.max(0, Math.ceil((new Date(item.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));

    return (
      <ThemedView style={[styles.promotionItem, { backgroundColor: colors.card }]}>
        <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.gradientOverlay}
        >
          <View style={styles.daysLeftBadge}>
            <ThemedText style={styles.daysLeftText}>{daysLeft} days left</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_approved ? '#4ecdc4' : '#ffd166' }]}>
            <ThemedText style={styles.statusText}>{item.is_approved ? 'Active' : 'Pending'}</ThemedText>
          </View>
        </LinearGradient>
        <View style={styles.promotionContent}>
          <ThemedText style={[styles.promotionTitle, { color: colors.text }]}>{item.title}</ThemedText>
          <View style={styles.priceRow}>
            <ThemedText style={[styles.price, { color: colors.primary }]}>${item.promotional_price.toFixed(2)}</ThemedText>
            <ThemedText style={styles.discount}>{discountPercentage.toFixed(0)}% OFF</ThemedText>
          </View>
          <ThemedText style={[styles.dateRange, { color: colors.text }]}>
            {`${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}`}
          </ThemedText>
          <View style={styles.statsRow}>
            <StatItem icon="layers-outline" text={`${item.quantity - item.used_quantity - item.pending} available`} color={colors.primary} textColor={colors.text} />
            <StatItem icon="hourglass-outline" text={`${item.pending} pending`} color={colors.primary} textColor={colors.text} />
            <StatItem icon="checkmark-circle-outline" text={`${item.used_quantity} claimed`} color={colors.primary} textColor={colors.text} />
          </View>
          <ThemedText style={[styles.description, { color: colors.text }]} numberOfLines={2}>{item.description}</ThemedText>
          <ThemedText style={[styles.industry, { color: colors.text }]}>
            <Ionicons name="business-outline" size={12} color={colors.text} /> {item.industries?.name || 'N/A'}
          </ThemedText>
          <View style={styles.buttonContainer}>
            <ActionButton icon="create-outline" text="Edit" onPress={() => handleEdit(item)} color="#4ecdc4" />
            <ActionButton icon="trash-outline" text="Delete" onPress={() => handleDelete(item.id)} color="#ff6b6b" />
          </View>
        </View>
      </ThemedView>
    );
  }, [colors, handleDelete, handleEdit]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchContainer, { backgroundColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search promotions..."
          placeholderTextColor={colors.text}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <FlatList
        data={promotions.filter(promo => 
          promo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          promo.description.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<ThemedText style={styles.emptyText}>No promotions found.</ThemedText>}
        contentContainerStyle={styles.listContainer}
      />
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
                    onChangeText={(text: any) => setEditingPromotion({...editingPromotion, title: text})}
                    placeholder="Enter promotion title"
                    colors={colors}
                  />
                  <FormField
                    label="Description"
                    value={editingPromotion.description}
                    onChangeText={(text: any) => setEditingPromotion({...editingPromotion, description: text})}
                    placeholder="Enter promotion description"
                    multiline
                    colors={colors}
                  />
                  <DatePickerField
                    label="Start Date"
                    value={new Date(editingPromotion.start_date)}
                    onChange={(date: { toISOString: () => any; }) => setEditingPromotion({...editingPromotion, start_date: date.toISOString()})}
                    colors={colors}
                  />
                  <DatePickerField
                    label="End Date"
                    value={new Date(editingPromotion.end_date)}
                    onChange={(date: { toISOString: () => any; }) => setEditingPromotion({...editingPromotion, end_date: date.toISOString()})}
                    colors={colors}
                  />
                  <IndustryPickerField
                    label="Industry"
                    value={editingPromotion.industry_id}
                    onValueChange={(value: any) => setEditingPromotion({...editingPromotion, industry_id: value})}
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

const StatItem = ({ icon, text, color, textColor }:any) => (
  <View style={styles.statItem}>
    <Ionicons name={icon} size={16} color={color} />
    <ThemedText style={[styles.statText, { color: textColor }]}>{text}</ThemedText>
  </View>
);

const ActionButton = ({ icon, text, onPress, color }:any) => (
  <TouchableOpacity style={[styles.actionButton, { backgroundColor: color }]} onPress={onPress}>
    <Ionicons name={icon} size={20} color="white" />
    <ThemedText style={styles.buttonText}>{text}</ThemedText>
  </TouchableOpacity>
);

const FormField = ({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default', colors }:any) => (
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

const DatePickerField = ({ label, value, onChange, colors }:any) => (
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

const IndustryPickerField = ({ label, value, onValueChange, industries, colors, colorScheme }:any) => (
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
          color={colorScheme === 'dark' ? 'white' : colors.primary}
        />
        {industries.map((industry: { id: React.Key | null | undefined; name: string | undefined; }) => (
          <Picker.Item
            key={industry.id}
            label={industry.name}
            value={industry.id}
            color={colorScheme === 'dark' ? 'white' : colors.primary}
          />
        ))}
      </Picker>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginVertical: 10,
    borderRadius: 25,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  promotionItem: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
  },
  daysLeftBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  daysLeftText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  promotionContent: {
    padding: 16,
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  discount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  dateRange: {
    fontSize: 14,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 4,
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    marginBottom: 12,
  },
  industry: {
    fontSize: 12,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  updateButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});