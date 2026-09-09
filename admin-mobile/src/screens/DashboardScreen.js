import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, DollarSign, ShoppingBag, Flame, XCircle, Menu as MenuIcon } from 'lucide-react-native';
import api from '../api/axios';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { user, logout } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      if (response.data) {
        setOrders(response.data);
      }
    } catch (error) {
      console.log('Buyurtmalarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000); // Har 3 sekundda yangilash
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  // Bugungi sanani olish
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validStatuses = ['new', 'preparing', 'delivering', 'completed'];

  // Bugungi buyurtmalarni filtrlash
  const todayOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const status = order.status ? order.status.toLowerCase() : '';
    return orderDate >= today && validStatuses.includes(status);
  });

  // Kunlik tushum
  const dailyRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  
  // Tushum turlari bo'yicha
  const cashRevenue = todayOrders.filter(o => o.payment_method === 'naqd' || !o.payment_method).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const cardRevenue = todayOrders.filter(o => o.payment_method === 'karta').reduce((sum, order) => sum + Number(order.total || 0), 0);
  const clickRevenue = todayOrders.filter(o => o.payment_method === 'click').reduce((sum, order) => sum + Number(order.total || 0), 0);

  // Top taom
  const itemCounts = {};
  todayOrders.forEach(order => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
      });
    } else if (order.items && typeof order.items === 'string') {
      try {
        const parsedItems = JSON.parse(order.items);
        parsedItems.forEach(item => {
          itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.quantity || 1);
        });
      } catch (e) {}
    }
  });
  
  let topItemName = "Hali yo'q";
  let topItemCount = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > topItemCount) {
      topItemCount = count;
      topItemName = name;
    }
  });

  // Bekor qilinganlar
  const cancelledOrders = orders.filter(order => {
    const status = order.status ? order.status.toLowerCase() : '';
    return status === 'cancelled' || status === 'rejected';
  });
  const cancelledToday = cancelledOrders.filter(order => new Date(order.created_at) >= today).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuBtn}>
            <MenuIcon size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <View>
            <Text style={styles.greeting}>Salom, {user?.username}</Text>
            <Text style={styles.role}>{user?.role}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <LogOut size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.title}>Boshqaruv Paneli</Text>
        <Text style={styles.subtitle}>Bugungi tezkor statistika</Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.statsContainer}>
            {/* Kunlik Tushum */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View>
                  <Text style={styles.statTitle}>Kunlik Tushum</Text>
                  <Text style={styles.statValue}>{dailyRevenue.toLocaleString('ru-RU')} so'm</Text>
                </View>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
                  <DollarSign size={24} color="#10B981" />
                </View>
              </View>
              <Text style={styles.statSubValue}>N: {cashRevenue.toLocaleString()} | K: {cardRevenue.toLocaleString()} | C: {clickRevenue.toLocaleString()}</Text>
            </View>

            {/* Buyurtmalar */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View>
                  <Text style={styles.statTitle}>Buyurtmalar</Text>
                  <Text style={styles.statValue}>{todayOrders.length} ta</Text>
                </View>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                  <ShoppingBag size={24} color="#F59E0B" />
                </View>
              </View>
              <Text style={styles.statSubValue}>Bugungi barcha xaridlar</Text>
            </View>

            {/* Top Taom */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View>
                  <Text style={styles.statTitle}>Top Taom</Text>
                  <Text style={styles.statValue}>{topItemName}</Text>
                </View>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                  <Flame size={24} color="#EF4444" />
                </View>
              </View>
              <Text style={styles.statSubValue}>{topItemCount} ta sotildi</Text>
            </View>

            {/* Bekor qilingan */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <View>
                  <Text style={styles.statTitle}>Bekor qilingan</Text>
                  <Text style={styles.statValue}>{cancelledToday} ta bugun</Text>
                </View>
                <View style={[styles.iconWrapper, { backgroundColor: 'rgba(107, 114, 128, 0.2)' }]}>
                  <XCircle size={24} color="#9CA3AF" />
                </View>
              </View>
              <Text style={styles.statSubValue}>Jami: {cancelledOrders.length} ta</Text>
            </View>
          </View>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1F2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuBtn: {
    marginRight: 16,
    padding: 4,
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  role: {
    fontSize: 14,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginBottom: 20,
  },
  statsContainer: {
    gap: 16,
  },
  statCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F9FAFB',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statSubValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  }
});
