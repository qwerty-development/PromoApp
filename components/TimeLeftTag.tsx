import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface TimeLeftTagProps {
  endDate: string;
}

const TimeLeftTag: React.FC<TimeLeftTagProps> = ({ endDate }) => {
  const { daysLeft, color } = useMemo(() => {
    const now = new Date();
    const end = new Date(endDate);
    const timeDiff = end.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let color;
    if (daysLeft > 7) {
      color = Colors.light.success; // Green
    } else if (daysLeft >= 3) {
      color = Colors.light.warning; // Yellow
    } else {
      color = Colors.light.error; // Red
    }

    return { daysLeft, color };
  }, [endDate]);

  return (
    <View style={[styles.tagContainer, { backgroundColor: color }]}>
      <ThemedText style={styles.tagText}>
        {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Ended'}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  tagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  tagText: {
    color: Colors.light.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default TimeLeftTag;
