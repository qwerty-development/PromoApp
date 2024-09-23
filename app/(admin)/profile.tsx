import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, useColorScheme, Image } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, ColorScheme } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AdminProfile {
  id: string;
  email: string;
  name: string | null;
  contact_number: string | null;
  avatar_url: string | null;
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
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Sign Out", 
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } else {
              router.replace('/(auth)/login');
            }
          }
        }
      ]
    );
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
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles(colors).header}
      >
        <Image
          source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
          style={styles(colors).avatar}
        />
        <Text style={styles(colors).title}>{profile.name || 'Admin'}</Text>
        <Text style={styles(colors).subtitle}>{profile.email}</Text>
        <Text style={styles(colors).subtitle}>{profile.contact_number}</Text>
      </LinearGradient>

      <BlurView intensity={80} tint={colorScheme} style={styles(colors).profileContainer}>
        <View style={styles(colors).profileItem}>
          <FontAwesome5 name="user" size={20} color={colors.text} />
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
          <FontAwesome5 name="phone" size={20} color={colors.text} />
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
        
        <TouchableOpacity style={styles(colors).updateButton} onPress={updateProfile}>
          <FontAwesome5 name="save" size={20} color={colors.background} />
          <Text style={styles(colors).buttonText}>Update Profile</Text>
        </TouchableOpacity>
      </BlurView>
      
      <TouchableOpacity style={styles(colors).signOutButton} onPress={handleSignOut}>
        <FontAwesome5 name="sign-out-alt" size={20} color={colors.background} />
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
    paddingBottom: 40,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.background,
    opacity: 0.8,
    marginTop: 5,
  },
  profileContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    padding: 20,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
    color: colors.text,
    width: 120,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: colors.text,
  },
  updateButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  signOutButton: {
    backgroundColor: colors.error,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginTop: 20,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
  },
});