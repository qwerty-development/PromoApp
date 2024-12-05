import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoleCheck } from '@/lib/useRoleCheck';

interface Industry {
  label: string;
  value: number;
}

interface FormErrors {
  title: boolean;
  description: boolean;
  industry: boolean;
  quantity: boolean;
  originalPrice: boolean;
  promotionalPrice: boolean;
  bannerImage: boolean;
  dates: boolean;
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
  error?: boolean;
  required?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  error, 
  required, 
  ...props 
}) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>
      {label} {required && <Text style={styles.required}>*</Text>}
    </Text>
    <TextInput
      style={[
        styles.input,
        props.style,
        error && styles.inputError,
        props.multiline && styles.multilineInput
      ]}
      placeholderTextColor="#999"
      {...props}
    />
    {error && <Text style={styles.errorText}>This field is required</Text>}
  </View>
);

export default function AddPromotionScreen() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(),
    bannerImage: null as string | null,
    industry: null as number | null,
    quantity: '',
    originalPrice: '',
    promotionalPrice: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({
    title: false,
    description: false,
    industry: false,
    quantity: false,
    originalPrice: false,
    promotionalPrice: false,
    bannerImage: false,
    dates: false,
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const { hasRequiredRole, isLoading: isRoleLoading } = useRoleCheck('seller', 30000);

  useEffect(() => {
    fetchIndustries();
  }, []);

  const fetchIndustries = async () => {
    try {
      const { data, error } = await supabase.from('industries').select('*');
      if (error) throw error;
      if (data) {
        setIndustries(data.map(ind => ({ label: ind.name, value: ind.id })));
      }
      setIsLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch industries');
      console.error('Error fetching industries:', error);
    }
  };

  const validateForm = (): boolean => {
    const errors = {
      title: !formData.title.trim(),
      description: !formData.description.trim(),
      industry: !formData.industry,
      quantity: !formData.quantity.trim(),
      originalPrice: !formData.originalPrice.trim(),
      promotionalPrice: !formData.promotionalPrice.trim(),
      bannerImage: !formData.bannerImage,
      dates: formData.endDate < formData.startDate,
    };

    setFormErrors(errors);
    return !Object.values(errors).some(error => error);
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

  const handleAddPromotion = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Please fill in all required fields correctly');
      return;
    }

    setIsSubmitting(true);

    try {
      const fileExt = formData.bannerImage!.split('.').pop();
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotion-banners')
        .upload(filePath, { uri: formData.bannerImage } as unknown as File);

      if (uploadError) throw new Error('Failed to upload image');

      const { data: publicFile } = await supabase.storage
        .from('promotion-banners')
        .getPublicUrl(filePath);

      if (!publicFile?.publicUrl) throw new Error('Failed to get public URL');

      const promotionData = {
        title: formData.title,
        description: formData.description,
        start_date: formData.startDate.toISOString().split('T')[0],
        end_date: formData.endDate.toISOString().split('T')[0],
        seller_id: user!.id,
        industry_id: formData.industry,
        banner_url: publicFile.publicUrl,
        is_approved: false,
        quantity: parseInt(formData.quantity),
        used_quantity: 0,
        unique_code: `PROMO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        original_price: parseFloat(formData.originalPrice),
        promotional_price: parseFloat(formData.promotionalPrice),
      };

      const { error: insertError } = await supabase
        .from('promotions')
        .insert(promotionData);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Promotion added successfully and sent for approval');
      router.back();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, bannerImage: result.assets[0].uri }));
        setFormErrors(prev => ({ ...prev, bannerImage: false }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  if (isLoading || isRoleLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['#4a90e2', '#63b3ed']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Ionicons name="add-circle-outline" size={60} color="#ffffff" />
            <Text style={styles.headerText}>Create New Promotion</Text>
            <Text style={styles.headerSubText}>Fill in the details below</Text>
          </View>
        </LinearGradient>

        <View style={styles.formContainer}>
          <InputField
            label="Title"
            value={formData.title}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, title: text }));
              setFormErrors(prev => ({ ...prev, title: false }));
            }}
            placeholder="Enter promotion title"
            error={formErrors.title}
            required
          />

          <InputField
            label="Description"
            value={formData.description}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, description: text }));
              setFormErrors(prev => ({ ...prev, description: false }));
            }}
            placeholder="Enter promotion description"
            multiline
            numberOfLines={4}
            error={formErrors.description}
            required
          />

<View style={styles.inputContainer}>
            <Text style={styles.label}>
              Industry <Text style={styles.required}>*</Text>
            </Text>
            <RNPickerSelect
              onValueChange={(value) => {
                setFormData(prev => ({ ...prev, industry: value }));
                setFormErrors(prev => ({ ...prev, industry: false }));
              }}
              items={industries}
              style={{
                ...pickerSelectStyles,
                iconContainer: {
                  top: 10,
                  right: 12,
                },
                inputAndroid: {
                  ...pickerSelectStyles.inputAndroid,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: formErrors.industry ? '#e53e3e' : '#e2e8f0',
                  borderRadius: 10,
                  padding: 10,
                  paddingRight: 30, // to ensure text doesn't go behind the icon
                },
                inputIOS: {
                  ...pickerSelectStyles.inputIOS,
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: formErrors.industry ? '#e53e3e' : '#e2e8f0',
                  borderRadius: 10,
                  padding: 10,
                  paddingRight: 30,
                }
              }}
              value={formData.industry}
              useNativeAndroidPickerStyle={false}
              placeholder={{
                label: "Select an industry",
                value: null,
                color: '#9EA0A4',
              }}
              Icon={() => {
                return <Ionicons name="chevron-down" size={24} color="#4a5568" />;
              }}
            />
            {formErrors.industry && (
              <Text style={styles.errorText}>Please select an industry</Text>
            )}
          </View>

          <View style={styles.priceContainer}>
            <InputField
              label="Original Price"
              value={formData.originalPrice}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, originalPrice: text }));
                setFormErrors(prev => ({ ...prev, originalPrice: false }));
                calculateDiscountPercentage(text, formData.promotionalPrice);
              }}
              placeholder="Original price"
              keyboardType="numeric"
              style={styles.halfWidth}
              error={formErrors.originalPrice}
              required
            />

            <InputField
              label="Promotional Price"
              value={formData.promotionalPrice}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, promotionalPrice: text }));
                setFormErrors(prev => ({ ...prev, promotionalPrice: false }));
                calculateDiscountPercentage(formData.originalPrice, text);
              }}
              placeholder="Promo price"
              keyboardType="numeric"
              style={styles.halfWidth}
              error={formErrors.promotionalPrice}
              required
            />
          </View>

          {discountPercentage && (
            <View style={styles.discountContainer}>
              <Text style={styles.discountText}>Discount: {discountPercentage}%</Text>
            </View>
          )}

          <View style={styles.dateContainer}>
            <Pressable 
              style={[styles.halfWidth, formErrors.dates && styles.inputError]} 
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.label}>
                Start Date <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateButton}>
                <Text style={styles.dateButtonText}>
                  {formData.startDate.toLocaleDateString()}
                </Text>
              </View>
            </Pressable>

            <Pressable 
              style={[styles.halfWidth, formErrors.dates && styles.inputError]}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.label}>
                End Date <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.dateButton}>
                <Text style={styles.dateButtonText}>
                  {formData.endDate.toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          </View>

          {formErrors.dates && (
            <Text style={styles.errorText}>
              End date must be after start date
            </Text>
          )}

          {(showStartPicker || showEndPicker) && (
            <DateTimePicker
              value={showStartPicker ? formData.startDate : formData.endDate}
              mode="date"
              display="default"
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                if (selectedDate) {
                  setFormData(prev => ({
                    ...prev,
                    [showStartPicker ? 'startDate' : 'endDate']: selectedDate
                  }));
                  setFormErrors(prev => ({ ...prev, dates: false }));
                }
                setShowStartPicker(false);
                setShowEndPicker(false);
              }}
              minimumDate={new Date()}
            />
          )}

          <InputField
            label="Quantity"
            value={formData.quantity}
            onChangeText={(text) => {
              setFormData(prev => ({ ...prev, quantity: text }));
              setFormErrors(prev => ({ ...prev, quantity: false }));
            }}
            placeholder="Enter promotion quantity"
            keyboardType="numeric"
            error={formErrors.quantity}
            required
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Banner Image <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={[
                styles.imageButton,
                formErrors.bannerImage && styles.inputError
              ]} 
              onPress={pickImage}
            >
              <Ionicons 
                name={formData.bannerImage ? "image" : "image-outline"} 
                size={24} 
                color="#4a90e2" 
              />
              <Text style={styles.imageButtonText}>
                {formData.bannerImage ? "Change Image" : "Select Banner Image"}
              </Text>
            </TouchableOpacity>
            {formErrors.bannerImage && (
              <Text style={styles.errorText}>Please select an image</Text>
            )}
          </View>

          {formData.bannerImage && (
              <Image 
                source={{ uri: formData.bannerImage }} 
                style={styles.bannerPreview} 
              />
            )}

          <TouchableOpacity 
            style={[
              styles.addButton,
              isSubmitting && styles.addButtonDisabled
            ]} 
            onPress={handleAddPromotion}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.addButtonText}>Create Promotion</Text>
            )}
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
    paddingVertical: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 5,
    opacity: 0.9,
  },
  formContainer: {
    padding: 20,
    marginTop: 10,
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
  required: {
    color: '#e53e3e',
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
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  inputError: {
    borderColor: '#e53e3e',
    borderWidth: 2,
  },
  errorText: {
    color: '#e53e3e',
    fontSize: 12,
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: 'white',
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
    marginBottom: 10,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  addButtonDisabled: {
    backgroundColor: '#9cb3c9',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  discountContainer: {
    backgroundColor: '#ebf8ff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a90e2',
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
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#2d3748',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#2d3748',
    paddingRight: 30,
  },
  placeholder: {
    color: '#999',
  },
});