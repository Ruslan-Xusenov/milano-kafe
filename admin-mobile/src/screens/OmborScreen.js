import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/axios';

export default function OmborScreen() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
    } catch (error) {
      console.log('Omborni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchInventory(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchInventory(); }, []);

  const renderItem = ({ item }) => {
    const isLow = item.quantity <= 10; // 10 tadan kam bo'lsa ogohlantirish
    return (
      <View style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.unit}>O'lchov: {item.unit}</Text>
        </View>
        <View style={styles.quantityContainer}>
          <Text style={[styles.quantity, isLow && styles.quantityLow]}>
            {item.quantity}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Omborda mahsulot yo'q</Text>}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#374151',
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#F9FAFB' },
  unit: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  quantityContainer: {
    backgroundColor: '#374151', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
  },
  quantity: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },
  quantityLow: { color: '#EF4444' }, // Qizil rang qoldiq kam bo'lsa
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
});
