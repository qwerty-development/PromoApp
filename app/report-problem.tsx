import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function ReportProblemScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [problem, setProblem] = useState('');

  const handleSubmit = () => {
    if (problem.trim() === '') {
      Alert.alert('Error', 'Please describe the problem before submitting.');
      return;
    }
    // TODO: Implement the logic to submit the problem report
    Alert.alert('Success', 'Your problem report has been submitted. We will look into it shortly.');
    setProblem('');
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText style={styles.label}>Describe the problem:</ThemedText>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
        multiline
        numberOfLines={6}
        value={problem}
        onChangeText={setProblem}
        placeholder="Please provide details about the issue you're experiencing..."
        placeholderTextColor={colors.tabIconDefault}
      />
      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
      >
        <ThemedText style={[styles.submitButtonText, { color: colors.background }]}>
          Submit Report
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