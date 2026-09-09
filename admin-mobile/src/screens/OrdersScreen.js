import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu as MenuIcon } from 'lucide-react-native';

export default function OrdersScreen() {
  const navigation = useNavigation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data); // Server allaqachon yangilari tepada qaytaradi
    } catch (error) {
      console.log('Buyurtmalarni olishda xatolik:', error);
      Alert.alert('Xatolik', 'Buyurtmalarni yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const updateOrderStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchOrders();
    } catch (error) {
      console.log('Status yangilashda xatolik:', error);
      Alert.alert('Xatolik', 'Holatni o\'zgartirib bo\'lmadi');
    }
  };

  const getStatusColor = (status) => {
    const s = status ? status.toLowerCase() : '';
    switch(s) {
      case 'new': return '#F59E0B'; // Yellow
      case 'preparing': return '#3B82F6'; // Blue
      case 'delivering': return '#8B5CF6'; // Purple
      case 'completed': return '#10B981'; // Green
      case 'rejected': return '#EF4444'; // Red
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    const s = status ? status.toLowerCase() : '';
    switch(s) {
      case 'new': return 'YANGI';
      case 'preparing': return 'TAYYORLANMOQDA';
      case 'delivering': return 'YETKAZILMOQDA';
      case 'completed': return 'BAJARILDI';
      case 'rejected': return 'BEKOR QILINDI';
      default: return status?.toUpperCase() || 'NOMA\'LUM';
    }
  };

  const renderItem = ({ item }) => {
    const total = Number(item.total || 0);
    const status = item.status ? item.status.toLowerCase() : '';
    const items = item.items || [];

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}># {item.id} - {item.customer_name || 'Mijoz'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>
        </View>

        <Text style={styles.orderDetails}>📍 {item.address || 'Belgilanmagan'}</Text>
        <Text style={styles.orderDetails}>📱 {item.phone || '-'}</Text>
        <Text style={styles.orderTotal}>💰 {total.toLocaleString('ru-RU')} so'm</Text>
        {item.payment_method && (
          <Text style={styles.orderPayment}>💳 {item.payment_method}</Text>
        )}

        {/* Buyurtma tarkibi */}
        {Array.isArray(items) && items.length > 0 && (
          <View style={styles.itemsList}>
            {items.map((orderItem, idx) => (
              <Text key={idx} style={styles.orderItemText}>
                • {orderItem.name} x{orderItem.quantity} — {Number(orderItem.price * orderItem.quantity).toLocaleString()} so'm
              </Text>
            ))}
          </View>
        )}

        {item.comment ? (
          <Text style={styles.orderComment}>💬 {item.comment}</Text>
        ) : null}

        {status !== 'completed' && status !== 'rejected' && (
          <View style={styles.actionButtons}>
            {status === 'new' && (
              <TouchableOpacity style={styles.btn} onPress={() => updateOrderStatus(item.id, 'preparing')}>
                <Text style={styles.btnText}>✅ Qabul qilish</Text>
              </TouchableOpacity>
            )}
            {status === 'preparing' && (
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#8B5CF6' }]} onPress={() => updateOrderStatus(item.id, 'delivering')}>
                <Text style={styles.btnText}>🚗 Yetkazish</Text>
              </TouchableOpacity>
            )}
            {status === 'delivering' && (
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#10B981' }]} onPress={() => updateOrderStatus(item.id, 'completed')}>
                <Text style={styles.btnText}>✅ Yakunlash</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={() => updateOrderStatus(item.id, 'rejected')}>
              <Text style={styles.btnCancelText}>❌ Bekor qilish</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuBtn}>
          <MenuIcon size={24} color="#F9FAFB" />
        </TouchableOpacity>
        <Text style={styles.title}>Buyurtmalar</Text>
      </View>
      
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Buyurtmalar yo'q</Text>
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuBtn: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  list: {
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderCard: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  orderDetails: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 4,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 4,
  },
  orderPayment: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  itemsList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  orderItemText: {
    fontSize: 13,
    color: '#D1D5DB',
    marginBottom: 2,
  },
  orderComment: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  btnCancelText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#9CA3AF',
    fontSize: 16,
  },
});
