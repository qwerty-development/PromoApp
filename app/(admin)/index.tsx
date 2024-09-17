import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface Stats {
  totalUsers: number;
  totalSellers: number;
  activePromotions: number;
  pendingPromotions: number;
  averagePromotionDuration: number;
  topCategories: { name: string; count: number }[];
  userGrowthRate: number;
  userGrowthData: number[];
}

const { width } = Dimensions.get('window');

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalSellers: 0,
    activePromotions: 0,
    pendingPromotions: 0,
    averagePromotionDuration: 0,
    topCategories: [],
    userGrowthRate: 0,
    userGrowthData: [],
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

      // Generate mock data for user growth chart
      const userGrowthData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 50) + 50);

      setStats({
        totalUsers,
        totalSellers,
        activePromotions,
        pendingPromotions,
        averagePromotionDuration,
        topCategories,
        userGrowthRate,
        userGrowthData,
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

  const StatCard = ({ title, value, icon, suffix = '', trendIcon = '' }: { title: string; value: number | string; icon: string; suffix?: string; trendIcon?: string }) => (
    <BlurView intensity={80} tint="light" style={styles.card}>
      <LinearGradient
        colors={['#4a90e2', '#63b3ed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <Ionicons name={icon as any} size={24} color="#ffffff" style={styles.cardIcon} />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix}
        </Text>
        {trendIcon && <Ionicons name={trendIcon as any} size={20} color="#ffffff" style={styles.trendIcon} />}
      </LinearGradient>
    </BlurView>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#4a90e2" style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.statsContainer}>
            <StatCard title="Total Users" value={stats.totalUsers} icon="people" trendIcon="trending-up" />
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

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>User Growth (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{ data: stats.userGrowthData }],
              }}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.topCategoriesContainer}>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            {stats.topCategories.map((category, index) => (
              <View key={index} style={styles.categoryItem}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <View style={styles.categoryCountContainer}>
                  <Text style={styles.categoryCount}>{category.count}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#4a90e2" />
                </View>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  card: {
    width: '48%',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  cardIcon: {
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  trendIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  topCategoriesContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
  },
  categoryCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginRight: 5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});