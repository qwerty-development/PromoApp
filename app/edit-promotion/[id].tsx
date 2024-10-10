import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function EditPromotionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  console.log("Rendering EditPromotionScreen with id:", id);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Edit Promotion Screen</Text>
      <Text style={styles.text}>Promotion ID: {id}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'purple', // This will make it very obvious
  },
  text: {
    color: 'white',
    fontSize: 20,
    marginBottom: 10,
  },
});