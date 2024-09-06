import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Promotion {
  id: number;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  banner_url: string;
  is_approved: boolean;
  industries: {
    name: string;
  } | null;
}

export default function MyPromotionsScreen() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      fetchPromotions();
    }
  }, [user]);

  async function fetchPromotions() {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select('*, industries(name)')
      .eq('seller_id', user.id);

    setLoading(false);

    if (error) {
      console.error('Error fetching promotions:', error);
      Alert.alert('Error', 'Failed to fetch promotions');
    } else {
      setPromotions(data as Promotion[]);
    }
  }

  async function handleDelete(id: number) {
    Alert.alert(
      "Delete Promotion",
      "Are you sure you want to delete this promotion?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          const { error } = await supabase
            .from('promotions')
            .delete()
            .eq('id', id);

          if (error) {
            console.error('Error deleting promotion:', error);
            Alert.alert('Error', 'Failed to delete promotion');
          } else {
            fetchPromotions(); // Refresh the list
            Alert.alert('Success', 'Promotion deleted successfully');
          }
        }}
      ]
    );
  }

  function handleEdit(item: Promotion) {
    router.push({
      pathname: '/edit-promotion',
      params: { id: item.id.toString() }
    });
  }
  function renderPromotion({ item }: { item: Promotion }) {
    return (
      <View style={styles.promotionItem}>
        <Image source={{ uri: item.banner_url }} style={styles.bannerImage} />
        <Text style={styles.promotionTitle}>{item.title}</Text>
        <Text style={styles.promotionDescription}>{item.description}</Text>
        <Text style={styles.promotionDates}>{`${new Date(item.start_date).toLocaleDateString()} - ${new Date(item.end_date).toLocaleDateString()}`}</Text>
        <Text style={styles.promotionIndustry}>{`Industry: ${item.industries?.name || 'N/A'}`}</Text>
        <Text style={styles.promotionStatus}>{`Status: ${item.is_approved ? 'Approved' : 'Pending'}`}</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={24} color="white" />
            <Text style={styles.buttonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Please log in to view your promotions.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list-outline" size={100} color="#0a7ea4" />
        <Text style={styles.headerText}>My Promotions</Text>
      </View>
      <FlatList
        data={promotions}
        renderItem={renderPromotion}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no promotions yet.</Text>}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  promotionItem: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  bannerImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  promotionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  promotionDescription: {
    marginBottom: 5,
  },
  promotionDates: {
    fontStyle: 'italic',
    marginBottom: 5,
  },
  promotionIndustry: {
    fontWeight: '500',
    marginBottom: 5,
  },
  promotionStatus: {
    fontWeight: '500',
    color: '#0a7ea4',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ecdc4',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6b6b',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    marginLeft: 5,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
  },
});