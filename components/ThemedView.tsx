import React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export function ThemedView({ style, ...props }: ViewProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        { backgroundColor: colors.background },
        style
      ]}
      {...props}
    />
  );
}