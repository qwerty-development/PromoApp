import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function PrivacyPolicyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderSection = (title: string, content: string) => (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: colors.primary }]}>{title}</ThemedText>
      <ThemedText style={styles.paragraph}>{content}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={[styles.title, { color: colors.text }]}>Privacy Policy</ThemedText>
        
        <ThemedText style={styles.lastUpdated}>Last updated: September 12, 2023</ThemedText>
        
        <ThemedText style={styles.introText}>
          Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
        </ThemedText>

        {renderSection("Information We Collect", 
          "We collect information that you provide directly to us when you register for an account, create or modify your profile, set preferences, or make purchases through the app. This information may include your name, email address, phone number, and payment information."
        )}

        {renderSection("How We Use Your Information", 
          "We use the information we collect to provide, maintain, and improve our services, to develop new ones, and to protect our company and our users. We also use this information to offer you tailored content like giving you more relevant search results and ads."
        )}

        {renderSection("Sharing of Your Information", 
          "We do not share, sell, rent or trade your personal information with third parties for their commercial purposes. We may share your information with third-party service providers to facilitate our services, provide service on our behalf, perform service-related services, or assist us in analyzing how our service is used."
        )}

        {renderSection("Data Security", 
          "We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse."
        )}

        {renderSection("Your Rights", 
          "You may at any time review or change the information in your account or terminate your account by logging into your account settings and updating your account. Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases."
        )}

        {renderSection("Changes to This Privacy Policy", 
          "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the Last updated date at the top of this Privacy Policy."
        )}

        {renderSection("Contact Us", 
          "If you have any questions about this Privacy Policy, please contact us at: privacy@yourapp.com"
        )}
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
    marginBottom: 10,
  },
  lastUpdated: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  introText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
  },
});