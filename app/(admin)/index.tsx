import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Dimensions, useColorScheme } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
    <BlurView intensity={80} tint={colorScheme} style={styles.card}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <Ionicons name={icon as any} size={24} color={colors.background} style={styles.cardIcon} />
        <Text style={[styles.cardTitle, { color: colors.background }]}>{title}</Text>
        <Text style={[styles.cardValue, { color: colors.background }]}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix}
        </Text>
        {trendIcon && <Ionicons name={trendIcon as any} size={20} color={colors.background} style={styles.trendIcon} />}
      </LinearGradient>
    </BlurView>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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

          <View style={[styles.chartContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>User Growth (Last 7 Days)</Text>
            <LineChart
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{ data: stats.userGrowthData }],
              }}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: colors.card,
                backgroundGradientFrom: colors.card,
                backgroundGradientTo: colors.card,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(${parseInt(colors.primary.slice(1, 3), 16)}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(colors.primary.slice(5, 7), 16)}, ${opacity})`,
                labelColor: () => colors.text,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: colors.secondary
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={[styles.topCategoriesContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Categories</Text>
            {stats.topCategories.map((category, index) => (
              <View key={index} style={[styles.categoryItem, { borderBottomColor: colors.border }]}>
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                <View style={styles.categoryCountContainer}>
                  <Text style={[styles.categoryCount, { color: colors.primary }]}>{category.count}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.primary} />
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
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
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
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  trendIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  chartContainer: {
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
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  topCategoriesContainer: {
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
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryName: {
    fontSize: 16,
  },
  categoryCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});