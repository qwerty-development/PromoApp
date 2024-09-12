import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GiveFeedbackScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  const handleSubmit = () => {
    if (feedback.trim() === '') {
      Alert.alert('Error', 'Please provide feedback before submitting.');
      return;
    }
    // TODO: Implement the logic to submit the feedback
    Alert.alert('Success', 'Thank you for your feedback!');
    setFeedback('');
    setRating(0);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText style={styles.label}>Rate your experience:</ThemedText>
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={32}
              color={star <= rating ? colors.primary : colors.tabIconDefault}
            />
          </TouchableOpacity>
        ))}
      </View>
      <ThemedText style={styles.label}>Your feedback:</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        multiline
        numberOfLines={6}
        value={feedback}
        onChangeText={setFeedback}
        placeholder="We'd love to hear your thoughts..."
        placeholderTextColor={colors.tabIconDefault}
      />
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
      >
        <ThemedText style={[styles.submitButtonText, { color: colors.background }]}>
          Submit Feedback
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});