import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export default function ProfileScreen() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  async function fetchUserProfile() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
    }
  }

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleToggleNotifications = () => {
    setIsNotificationsEnabled(!isNotificationsEnabled);
    // TODO: Implement actual notification toggle logic
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@yourapp.com');
  };

  const handleTerms = () => {
    router.push('/terms-of-service');
  };

  const handlePrivacy = () => {
    router.push('/privacy-policy');
  };

  const handlePaymentMethods = () => {
    router.push('/payment-methods');
  };

  const handleNotificationSettings = () => {
    router.push('/notification-settings');
  };

  const handleHelpCenter = () => {
    router.push('/help-center');
  };

  const handleReportProblem = () => {
    router.push('/report-problem');
  };

  const handleGiveFeedback = () => {
    router.push('/give-feedback');
  };

  const renderSection = (title: string, icon: string, onPress: () => void) => (
    <TouchableOpacity style={styles.sectionButton} onPress={onPress}>
      <View style={styles.sectionIconContainer}>
        <FontAwesome5 name={icon} size={18} color={colors.primary} />
      </View>
      <ThemedText style={styles.sectionButtonText}>{title}</ThemedText>
      <Ionicons name="chevron-forward" size={24} color={colors.text} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <BlurView intensity={100} tint={colorScheme} style={styles.headerContainer}>
        <Image
          source={{ uri: userProfile?.avatar_url || 'https://via.placeholder.com/150' }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>{userProfile?.name || 'User Name'}</ThemedText>
          <ThemedText style={styles.userEmail}>{userProfile?.email || 'user@example.com'}</ThemedText>
        </View>
        <TouchableOpacity style={[styles.editButton, { backgroundColor: colors.primary }]} onPress={handleEditProfile}>
          <ThemedText style={[styles.editButtonText, { color: colors.background }]}>Edit Profile</ThemedText>
        </TouchableOpacity>
      </BlurView>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>23</ThemedText>
          <ThemedText style={styles.statLabel}>Claimed</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>15</ThemedText>
          <ThemedText style={styles.statLabel}>Redeemed</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>$142</ThemedText>
          <ThemedText style={styles.statLabel}>Saved</ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Account</ThemedText>
        {renderSection('Personal Information', 'user-circle', handleEditProfile)}
        {renderSection('Payment Methods', 'credit-card', handlePaymentMethods)}
        {renderSection('Notification Settings', 'bell', handleNotificationSettings)}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Support</ThemedText>
        {renderSection('Help Center', 'question-circle', handleHelpCenter)}
        {renderSection('Report a Problem', 'exclamation-circle', handleReportProblem)}
        {renderSection('Give Feedback', 'comment-alt', handleGiveFeedback)}
      </View>

      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
        {renderSection('Terms of Service', 'file-contract', handleTerms)}
        {renderSection('Privacy Policy', 'shield-alt', handlePrivacy)}
      </View>

      <TouchableOpacity style={[styles.signOutButton, { backgroundColor: colors.error }]} onPress={handleSignOut}>
        <ThemedText style={[styles.signOutButtonText, { color: colors.background }]}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  editButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    marginHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  sectionIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 10,
  },
  sectionButtonText: {
    flex: 1,
    fontSize: 16,
  },
  signOutButton: {
    margin: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});