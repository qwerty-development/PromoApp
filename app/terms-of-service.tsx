import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function TermsOfServiceScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.title}>Terms of Service</ThemedText>
        <ThemedText style={styles.paragraph}>
          Welcome to our app. By using this app, you agree to these terms. Please read them carefully.
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          1. Use of the app: You may use this app only in compliance with these terms and all applicable laws.
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          2. Your account: You are responsible for maintaining the confidentiality of your account and password.
        </ThemedText>
        <ThemedText style={styles.paragraph}>
          3. Privacy: Your privacy is important to us. Please refer to our Privacy Policy for information on how we collect, use and disclose information from our users.
        </ThemedText>
        {/* Add more terms as needed */}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
});