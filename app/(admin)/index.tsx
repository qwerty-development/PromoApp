import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface Stats {
  totalUsers: number;
  totalSellers: number;
  activePromotions: number;
  pendingPromotions: number;
  averagePromotionDuration: number;
  topCategories: { name: string; count: number }[];
  userGrowthRate: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    activePromotions: 0,
    pendingPromotions: 0,
    averagePromotionDuration: 0,
    topCategories: [],
    userGrowthRate: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [usersData, promotionsData, categoriesData] = await Promise.all([
        supabase.from('users').select('role, created_at'),
        supabase.from('promotions').select('is_approved, start_date, end_date, industry_id'),
        supabase.from('industries').select('id, name'),
      ]);

      if (usersData.error) throw new Error(`Error fetching users: ${usersData.error.message}`);
      if (promotionsData.error) throw new Error(`Error fetching promotions: ${promotionsData.error.message}`);
      if (categoriesData.error) throw new Error(`Error fetching categories: ${categoriesData.error.message}`);

      const users = usersData.data || [];
      const promotions = promotionsData.data || [];
      const categories = categoriesData.data || [];

      const totalUsers = users.length;
      const totalSellers = users.filter(user => user.role === 'seller').length;
      const activePromotions = promotions.filter(promo => promo.is_approved).length;
      const pendingPromotions = promotions.filter(promo => !promo.is_approved).length;

      const promotionDurations = promotions.map(promo =>
        new Date(promo.end_date).getTime() - new Date(promo.start_date).getTime()
      );
      const averagePromotionDuration = promotionDurations.length
        ? promotionDurations.reduce((sum, duration) => sum + duration, 0) / promotionDurations.length / (1000 * 60 * 60 * 24)
        : 0;

      const categoryCounts = promotions.reduce((acc, promo) => {
        acc[promo.industry_id] = (acc[promo.industry_id] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const topCategories = categories
        .map(category => ({ name: category.name, count: categoryCounts[category.id] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentUsers = users.filter(user => new Date(user.created_at) > thirtyDaysAgo);
      const userGrowthRate = (recentUsers.length / totalUsers) * 100;

      setStats({
        totalUsers,
        totalSellers,
        activePromotions,
        pendingPromotions,
        averagePromotionDuration,
        topCategories,
        userGrowthRate,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon, suffix = '' }: { title: string; value: number | string; icon: string; suffix?: string }) => (
    <View style={styles.card}>
      <Ionicons name={icon as any} size={24} color="#0a7ea4" style={styles.cardIcon} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0a7ea4" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.statsContainer}>
            <StatCard title="Total Users" value={stats.totalUsers} icon="people" />
            <StatCard title="Total Sellers" value={stats.totalSellers} icon="business" />
            <StatCard title="Active Promotions" value={stats.activePromotions} icon="megaphone" />
            <StatCard title="Pending Promotions" value={stats.pendingPromotions} icon="hourglass" />
            <StatCard
              title="Avg. Promotion Duration"
              value={stats.averagePromotionDuration.toFixed(1)}
              icon="calendar"
              suffix=" days"
            />
            <StatCard
              title="User Growth Rate"
              value={stats.userGrowthRate.toFixed(1)}
              icon="trending-up"
              suffix="%"
            />
          </View>
          <View style={styles.topCategoriesContainer}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {stats.topCategories.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.count}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  topCategoriesContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 10,
    marginTop: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0a7ea4',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});