import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent, Event } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';

interface Industry {
  label: string;
  value: number;
}

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
  const { user } = useAuth();

  useEffect(() => {
    fetchIndustries();
  }, []);

  async function fetchIndustries() {
    const { data, error } = await supabase.from('industries').select('*');
    if (error) {
      console.error('Error fetching industries:', error);
    } else if (data) {
      setIndustries(data.map(ind => ({ label: ind.name, value: ind.id })));
    }
  }

  async function handleAddPromotion() {
    if (!title || !description || !industry || !bannerImage || !user) {
      Alert.alert('Error', 'Please fill in all fields and upload a banner image.');
      return;
    }

    try {
      const fileExt = bannerImage.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('promotion-banners')
        .upload(filePath, { uri: bannerImage } as unknown as File, { contentType: `image/${fileExt}` });

      if (uploadError) {
        throw new Error('Failed to upload image: ' + uploadError.message);
      }

      const { data: publicFile } = await supabase.storage
        .from('promotion-banners')
        .getPublicUrl(filePath);

      if (!publicFile || !publicFile.publicUrl) {
        throw new Error('Failed to get public URL');
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
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      Alert.alert('Success', 'Promotion added successfully');
      resetForm();
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    }
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(new Date());
    setBannerImage(null);
    setIndustry(null);
  }

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
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
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="add-circle-outline" size={100} color="#0a7ea4" />
        <Text style={styles.headerText}>Add New Promotion</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Title:</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter promotion title"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Enter promotion description"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Industry:</Text>
        <RNPickerSelect
          onValueChange={(value: number | null) => setIndustry(value)}
          items={industries}
          style={pickerSelectStyles}
          value={industry}
          placeholder={{ label: "Select an industry", value: null }}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Start Date:</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Text>{startDate.toDateString()}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="default"
            onChange={onChangeStartDate}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>End Date:</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Text>{endDate.toDateString()}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="default"
            onChange={onChangeEndDate}
          />
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Banner Image:</Text>
        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          <Text>Select Banner Image</Text>
        </TouchableOpacity>
        {bannerImage && <Image source={{ uri: bannerImage }} style={styles.bannerPreview} />}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddPromotion}>
        <Text style={styles.addButtonText}>Add Promotion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#555',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  dateButton: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  imageButton: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    marginTop: 10,
    borderRadius: 10,
  },
  addButton: {
    backgroundColor: '#0a7ea4',
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

});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: 'white',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: 'white',
  },
})


