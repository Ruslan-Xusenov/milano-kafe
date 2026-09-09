import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/axios';
import { Trophy, Phone, ShoppingBag } from 'lucide-react-native';

export default function HisobotlarScreen() {
  const [topCustomers, setTopCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const response = await api.get('/analytics/top-customers');
      setTopCustomers(response.data);
    } catch (error) {
      console.log('Hisobotlarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchAnalytics(); }, []);

  const renderItem = ({ item, index }) => (
    <View style={styles.card}>
      <View style={styles.rankContainer}>
        <Trophy size={20} color={index === 0 ? '#FBBF24' : index === 1 ? '#9CA3AF' : index === 2 ? '#B45309' : '#4B5563'} />
        <Text style={styles.rankText}>#{index + 1}</Text>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.name}>{item.customer_name || 'Noma\'lum mijoz'}</Text>
        <View style={styles.detailRow}>
          <Phone size={14} color="#9CA3AF" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
        <View style={styles.detailRow}>
          <ShoppingBag size={14} color="#9CA3AF" />
          <Text style={styles.detailText}>{item.order_count} ta buyurtma</Text>
        </View>
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalAmount}>{Number(item.total_spent).toLocaleString()} so'm</Text>
        <Text style={styles.totalLabel}>Umumiy xarid</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Top 5 Mijozlar</Text>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={topCustomers}
          keyExtractor={(item, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Hisobotlar yo'q</Text>}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB', padding: 16, paddingBottom: 0 },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#374151',
  },
  rankContainer: {
    alignItems: 'center', justifyContent: 'center',
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#374151', marginRight: 12,
  },
  rankText: { color: '#F9FAFB', fontSize: 12, fontWeight: 'bold', marginTop: 2 },
  infoContainer: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#F9FAFB', marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  detailText: { color: '#D1D5DB', fontSize: 13 },
  totalContainer: { alignItems: 'flex-end' },
  totalAmount: { fontSize: 15, fontWeight: 'bold', color: '#10B981' },
  totalLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
});
