import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

interface Industry {
  label: string;
  value: number;
}

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  style?: object;
}

const InputField: React.FC<InputFieldProps> = ({ label, ...props }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, props.style]}
      placeholderTextColor="#999"
      {...props}
    />
  </View>
);

export default function AddPromotionScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [bannerImage, setBannerImage] = useState<string | null>(null);
  const [industry, setIndustry] = useState<number | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [quantity, setQuantity] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [promotionalPrice, setPromotionalPrice] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const initializeScreen = async () => {
      await fetchUserRole();
      await fetchIndustries();
      console.log('User role:', user);
      setIsLoading(false);
    };

    initializeScreen();
  }, []);

  const fetchUserRole = async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setUserRole(data.role);
          console.log('User role:', data.role);  // Log the role for debugging
        } else {
          console.log('No user data found');
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        Alert.alert('Error', 'Failed to fetch user role. Please try again.');
        setUserRole(null);
      }
    } else {
      console.log('No user found');
      setUserRole(null);
    }
  };

  const fetchIndustries = async () => {
    const { data, error } = await supabase.from('industries').select('*');
    if (error) {
      console.error('Error fetching industries:', error);
    } else if (data) {
      setIndustries(data.map(ind => ({ label: ind.name, value: ind.id })));
    }
  };

  const calculateDiscountPercentage = useCallback((original: string, promotional: string) => {
    const originalValue = parseFloat(original);
    const promotionalValue = parseFloat(promotional);
    if (originalValue > 0 && promotionalValue > 0) {
      const percentage = ((originalValue - promotionalValue) / originalValue) * 100;
      setDiscountPercentage(percentage.toFixed(2));
    } else {
      setDiscountPercentage('');
    }
  }, []);


  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      Alert.alert('Error signing out', error.message)
    } else {
      router.replace('/login')
    }
  }

  const handleAddPromotion = async () => {
    // Re-fetch the user role to ensure it's up to date
    await fetchUserRole();
  
    if (userRole !== 'seller') {
      Alert.alert(
        'Role Changed',
        'Your role has been changed. You can no longer add promotions. Please log out and log in again.',
        [{ text: 'OK', onPress: handleSignOut }]
      );
      return;
    }
  
    if (!title || !description || !industry || !bannerImage || !user || !quantity) {
      Alert.alert('Error', 'Please fill in all fields, upload a banner image, and set a quantity.');
      return;
    }
  
    try {
      const fileExt = bannerImage.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;
  
      const { error: uploadError } = await supabase.storage
        .from('promotion-banners')
        .upload(filePath, { uri: bannerImage } as unknown as File, { contentType: `image/${fileExt}` });
  
      if (uploadError) throw new Error('Failed to upload image: ' + uploadError.message);
  
      const { data: publicFile } = await supabase.storage
        .from('promotion-banners')
        .getPublicUrl(filePath);
  
      if (!publicFile || !publicFile.publicUrl) throw new Error('Failed to get public URL');
  
      // Check the role again just before inserting the promotion
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
  
      if (userError) throw new Error('Failed to verify user role');
      if (userData.role !== 'seller') {
        Alert.alert(
          'Role Changed',
          'Your role has changed during this operation. The promotion was not added. Please log out and log in again.',
          [{ text: 'OK', onPress: handleSignOut }]
        );
        return;
      }
  
      const { error: insertError } = await supabase
        .from('promotions')
        .insert({
          title,
          description,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          seller_id: user.id,
          industry_id: industry,
          banner_url: publicFile.publicUrl,
          is_approved: false,
          quantity: parseInt(quantity),
          used_quantity: 0,
          unique_code: `PROMO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          original_price: originalPrice ? parseFloat(originalPrice) : null,
          promotional_price: parseFloat(promotionalPrice),
        });
  
      if (insertError) throw new Error(insertError.message);
  
      Alert.alert('Success', 'Promotion added successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  };


  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setBannerImage(result.assets[0].uri);
    }
  };

  const onChangeStartDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || startDate;
    setShowStartPicker(false);
    setStartDate(currentDate);
  };

  const onChangeEndDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || endDate;
    setShowEndPicker(false);
    setEndDate(currentDate);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  if (userRole !== 'seller') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Only sellers can add promotions.</Text>
        <Text style={styles.errorText}>Your current role: {userRole || 'Not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleSignOut}>
          <Text style={styles.backButtonText}>Please Sign out!</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={['#4a90e2', '#63b3ed']}
          style={styles.header}
        >
          <Ionicons name="add-circle-outline" size={60} color="#ffffff" />
          <Text style={styles.headerText}>Create New Promotion</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <InputField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Enter promotion title"
          />

          <InputField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Enter promotion description"
            multiline
            numberOfLines={4}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Industry</Text>
            <RNPickerSelect
              onValueChange={(value: number | null) => setIndustry(value)}
              items={industries}
              style={pickerSelectStyles}
              value={industry}
              placeholder={{ label: "Select an industry", value: null }}
            />
          </View>

          <View style={styles.priceContainer}>
            <InputField
              label="Original Price"
              value={originalPrice}
              onChangeText={(text: string) => {
                setOriginalPrice(text);
                calculateDiscountPercentage(text, promotionalPrice);
              }}
              placeholder="Original price"
              keyboardType="numeric"
              style={styles.halfWidth}
            />

            <InputField
              label="Promotional Price"
              value={promotionalPrice}
              onChangeText={(text: string) => {
                setPromotionalPrice(text);
                calculateDiscountPercentage(originalPrice, text);
              }}
              placeholder="Promo price"
              keyboardType="numeric"
              style={styles.halfWidth}
            />
          </View>

          {discountPercentage && (
            <View style={styles.discountContainer}>
              <Text style={styles.discountText}>Discount: {discountPercentage}%</Text>
            </View>
          )}

          <View style={styles.dateContainer}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                <Text style={styles.dateButtonText}>{startDate.toDateString()}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                <Text style={styles.dateButtonText}>{endDate.toDateString()}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {(showStartPicker || showEndPicker) && (
            <DateTimePicker
              value={showStartPicker ? startDate : endDate}
              mode="date"
              display="default"
              onChange={showStartPicker ? onChangeStartDate : onChangeEndDate}
            />
          )}

          <InputField
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter promotion quantity"
            keyboardType="numeric"
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Banner Image</Text>
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#4a90e2" />
              <Text style={styles.imageButtonText}>Select Banner Image</Text>
            </TouchableOpacity>
          </View>

          {bannerImage && (
            <Image source={{ uri: bannerImage }} style={styles.bannerPreview} />
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddPromotion}>
            <Text style={styles.addButtonText}>Create Promotion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#ffffff',
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#4a5568',
  },
  input: {
    height: 50,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#2d3748',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dateButton: {
    height: 50,
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2d3748',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderColor: '#4a90e2',
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  imageButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  bannerPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginBottom: 20,
    borderRadius: 10,
  },
  addButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  discountContainer: {
    backgroundColor: '#ebf8ff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  discountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4a90e2',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#e53e3e',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4a90e2',
    padding: 15,
    borderRadius: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    color: '#2d3748',
    paddingRight: 30,
    backgroundColor: 'white',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    color: '#2d3748',
    paddingRight: 30,
    backgroundColor: 'white',
  },
});
