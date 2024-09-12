import React from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const paymentMethods = [
  { id: '1', type: 'Visa', last4: '4242' },
  { id: '2', type: 'Mastercard', last4: '5555' },
];

export default function PaymentMethodsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderPaymentMethod = ({ item }:any) => (
    <View style={[styles.paymentMethod, { backgroundColor: colors.card }]}>
      <Ionicons name="card-outline" size={24} color={colors.text} />
      <View style={styles.paymentInfo}>
        <ThemedText style={styles.paymentType}>{item.type}</ThemedText>
        <ThemedText style={styles.paymentLast4}>**** {item.last4}</ThemedText>
      </View>
      <TouchableOpacity onPress={() => {}}>
        <Ionicons name="trash-outline" size={24} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={paymentMethods}
        renderItem={renderPaymentMethod}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TouchableOpacity style={[styles.addButton, { backgroundColor: colors.primary }]}>
            <Ionicons name="add" size={24} color={colors.background} />
            <ThemedText style={[styles.addButtonText, { color: colors.background }]}>Add Payment Method</ThemedText>
          </TouchableOpacity>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  addButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  paymentType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  paymentLast4: {
    fontSize: 14,
    opacity: 0.7,
  },
});