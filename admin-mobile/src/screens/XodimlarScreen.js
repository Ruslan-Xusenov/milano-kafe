import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/axios';
import { User, Phone, Briefcase, DollarSign } from 'lucide-react-native';

export default function XodimlarScreen() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff');
      setStaff(response.data);
    } catch (error) {
      console.log('Xodimlarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchStaff(); }, []);

  const getRoleColor = (role) => {
    const r = role?.toLowerCase();
    switch (r) {
      case 'admin':
      case 'superadmin': return '#EF4444';
      case 'cashier': return '#10B981';
      case 'waiter': return '#3B82F6';
      default: return '#9CA3AF';
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.nameRow}>
          <User size={20} color="#F9FAFB" />
          <Text style={styles.name}>{item.name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getRoleColor(item.role) }]}>
          <Text style={styles.badgeText}>{item.role?.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Briefcase size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>Login: {item.username}</Text>
        </View>
        <View style={styles.detailRow}>
          <Phone size={16} color="#9CA3AF" />
          <Text style={styles.detailText}>{item.phone || 'Kiritilmagan'}</Text>
        </View>
        <View style={styles.detailRow}>
          <DollarSign size={16} color="#10B981" />
          <Text style={styles.detailText}>Maosh: {item.salary?.toLocaleString()} so'm/soat</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Xodimlar yo'q</Text>}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#374151',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#374151'
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#F9FAFB' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  details: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: '#D1D5DB', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
});
