import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  TextInput,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    contactNumber: '',
    role: '',
    businessName: '',
    businessLogo: '',
    status: '',
    totalItemsBought: 0,
    totalMoneySaved: 0,
    totalMoneySpent: 0,
  });
  const [isEditing, setIsEditing] = useState(false);

  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  async function fetchProfile() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
    } else if (data) {
      setProfile({
        name: data.name || '',
        email: data.email || '',
        contactNumber: data.contact_number || '',
        role: data.role || '',
        businessName: data.business_name || '',
        businessLogo: data.business_logo || '',
        status: data.status || '',
        totalItemsBought: data.total_items_bought || 0,
        totalMoneySaved: parseFloat(data.total_money_saved) || 0,
        totalMoneySpent: parseFloat(data.total_money_spent) || 0,
      });
    }
  }

  async function updateProfile() {
    const { error } = await supabase
      .from('users')
      .update({
        name: profile.name,
        contact_number: profile.contactNumber,
      })
      .eq('id', user?.id);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error signing out', error.message);
    } else {
      router.replace('/login');
    }
  }

  const ProfileSection = ({ title, children }: any) => (
    <ThemedView style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </ThemedView>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedView style={[styles.header, { borderBottomColor: colors.border }]}>
        {profile.businessLogo ? (
          <Image source={{ uri: profile.businessLogo }} style={styles.logo} />
        ) : (
          <Ionicons name="person-circle-outline" size={100} color={colors.primary} />
        )}
        <ThemedText style={styles.headerText}>{profile.name || 'Unnamed User'}</ThemedText>
        <ThemedText style={styles.subHeaderText}>{profile.email}</ThemedText>
        <ThemedText style={[styles.roleText, { color: colors.primary }]}>{profile.role.toUpperCase()}</ThemedText>
      </ThemedView>

      <ProfileSection title="Personal Information">
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Name:</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={profile.name}
              onChangeText={(text: string) => setProfile({ ...profile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor={colors.text}
            />
          ) : (
            <ThemedText style={styles.infoValue}>{profile.name}</ThemedText>
          )}
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Contact:</ThemedText>
          {isEditing ? (
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={profile.contactNumber}
              onChangeText={(text: string) => setProfile({ ...profile, contactNumber: text })}
              placeholder="Enter your contact number"
              placeholderTextColor={colors.text}
              keyboardType="phone-pad"
            />
          ) : (
            <ThemedText style={styles.infoValue}>{profile.contactNumber}</ThemedText>
          )}
        </View>
      </ProfileSection>

      {profile.role === 'seller' && (
        <ProfileSection title="Business Information">
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Business Name:</ThemedText>
            <ThemedText style={styles.infoValue}>{profile.businessName}</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <ThemedText style={styles.infoLabel}>Status:</ThemedText>
            <ThemedText style={[styles.infoValue, styles.statusText, { color: colors.primary }]}>{profile.status}</ThemedText>
          </View>
        </ProfileSection>
      )}

      <ProfileSection title="Activity Summary">
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Items Bought:</ThemedText>
          <ThemedText style={styles.infoValue}>{profile.totalItemsBought}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Money Saved:</ThemedText>
          <ThemedText style={styles.infoValue}>${profile.totalMoneySaved.toFixed(2)}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={styles.infoLabel}>Money Spent:</ThemedText>
          <ThemedText style={styles.infoValue}>${profile.totalMoneySpent.toFixed(2)}</ThemedText>
        </View>
      </ProfileSection>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={() => setIsEditing(!isEditing)}>
          <ThemedText style={styles.buttonText}>
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </ThemedText>
        </TouchableOpacity>

        {isEditing && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={updateProfile}>
            <ThemedText style={styles.buttonText}>Update Profile</ThemedText>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={handleSignOut}>
          <ThemedText style={styles.buttonText}>Sign Out</ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subHeaderText: {
    fontSize: 16,
    marginTop: 5,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  section: {
    marginTop: 20,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  statusText: {
    textTransform: 'capitalize',
  },
  input: {
    flex: 2,
    height: 40,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  buttonContainer: {
    padding: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});