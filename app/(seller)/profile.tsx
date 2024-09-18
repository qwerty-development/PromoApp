import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useColorScheme,
  TextInput,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { Colors, ColorScheme } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

interface SellerProfile {
  name: string;
  email: string;
  contact_number: string;
  business_name: string;
  business_logo: string;
  latitude: number | null;
  longitude: number | null;
  total_promotions: number;
  active_promotions: number;
  pending_promotions: number;
  total_sales: number;
  total_scans: number;
  pending_scans: number;
}

interface Promotion {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  quantity: number;
  used_quantity: number;
  pending: number;
  is_approved: boolean;
}

export default function SellerProfileScreen() {
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme as keyof typeof Colors] as ColorScheme;
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchProfileAndPromotions();
    }
  }, [user]);

  async function fetchProfileAndPromotions() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const { data: promotionsData, error: promotionsError } = await supabase
        .from('promotions')
        .select('*')
        .eq('seller_id', user.id);

      if (promotionsError) throw promotionsError;

      if (userData && promotionsData) {
        const now = new Date();
        const activePromotions = promotionsData.filter(
          (promo) => new Date(promo.start_date) <= now && new Date(promo.end_date) >= now && promo.is_approved
        );
        const pendingPromotions = promotionsData.filter((promo) => !promo.is_approved);
        const totalSales = promotionsData.reduce((sum, promo) => sum + promo.used_quantity, 0);
        const totalScans = promotionsData.reduce((sum, promo) => sum + promo.used_quantity + promo.pending, 0);
        const pendingScans = promotionsData.reduce((sum, promo) => sum + promo.pending, 0);

        setProfile({
          name: userData.name || '',
          email: userData.email || '',
          contact_number: userData.contact_number || '',
          business_name: userData.business_name || '',
          business_logo: userData.business_logo || '',
          latitude: userData.latitude || null,
          longitude: userData.longitude || null,
          total_promotions: promotionsData.length,
          active_promotions: activePromotions.length,
          pending_promotions: pendingPromotions.length,
          total_sales: totalSales,
          total_scans: totalScans,
          pending_scans: pendingScans,
        });

        setPromotions(promotionsData);
      }
    } catch (error) {
      console.error('Error fetching profile and promotions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    if (!user?.id || !profile) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profile.name,
          business_name: profile.business_name,
          contact_number: profile.contact_number,
          latitude: profile.latitude,
          longitude: profile.longitude,
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadImage(result.assets[0].uri);
    }
  }

  async function uploadImage(uri: string) {
    try {
      if (!uri) {
        throw new Error('Invalid image URI');
      }
  
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const blob = await response.blob();
      if (!blob) {
        throw new Error('Failed to create blob from image');
      }
  
      if (blob.size === 0) {
        throw new Error('Blob is empty');
      }
  
      const fileName = `business_logo_${user?.id}_${Date.now()}.jpg`;
  
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('logos')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
  
      if (uploadError) {
        throw uploadError;
      }
  
      if (!uploadData) {
        throw new Error('Upload successful but no data returned');
      }
  
      const { data } = supabase.storage.from('logos').getPublicUrl(fileName);
  
      if (data && data.publicUrl) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ business_logo: data.publicUrl })
          .eq('id', user?.id);
  
        if (updateError) {
          throw updateError;
        }
  
        setProfile((prev) => prev ? { ...prev, business_logo: data.publicUrl } : null);
        Alert.alert('Success', 'Profile picture updated successfully');
      } else {
        throw new Error('Failed to get public URL for uploaded image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', `Failed to update profile picture.`);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut()
    if (error) {
      Alert.alert('Error signing out', error.message)
    } else {
      router.replace('/login')
    }
  }

  async function getCurrentLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Permission to access location was denied');
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setProfile(prev => prev ? {
      ...prev,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    } : null);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>Failed to load profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={pickImage}>
          <Image
            source={{ uri: profile.business_logo || 'https://via.placeholder.com/150' }}
            style={styles.logo}
          />
          <View style={styles.editIconContainer}>
            <Ionicons name="camera" size={24} color={colors.background} />
          </View>
        </TouchableOpacity>
        {isEditing ? (
          <TextInput
            style={[styles.input, styles.businessNameInput, { color: colors.background, borderColor: colors.background }]}
            value={profile.business_name}
            onChangeText={(text) => setProfile({ ...profile, business_name: text })}
            placeholder="Business Name"
            placeholderTextColor={colors.background}
          />
        ) : (
          <Text style={[styles.businessName, { color: colors.background }]}>{profile.business_name}</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics</Text>
        <View style={styles.statsContainer}>
          <StatItem icon="bar-chart-outline" label="Total Promotions" value={profile.total_promotions.toString()} colors={colors} />
          <StatItem icon="flash-outline" label="Active Promotions" value={profile.active_promotions.toString()} colors={colors} />
          <StatItem icon="time-outline" label="Pending Promotions" value={profile.pending_promotions.toString()} colors={colors} />
          <StatItem icon="cash-outline" label="Total Sales" value={profile.total_sales.toString()} colors={colors} />
          <StatItem icon="scan-outline" label="Total Scans" value={profile.total_scans.toString()} colors={colors} />
          <StatItem icon="hourglass-outline" label="Pending Scans" value={profile.pending_scans.toString()} colors={colors} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Information</Text>
        <View style={styles.infoContainer}>
          {isEditing ? (
            <>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={profile.name}
                onChangeText={(text) => setProfile({ ...profile, name: text })}
                placeholder="Name"
                placeholderTextColor={colors.tabIconDefault}
              />
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={profile.contact_number}
                onChangeText={(text) => setProfile({ ...profile, contact_number: text })}
                placeholder="Contact Number"
                placeholderTextColor={colors.tabIconDefault}
              />
              <View style={styles.locationContainer}>
                <TextInput
                  style={[styles.input, styles.locationInput, { color: colors.text, borderColor: colors.border }]}
                  value={profile.latitude?.toString() || ''}
                  onChangeText={(text) => setProfile({ ...profile, latitude: parseFloat(text) || null })}
                  placeholder="Latitude"
                  placeholderTextColor={colors.tabIconDefault}
                  keyboardType="numeric"
                />
                <TextInput
                  style={[styles.input, styles.locationInput, { color: colors.text, borderColor: colors.border }]}
                  value={profile.longitude?.toString() || ''}
                  onChangeText={(text) => setProfile({ ...profile, longitude: parseFloat(text) || null })}
                  placeholder="Longitude"
                  placeholderTextColor={colors.tabIconDefault}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.primary }]}
                onPress={getCurrentLocation}
              >
                <Text style={[styles.buttonText, { color: colors.background }]}>
                  Get Current Location
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <InfoItem icon="person-outline" value={profile.name} colors={colors} />
              <InfoItem icon="mail-outline" value={profile.email} colors={colors} />
              <InfoItem icon="call-outline" value={profile.contact_number} colors={colors} />
              <InfoItem icon="location-outline" value={`Lat: ${profile.latitude?.toFixed(6) || 'N/A'}, Lon: ${profile.longitude?.toFixed(6) || 'N/A'}`} colors={colors} />
            </>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={() => {
          if (isEditing) {
            updateProfile();
          } else {
            setIsEditing(true);
          }
        }}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>
          {isEditing ? 'Save Changes' : 'Edit Profile'}
        </Text>
      </TouchableOpacity>

      {isEditing && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary, marginTop: 10 }]}
          onPress={() => setIsEditing(false)}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>Cancel</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.error, marginTop: 20 }]}
        onPress={handleSignOut}
      >
        <Text style={[styles.buttonText, { color: colors.background }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const StatItem = ({ icon, label, value, colors }: { icon: string; label: string; value: string; colors: ColorScheme }) => (
  <View style={[styles.statItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <Ionicons name={icon as any} size={24} color={colors.primary} />
    <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
    <Text style={[styles.statLabel, { color: colors.tabIconDefault }]}>{label}</Text>
  </View>
);

const InfoItem = ({ icon, value, colors }: { icon: string; value: string; colors: ColorScheme }) => (
  <View style={styles.infoItem}>
    <Ionicons name={icon as any} size={24} color={colors.primary} style={styles.infoIcon} />
    <Text style={[styles.infoText, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomRightRadius: 50,
    borderBottomLeftRadius: 50,
    paddingVertical: 30,
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    padding: 5,
  },
  businessName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  businessNameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  section: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    width: '48%',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    marginRight: 10,
  },
  infoText: {
    fontSize: 16,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    width: '100%',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  locationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationInput: {
    width: '48%',
  },
});
