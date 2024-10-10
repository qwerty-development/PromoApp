import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface Industry {
  id: number;
  name: string;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  industry_id: number | null;
  original_price: number;
  promotional_price: number;
  quantity: number;
}

interface EditPromotionModalProps {
  promotion: Promotion | null;
  onClose: () => void;
  onUpdateSuccess: () => void;
}

export default function EditPromotionModal({ promotion, onClose, onUpdateSuccess }: EditPromotionModalProps) {
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [updating, setUpdating] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    setEditingPromotion(promotion);
    fetchIndustries();
  }, [promotion]);

  const fetchIndustries = async () => {
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
  };

  const handleUpdate = async () => {
    if (!editingPromotion) {
      Alert.alert('Error', 'No promotion data to update');
      return;
    }

    setUpdating(true);

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
      onUpdateSuccess();
    } catch (error) {
      console.error('Error updating promotion:', error);
      Alert.alert('Error', 'Failed to update promotion');
    } finally {
      setUpdating(false);
    }
  };

  if (!editingPromotion) return null;

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.scrollView}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <ThemedText style={styles.label}>Title</ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={editingPromotion.title}
          onChangeText={(text) => setEditingPromotion({ ...editingPromotion, title: text })}
          placeholder="Enter promotion title"
          placeholderTextColor={colors.text}
        />

        <ThemedText style={styles.label}>Description</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea, { color: colors.text, backgroundColor: colors.card }]}
          value={editingPromotion.description}
          onChangeText={(text) => setEditingPromotion({ ...editingPromotion, description: text })}
          placeholder="Enter promotion description"
          placeholderTextColor={colors.text}
          multiline
        />

        <ThemedText style={styles.label}>Start Date</ThemedText>
        <DateTimePicker
          value={new Date(editingPromotion.start_date)}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const currentDate = selectedDate || new Date(editingPromotion.start_date);
            setEditingPromotion({ ...editingPromotion, start_date: currentDate.toISOString() });
          }}
          textColor={colors.text}
        />

        <ThemedText style={styles.label}>End Date</ThemedText>
        <DateTimePicker
          value={new Date(editingPromotion.end_date)}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            const currentDate = selectedDate || new Date(editingPromotion.end_date);
            setEditingPromotion({ ...editingPromotion, end_date: currentDate.toISOString() });
          }}
          textColor={colors.text}
        />

        <ThemedText style={styles.label}>Industry</ThemedText>
        <Picker
          selectedValue={editingPromotion.industry_id}
          onValueChange={(itemValue) => setEditingPromotion({ ...editingPromotion, industry_id: itemValue })}
          style={{ color: colors.background }}
        >
          <Picker.Item label="Select an industry" value={null} />
          {industries.map((industry) => (
            <Picker.Item color={colorScheme === 'dark' ? 'white' : colors.primary} key={industry.id} label={industry.name} value={industry.id} />
          ))}
        </Picker>

        <ThemedText style={styles.label}>Original Price</ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={editingPromotion.original_price.toString()}
          onChangeText={(text) => setEditingPromotion({ ...editingPromotion, original_price: parseFloat(text) || 0 })}
          keyboardType="numeric"
          placeholder="Enter original price"
          placeholderTextColor={colors.text}
        />

        <ThemedText style={styles.label}>Promotional Price</ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={editingPromotion.promotional_price.toString()}
          onChangeText={(text) => setEditingPromotion({ ...editingPromotion, promotional_price: parseFloat(text) || 0 })}
          keyboardType="numeric"
          placeholder="Enter promotional price"
          placeholderTextColor={colors.text}
        />

        <ThemedText style={styles.label}>Quantity</ThemedText>
        <TextInput
          style={[styles.input, { color: colors.text, backgroundColor: colors.card }]}
          value={editingPromotion.quantity.toString()}
          onChangeText={(text) => setEditingPromotion({ ...editingPromotion, quantity: parseInt(text) || 0 })}
          keyboardType="numeric"
          placeholder="Enter quantity"
          placeholderTextColor={colors.text}
        />

        <TouchableOpacity 
          style={[styles.button, updating && styles.disabledButton, { backgroundColor: colors.primary }]} 
          onPress={handleUpdate}
          disabled={updating}
        >
          <ThemedText style={styles.buttonText}>
            {updating ? 'Updating...' : 'Update Promotion'}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
    marginBottom:40
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});