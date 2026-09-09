import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import api from '../api/axios';
import { Settings, Info } from 'lucide-react-native';

export default function SettingsScreen() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      setSettings(response.data);
    } catch (error) {
      console.log('Sozlamalarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchSettings(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>;
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Settings size={24} color="#F9FAFB" />
          <Text style={styles.title}>Tizim Sozlamalari</Text>
        </View>

        {settings ? (
          Object.entries(settings).map(([key, value]) => (
            <View key={key} style={styles.row}>
              <Text style={styles.key}>{key}</Text>
              <Text style={styles.value}>{value?.toString() || '-'}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Sozlamalar topilmadi</Text>
        )}
      </View>

      <View style={styles.infoCard}>
        <Info size={20} color="#3B82F6" />
        <Text style={styles.infoText}>Sozlamalarni o'zgartirish uchun veb admin paneldan foydalaning.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  content: { padding: 16 },
  card: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#374151',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151'
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#F9FAFB' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#374151'
  },
  key: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  value: { fontSize: 14, color: '#F9FAFB', fontWeight: '500', flex: 1, textAlign: 'right' },
  emptyText: { color: '#9CA3AF', textAlign: 'center', padding: 20 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  infoText: { flex: 1, color: '#3B82F6', fontSize: 13, lineHeight: 18 }
});
