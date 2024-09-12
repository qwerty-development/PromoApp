import React from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const helpTopics = [
  { id: '1', title: 'How to claim a promotion' },
  { id: '2', title: 'Troubleshooting QR code scanning' },
  { id: '3', title: 'Managing your account' },
  { id: '4', title: 'Payment issues' },
  { id: '5', title: 'Contact support' },
];

export default function HelpCenterScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderHelpTopic = ({ item }:any) => (
    <TouchableOpacity style={[styles.topicItem, { backgroundColor: colors.card }]}>
      <ThemedText style={styles.topicTitle}>{item.title}</ThemedText>
      <Ionicons name="chevron-forward" size={24} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={helpTopics}
        renderItem={renderHelpTopic}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ThemedText style={styles.headerText}>
            How can we help you today?
          </ThemedText>
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
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  topicItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  topicTitle: {
    fontSize: 16,
  },
});