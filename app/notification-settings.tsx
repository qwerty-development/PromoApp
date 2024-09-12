import React, { useState } from 'react';
import { StyleSheet, View, Switch } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);

  const renderSetting = (title: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined, value: boolean | undefined, onValueChange: ((value: boolean) => Promise<void> | void) | null | undefined) => (
    <View style={styles.settingItem}>
      <ThemedText style={styles.settingTitle}>{title}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={value ? colors.background : colors.text}
      />
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderSetting('Push Notifications', pushEnabled, setPushEnabled)}
      {renderSetting('Email Notifications', emailEnabled, setEmailEnabled)}
      {renderSetting('Promotional Notifications', promotionsEnabled, setPromotionsEnabled)}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  settingTitle: {
    fontSize: 16,
  },
});