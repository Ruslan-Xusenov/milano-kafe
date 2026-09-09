import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Image, Alert, Modal, TextInput, ScrollView, Switch } from 'react-native';
import api from '../api/axios';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react-native';

export default function KatalogScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [discountValue, setDiscountValue] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isQuick, setIsQuick] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.log('Kategoriyalarni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); fetchCategories(); }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentId(null);
    setName('');
    setNameRu('');
    setEmoji('');
    setIsAvailable(true);
    setIsQuick(false);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentId(item.id);
    setName(item.name);
    setNameRu(item.name_ru || '');
    setEmoji(item.emoji || '');
    setIsAvailable(Boolean(item.available));
    setIsQuick(Boolean(item.is_quick));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Xato', 'Kategoriya nomi kiritilishi shart');
      return;
    }

    const payload = {
      name,
      name_ru: nameRu,
      emoji,
      available: isAvailable,
      is_quick: isQuick,
    };

    try {
      if (isEditing) {
        await api.put(`/categories/${currentId}`, payload);
      } else {
        await api.post('/categories', payload);
      }
      setModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.log('Saqlashda xatolik:', error);
      Alert.alert('Xatolik', 'Kategoriyani saqlab bo\'lmadi');
    }
  };

  const handleDelete = (id, catName) => {
    Alert.alert(
      'O\'chirish',
      `"${catName}" kategoriyasini rostdan ham o'chirmoqchimisiz?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        { 
          text: 'O\'chirish', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/categories/${id}`);
              fetchCategories();
            } catch (error) {
              console.log('O\'chirishda xatolik:', error);
              Alert.alert('Xatolik', 'O\'chirib bo\'lmadi');
            }
          }
        }
      ]
    );
  };

  const openDiscountModal = (item) => {
    setSelectedCategory(item);
    setDiscountValue('');
    setDiscountModalVisible(true);
  };

  const applyDiscount = async () => {
    const val = parseInt(discountValue, 10);
    if (isNaN(val) || val < 0 || val > 99) {
      Alert.alert('Xato', 'Chegirma foizi 0 dan 99 gacha bo\'lishi kerak');
      return;
    }
    try {
      const res = await api.patch(`/categories/${selectedCategory.id}/discount`, { discount_percent: val });
      setDiscountModalVisible(false);
      Alert.alert('Muvaffaqiyatli', `${selectedCategory.name} ichidagi barcha mahsulotlarga ${val}% chegirma o'rnatildi. (${res.data.updated_count} ta mahsulot yangilandi)`);
    } catch (error) {
      console.log('Chegirma o\'rnatishda xatolik:', error);
      Alert.alert('Xatolik', 'Chegirma o\'rnatib bo\'lmadi');
    }
  };

  const toggleStatus = async (item) => {
    try {
      await api.patch(`/categories/${item.id}/toggle-available`);
      fetchCategories();
    } catch (error) {
      console.log('Holatni o\'zgartirishda xatolik:', error);
    }
  };

  const renderItem = ({ item }) => {
    const isImage = item.emoji && item.emoji.startsWith('http');
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          {isImage ? (
            <Image source={{ uri: item.emoji }} style={styles.catImage} resizeMode="contain" />
          ) : (
            <Text style={styles.emoji}>{item.emoji || '📁'}</Text>
          )}
          
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            {item.name_ru ? <Text style={styles.nameRu}>{item.name_ru}</Text> : null}
          </View>
          
          <TouchableOpacity 
            style={[styles.badge, { backgroundColor: item.available ? '#10B981' : '#EF4444' }]}
            onPress={() => toggleStatus(item)}
          >
            <Text style={styles.badgeText}>{item.available ? 'Faol' : 'Nofaol'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => openEditModal(item)}>
            <Edit2 size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Tahrirlash</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => openDiscountModal(item)}>
            <Tag size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>Chegirma</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleDelete(item.id, item.name)}>
            <Trash2 size={16} color="#FFF" />
            <Text style={styles.actionBtnText}>O'chirish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>Kataloglar</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Kategoriyalar yo'q</Text>}
          ListFooterComponent={<View style={{ height: 40 }} />}
        />
      )}

      {/* EDIT / ADD MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Tahrirlash' : 'Yangi kategoriya'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#9CA3AF" /></TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nomi (O'zbekcha) *</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Masalan: Burgerlar" placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Nomi (Ruscha)</Text>
              <TextInput style={styles.input} value={nameRu} onChangeText={setNameRu} placeholder="Masalan: Бургеры" placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Emoji yoki Rasm URL (Masalan: 🍔 yoki https://...)</Text>
              <TextInput style={styles.input} value={emoji} onChangeText={setEmoji} placeholder="Emoji yoki link" placeholderTextColor="#6B7280" />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Faol</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#374151', true: '#10B981' }} thumbColor="#FFF" />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Tezkor menyu (Bosh sahifa)</Text>
                <Switch value={isQuick} onValueChange={setIsQuick} trackColor={{ false: '#374151', true: '#3B82F6' }} thumbColor="#FFF" />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Saqlash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DISCOUNT MODAL */}
      <Modal visible={discountModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ommaviy chegirma</Text>
              <TouchableOpacity onPress={() => setDiscountModalVisible(false)}><X size={24} color="#9CA3AF" /></TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.discountDesc}>
                "{selectedCategory?.name}" kategoriyasidagi barcha mahsulotlar uchun chegirma foizini kiriting. 
                Bekor qilish uchun 0 kiriting.
              </Text>
              <Text style={styles.label}>Chegirma foizi (%)</Text>
              <TextInput 
                style={styles.input} 
                value={discountValue} 
                onChangeText={setDiscountValue} 
                placeholder="0 - 99" 
                placeholderTextColor="#6B7280" 
                keyboardType="numeric" 
                maxLength={2}
              />
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]} onPress={applyDiscount}>
              <Text style={styles.saveBtnText}>Tasdiqlash</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 0 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#FFF', fontWeight: 'bold' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#374151',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  catImage: { width: 40, height: 40, marginRight: 12, borderRadius: 8 },
  emoji: { fontSize: 32, marginRight: 12 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#F9FAFB' },
  nameRu: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 6, gap: 4 },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 16 },
  modalContent: { backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151', maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F9FAFB' },
  modalBody: { padding: 16 },
  label: { color: '#D1D5DB', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151', borderRadius: 8, color: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { backgroundColor: '#3B82F6', padding: 16, alignItems: 'center', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  discountDesc: { color: '#9CA3AF', fontSize: 13, marginBottom: 16, lineHeight: 18 }
});
