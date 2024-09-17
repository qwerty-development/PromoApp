import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, useColorScheme } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, ColorScheme } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
}

export default function AdminProfileScreen() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme;

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  async function fetchProfile() {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to fetch profile. Please try again.');
    } else if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
      setPhoneNumber(data.phone_number || '');
    }
    setIsLoading(false);
  }

  async function updateProfile() {
    if (!user) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('users')
      .update({
        name: fullName,
        contact_number: phoneNumber,
      })
      .eq('id', user.id);

    setIsLoading(false);

    if (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } else {
      Alert.alert('Success', 'Profile updated successfully');
      fetchProfile();
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } else {
      router.replace('/(auth)/login');
    }
  }

  if (isLoading) {
    return (
      <View style={[styles(colors).container, styles(colors).centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles(colors).container, styles(colors).centered]}>
        <Text style={styles(colors).errorText}>Failed to load profile. Please try again later.</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles(colors).container]} 
      contentContainerStyle={styles(colors).contentContainer}
    >

      <BlurView intensity={80}  style={styles(colors).profileContainer}>
        <View style={styles(colors).profileItem}>
          <Ionicons name="mail-outline" size={24} color={colors.text} />
          <Text style={styles(colors).label}>Email:</Text>
          <Text style={styles(colors).value}>{profile.email}</Text>
        </View>
        
        <View style={styles(colors).profileItem}>
          <Ionicons name="person-outline" size={24} color={colors.text} />
          <Text style={styles(colors).label}>Full Name:</Text>
          <TextInput
            style={styles(colors).input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.tabIconDefault}
          />
        </View>
        
        <View style={styles(colors).profileItem}>
          <Ionicons name="call-outline" size={24} color={colors.text} />
          <Text style={styles(colors).label}>Phone Number:</Text>
          <TextInput
            style={styles(colors).input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.tabIconDefault}
            keyboardType="phone-pad"
          />
        </View>
        
        <TouchableOpacity style={styles(colors).button} onPress={updateProfile}>
          <Text style={styles(colors).buttonText}>Update Profile</Text>
        </TouchableOpacity>
      </BlurView>
      
      <TouchableOpacity style={[styles(colors).button, styles(colors).signOutButton]} onPress={handleSignOut}>
        <Text style={styles(colors).buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: ColorScheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: 20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.card,
    textAlign: 'center',
  },
  profileContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
    color: colors.text,
  },
  value: {
    fontSize: 16,
    marginLeft: 10,
    color: colors.text,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutButton: {
    backgroundColor: colors.error,
    marginTop: 20,
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
});