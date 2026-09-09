import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Alert, RefreshControl, TouchableOpacity, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../api/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Menu as MenuIcon, X, ChevronDown, Check } from 'lucide-react-native';

export default function MenuScreen() {
  const navigation = useNavigation();
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);

  // Form
  const [name, setName] = useState('');
  const [nameRu, setNameRu] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [emoji, setEmoji] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionRu, setDescriptionRu] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);

  // Category picker
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu');
      setMenuItems(response.data);
    } catch (error) {
      console.log('Menyuni olishda xatolik:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.log('Kategoriyalarni olishda xatolik:', error);
    }
  };

  useEffect(() => {
    fetchMenu();
    fetchCategories();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMenu();
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentItem(null);
    setName('');
    setNameRu('');
    setPrice('');
    setCategory('');
    setEmoji('');
    setDescription('');
    setDescriptionRu('');
    setIsAvailable(true);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setIsEditing(true);
    setCurrentItem(item);
    setName(item.name || '');
    setNameRu(item.name_ru || '');
    setPrice(item.price ? String(item.price) : '');
    setCategory(item.category || '');
    setEmoji(item.emoji || '');
    setDescription(item.description || '');
    setDescriptionRu(item.description_ru || '');
    setIsAvailable(item.available !== false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert('Xato', 'Maxsulot nomi kiritilishi shart');
      return;
    }
    if (!price) {
      Alert.alert('Xato', 'Narx kiritilishi shart');
      return;
    }

    const payload = {
      name,
      name_ru: nameRu,
      price: Number(price),
      category,
      emoji,
      description,
      description_ru: descriptionRu,
      available: isAvailable,
    };

    try {
      if (isEditing && currentItem) {
        await api.put(`/menu/${currentItem.id}`, payload);
      } else {
        await api.post('/menu', payload);
      }
      setModalVisible(false);
      fetchMenu();
    } catch (error) {
      console.log('Saqlashda xatolik:', error);
      Alert.alert('Xatolik', 'Saqlashda xatolik yuz berdi');
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'O\'chirish',
      `"${item.name}" maxsulotini rostdan ham o'chirmoqchimisiz?`,
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'O\'chirish',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/menu/${item.id}`);
              fetchMenu();
            } catch (error) {
              console.log('O\'chirishda xatolik:', error);
              Alert.alert('Xatolik', 'O\'chirib bo\'lmadi');
            }
          }
        }
      ]
    );
  };

  const formatPrice = (p) => {
    const n = Number(p);
    if (isNaN(n)) return '0';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  const renderItem = ({ item }) => (
    <View style={styles.menuItem}>
      {item.emoji && item.emoji.startsWith('http') ? (
        <Image source={{ uri: item.emoji }} style={styles.image} />
      ) : item.image_url ? (
        <Image source={{ uri: `https://milano.securehub.uz${item.image_url}` }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.emojiText}>{item.emoji || '🍽️'}</Text>
        </View>
      )}
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>{formatPrice(item.price)} so'm</Text>
        <Text style={styles.itemCategory}>{item.category || 'Kategoriyasiz'}</Text>
      </View>
      <View style={styles.itemActions}>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: '#1E3A5F' }]}
          onPress={() => openEditModal(item)}
        >
          <Text style={[styles.editBtnText, { color: '#60A5FA' }]}>Tahrirlash</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: '#3B1111', marginTop: 6 }]}
          onPress={() => handleDelete(item)}
        >
          <Text style={[styles.editBtnText, { color: '#EF4444' }]}>O'chirish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Category picker modal
  const CategoryPickerModal = () => (
    <Modal visible={categoryPickerVisible} transparent animationType="slide">
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCategoryPickerVisible(false)}>
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Kategoriyani tanlang</Text>
            <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
              <X size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            <TouchableOpacity
              style={[styles.pickerItem, !category && styles.pickerItemSelected]}
              onPress={() => { setCategory(''); setCategoryPickerVisible(false); }}
            >
              <Text style={[styles.pickerItemText, !category && styles.pickerItemTextSelected]}>Kategoriyasiz</Text>
              {!category && <Check size={18} color="#10B981" />}
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.pickerItem, category === cat.name && styles.pickerItemSelected]}
                onPress={() => { setCategory(cat.name); setCategoryPickerVisible(false); }}
              >
                <Text style={[styles.pickerItemText, category === cat.name && styles.pickerItemTextSelected]}>
                  {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                </Text>
                {category === cat.name && <Check size={18} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuBtn}>
            <MenuIcon size={24} color="#F9FAFB" />
          </TouchableOpacity>
          <Text style={styles.title}>Menyu boshqaruvi</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus color="#FFFFFF" size={20} />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={menuItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Menyu bo'sh</Text>}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}

      {/* Tahrirlash / Qo'shish modali */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isEditing ? 'Maxsulotni tahrirlash' : 'Yangi maxsulot'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Nomi (O'zbekcha)</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Masalan: Cheeseburger" placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Nomi (Ruscha)</Text>
              <TextInput style={styles.input} value={nameRu} onChangeText={setNameRu} placeholder="Masalan: Чизбургер" placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Narxi (so'm)</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="Masalan: 35000" placeholderTextColor="#6B7280" keyboardType="numeric" />

              <Text style={styles.label}>Kategoriya</Text>
              <TouchableOpacity style={styles.selectBtn} onPress={() => setCategoryPickerVisible(true)}>
                <Text style={styles.selectBtnText}>{category || 'Tanlang...'}</Text>
                <ChevronDown size={18} color="#9CA3AF" />
              </TouchableOpacity>

              <Text style={styles.label}>Emoji yoki rasm URL</Text>
              <TextInput style={styles.input} value={emoji} onChangeText={setEmoji} placeholder="🍔 yoki https://..." placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Tavsif (O'zbekcha)</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={description} onChangeText={setDescription} placeholder="Maxsulot haqida..." placeholderTextColor="#6B7280" multiline textAlignVertical="top" />

              <Text style={styles.label}>Tavsif (Ruscha)</Text>
              <TextInput style={[styles.input, { height: 80 }]} value={descriptionRu} onChangeText={setDescriptionRu} placeholder="О продукте..." placeholderTextColor="#6B7280" multiline textAlignVertical="top" />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Mavjud (sotuvda)</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ false: '#374151', true: '#10B981' }} thumbColor="#FFF" />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Saqlash</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CategoryPickerModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#1F2937', borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  menuBtn: { marginRight: 12, padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#F9FAFB' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 4 },
  list: { padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
  menuItem: {
    flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 12,
    padding: 12, marginBottom: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  image: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#374151' },
  imagePlaceholder: {
    width: 60, height: 60, borderRadius: 10, backgroundColor: '#374151',
    justifyContent: 'center', alignItems: 'center',
  },
  emojiText: { fontSize: 28 },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#F9FAFB' },
  itemPrice: { fontSize: 14, color: '#10B981', fontWeight: '700', marginTop: 2 },
  itemCategory: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  itemActions: { marginLeft: 8 },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  label: { color: '#D1D5DB', fontSize: 14, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#374151', color: '#FFF', borderRadius: 10, padding: 14,
    marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#4B5563',
  },
  selectBtn: {
    backgroundColor: '#374151', borderRadius: 10, padding: 14, marginBottom: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563',
  },
  selectBtnText: { color: '#FFF', fontSize: 15, flex: 1 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, marginTop: 8,
  },
  saveBtn: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Picker
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  pickerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  pickerList: { padding: 8, paddingBottom: 40 },
  pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginVertical: 2 },
  pickerItemSelected: { backgroundColor: '#374151' },
  pickerItemText: { color: '#D1D5DB', fontSize: 15, flex: 1 },
  pickerItemTextSelected: { color: '#FFF', fontWeight: 'bold' },
});
