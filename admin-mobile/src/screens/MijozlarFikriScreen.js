import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/axios';
import { Star, MessageSquare } from 'lucide-react-native';

export default function MijozlarFikriScreen() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReviews = async () => {
    try {
      const response = await api.get('/reviews');
      setReviews(response.data);
    } catch (error) {
      console.log('Fikrlarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchReviews(); }, []);

  const renderStars = (rating) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} size={16} color={star <= rating ? '#FBBF24' : '#4B5563'} fill={star <= rating ? '#FBBF24' : 'none'} />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const date = new Date(item.created_at).toLocaleString('ru-RU');
    return (
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.orderId}>Buyurtma #{item.order_id}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
        <View style={styles.ratingRow}>
          {renderStars(item.rating)}
          <Text style={styles.ratingText}>{item.rating}/5</Text>
        </View>
        {item.comment ? (
          <View style={styles.commentBox}>
            <MessageSquare size={16} color="#9CA3AF" style={{ marginRight: 8, marginTop: 2 }} />
            <Text style={styles.commentText}>{item.comment}</Text>
          </View>
        ) : (
          <Text style={styles.noComment}>Izoh qoldirilmagan</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Mijozlar fikri hali yo'q</Text>}
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
    marginBottom: 8,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#F9FAFB' },
  date: { fontSize: 12, color: '#9CA3AF' },
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 12,
  },
  starsRow: { flexDirection: 'row', marginRight: 8, gap: 2 },
  ratingText: { color: '#FBBF24', fontWeight: 'bold', fontSize: 14 },
  commentBox: {
    flexDirection: 'row', backgroundColor: '#374151', padding: 12, borderRadius: 8,
  },
  commentText: { color: '#E5E7EB', flex: 1, fontSize: 14, lineHeight: 20 },
  noComment: { color: '#6B7280', fontStyle: 'italic', fontSize: 14 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
});
