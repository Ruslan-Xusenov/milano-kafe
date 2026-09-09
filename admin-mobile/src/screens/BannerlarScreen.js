import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { Edit, Trash2, Plus, X, ChevronDown, Check } from 'lucide-react-native';
import api from '../api/axios';

// Tayyor rang palitralari - admin uchun qulay
const BG_COLORS = [
  { label: 'Ko\'k', value: '#3B82F6' },
  { label: 'Qizil', value: '#EF4444' },
  { label: 'Yashil', value: '#10B981' },
  { label: 'Sariq', value: '#F59E0B' },
  { label: 'Binafsha', value: '#8B5CF6' },
  { label: 'Pushti', value: '#EC4899' },
  { label: 'Ko\'k-yashil', value: '#06B6D4' },
  { label: 'To\'q ko\'k', value: '#1E3A5F' },
  { label: 'To\'q yashil', value: '#065F46' },
  { label: 'To\'q qizil', value: '#991B1B' },
  { label: 'Qora', value: '#1F2937' },
  { label: 'Oq', value: '#F9FAFB' },
];

const TEXT_COLORS = [
  { label: 'Oq', value: '#FFFFFF' },
  { label: 'Qora', value: '#111827' },
  { label: 'Och kulrang', value: '#E5E7EB' },
  { label: 'Och ko\'k', value: '#BFDBFE' },
  { label: 'Och yashil', value: '#A7F3D0' },
  { label: 'Sariq', value: '#FDE68A' },
];

const LINK_TYPES = [
  { label: 'Yo\'q (havolasiz)', value: 'none' },
  { label: 'Kategoriya', value: 'category' },
  { label: 'Maxsulot', value: 'product' },
  { label: 'Havola (URL)', value: 'url' },
];

export default function BannerlarScreen() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '', subtitle: '', bg_color: '#3B82F6', text_color: '#FFFFFF', sub_text_color: '#E5E7EB',
    emoji1: '', emoji2: '', emoji3: '', link_type: 'none', link_id: ''
  });

  // Kategoriyalar va maxsulotlar ro'yxati
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  // Picker modallari
  const [bgColorPickerVisible, setBgColorPickerVisible] = useState(false);
  const [textColorPickerVisible, setTextColorPickerVisible] = useState(false);
  const [subTextColorPickerVisible, setSubTextColorPickerVisible] = useState(false);
  const [linkTypePickerVisible, setLinkTypePickerVisible] = useState(false);
  const [linkIdPickerVisible, setLinkIdPickerVisible] = useState(false);

  const fetchBanners = async () => {
    try {
      const response = await api.get('/banners');
      setBanners(response.data);
    } catch (error) {
      console.log('Bannerlarni olishda xatolik:', error);
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

  const fetchProducts = async () => {
    try {
      const response = await api.get('/menu');
      setProducts(response.data);
    } catch (error) {
      console.log('Maxsulotlarni olishda xatolik:', error);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchCategories();
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBanners();
    fetchCategories();
    fetchProducts();
  }, []);

  const handleAdd = () => {
    setCurrentBanner(null);
    setFormData({
      title: '', subtitle: '', bg_color: '#3B82F6', text_color: '#FFFFFF', sub_text_color: '#E5E7EB',
      emoji1: '', emoji2: '', emoji3: '', link_type: 'none', link_id: ''
    });
    setModalVisible(true);
  };

  const handleEdit = (banner) => {
    setCurrentBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      bg_color: banner.bg_color || '#3B82F6',
      text_color: banner.text_color || '#FFFFFF',
      sub_text_color: banner.sub_text_color || '#E5E7EB',
      emoji1: banner.emoji1 || '',
      emoji2: banner.emoji2 || '',
      emoji3: banner.emoji3 || '',
      link_type: banner.link_type || 'none',
      link_id: banner.link_id ? String(banner.link_id) : ''
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      Alert.alert('Xato', 'Sarlavha kiritilishi shart');
      return;
    }
    try {
      if (currentBanner) {
        await api.put(`/banners/${currentBanner.id}`, formData);
      } else {
        await api.post('/banners', formData);
      }
      setModalVisible(false);
      fetchBanners();
    } catch (error) {
      Alert.alert('Xato', 'Saqlashda xatolik yuz berdi');
      console.log(error);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('O\'chirish', 'Rostdan ham bu bannerni o\'chirmoqchimisiz?', [
      { text: 'Bekor qilish', style: 'cancel' },
      { text: 'O\'chirish', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/banners/${id}`);
            fetchBanners();
          } catch (error) {
            Alert.alert('Xato', 'O\'chirishda xatolik yuz berdi');
            console.log(error);
          }
        }
      }
    ]);
  };

  // Link turi nomini topish
  const getLinkTypeName = (type) => {
    const found = LINK_TYPES.find(lt => lt.value === type);
    return found ? found.label : type;
  };

  // Link ID nomini topish
  const getLinkIdName = (linkType, linkId) => {
    if (!linkId) return '';
    if (linkType === 'category') {
      const cat = categories.find(c => String(c.id) === String(linkId));
      return cat ? (cat.name || cat.name_uz || `#${linkId}`) : linkId;
    }
    if (linkType === 'product') {
      const prod = products.find(p => String(p.id) === String(linkId));
      return prod ? (prod.name || prod.name_uz || `#${linkId}`) : linkId;
    }
    return linkId;
  };

  // Rang nomi
  const getColorName = (hex, colorList) => {
    const found = colorList.find(c => c.value.toLowerCase() === hex?.toLowerCase());
    return found ? found.label : hex;
  };

  // Picker Modal komponenti
  const PickerModal = ({ visible, onClose, title, options, selectedValue, onSelect }) => (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.pickerItem, selectedValue === option.value && styles.pickerItemSelected]}
                onPress={() => { onSelect(option.value); onClose(); }}
              >
                {option.color && (
                  <View style={[styles.colorDot, { backgroundColor: option.color }]} />
                )}
                <Text style={[styles.pickerItemText, selectedValue === option.value && styles.pickerItemTextSelected]}>
                  {option.label}
                </Text>
                {selectedValue === option.value && <Check size={18} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Rang tanlash uchun optsiyalar (rang doirasi bilan)
  const bgColorOptions = BG_COLORS.map(c => ({ label: c.label, value: c.value, color: c.value }));
  const textColorOptions = TEXT_COLORS.map(c => ({ label: c.label, value: c.value, color: c.value }));

  // Link ID optsiyalari
  const getLinkIdOptions = () => {
    if (formData.link_type === 'category') {
      return categories.map(c => ({ label: c.name || c.name_uz || `Kategoriya #${c.id}`, value: String(c.id) }));
    }
    if (formData.link_type === 'product') {
      return products.map(p => ({ label: p.name || p.name_uz || `Maxsulot #${p.id}`, value: String(p.id) }));
    }
    return [];
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Banner ko'rinishi (live preview) */}
      <View style={[styles.bannerPreview, { backgroundColor: item.bg_color || '#3B82F6' }]}>
        <View style={styles.bannerContent}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: item.text_color || '#FFF' }]}>{item.title}</Text>
            {item.subtitle ? <Text style={[styles.bannerSubtitle, { color: item.sub_text_color || '#E5E7EB' }]}>{item.subtitle}</Text> : null}
          </View>
          {(item.emoji1 || item.emoji2 || item.emoji3) ? (
            <Text style={styles.bannerEmojis}>{item.emoji1} {item.emoji2} {item.emoji3}</Text>
          ) : null}
        </View>
      </View>
      {/* Ma'lumotlar va tugmalar */}
      <View style={styles.info}>
        <View style={styles.infoDetails}>
          <View style={styles.infoBadges}>
            <View style={[styles.badge, { backgroundColor: '#1E3A5F' }]}>
              <Text style={styles.badgeText}>{getLinkTypeName(item.link_type)}</Text>
            </View>
            {item.link_id ? (
              <View style={[styles.badge, { backgroundColor: '#065F46' }]}>
                <Text style={styles.badgeText}>{getLinkIdName(item.link_type, item.link_id)}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#1E3A5F' }]} onPress={() => handleEdit(item)}>
            <Edit size={18} color="#60A5FA" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#3B1111' }]} onPress={() => handleDelete(item.id)}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Tanlash tugmasi
  const SelectButton = ({ label, value, displayValue, color, onPress }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.selectBtn} onPress={onPress}>
        {color && <View style={[styles.colorDotSmall, { backgroundColor: color }]} />}
        <Text style={styles.selectBtnText}>{displayValue || 'Tanlang...'}</Text>
        <ChevronDown size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#EF4444" /></View>
      ) : (
        <FlatList
          data={banners}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Bannerlar yo'q</Text>}
          ListFooterComponent={<View style={{ height: 80 }} />}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleAdd}>
        <Plus size={24} color="#FFF" />
      </TouchableOpacity>

      {/* Asosiy forma modali */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{currentBanner ? 'Bannerni tahrirlash' : 'Yangi banner'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

              {/* LIVE PREVIEW */}
              <Text style={styles.sectionTitle}>Ko'rinishi</Text>
              <View style={[styles.previewBox, { backgroundColor: formData.bg_color || '#3B82F6' }]}>
                <View style={styles.previewContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewTitle, { color: formData.text_color || '#FFF' }]}>
                      {formData.title || 'Sarlavha'}
                    </Text>
                    <Text style={[styles.previewSubtitle, { color: formData.sub_text_color || '#E5E7EB' }]}>
                      {formData.subtitle || 'Qisqa matn'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 28 }}>
                    {formData.emoji1} {formData.emoji2} {formData.emoji3}
                  </Text>
                </View>
              </View>

              {/* MATN */}
              <Text style={styles.sectionTitle}>Matn</Text>

              <Text style={styles.label}>Sarlavha</Text>
              <TextInput style={styles.input} value={formData.title} onChangeText={t => setFormData({...formData, title: t})} placeholder="Masalan: Yozgi chegirmalar" placeholderTextColor="#6B7280" />

              <Text style={styles.label}>Qisqa matn</Text>
              <TextInput style={styles.input} value={formData.subtitle} onChangeText={t => setFormData({...formData, subtitle: t})} placeholder="Masalan: 50% gacha arzon" placeholderTextColor="#6B7280" />

              {/* RANGLAR */}
              <Text style={styles.sectionTitle}>Ranglar</Text>

              <SelectButton
                label="Orqa fon rangi"
                value={formData.bg_color}
                displayValue={getColorName(formData.bg_color, BG_COLORS)}
                color={formData.bg_color}
                onPress={() => setBgColorPickerVisible(true)}
              />

              <SelectButton
                label="Sarlavha rangi"
                value={formData.text_color}
                displayValue={getColorName(formData.text_color, TEXT_COLORS)}
                color={formData.text_color}
                onPress={() => setTextColorPickerVisible(true)}
              />

              <SelectButton
                label="Qisqa matn rangi"
                value={formData.sub_text_color}
                displayValue={getColorName(formData.sub_text_color, TEXT_COLORS)}
                color={formData.sub_text_color}
                onPress={() => setSubTextColorPickerVisible(true)}
              />

              {/* EMOJILAR */}
              <Text style={styles.sectionTitle}>Emojilar</Text>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.label}>Emoji 1</Text>
                  <TextInput style={styles.input} value={formData.emoji1} onChangeText={t => setFormData({...formData, emoji1: t})} placeholder="🍔" placeholderTextColor="#6B7280" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Emoji 2</Text>
                  <TextInput style={styles.input} value={formData.emoji2} onChangeText={t => setFormData({...formData, emoji2: t})} placeholder="🍕" placeholderTextColor="#6B7280" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Emoji 3</Text>
                  <TextInput style={styles.input} value={formData.emoji3} onChangeText={t => setFormData({...formData, emoji3: t})} placeholder="🥤" placeholderTextColor="#6B7280" />
                </View>
              </View>

              {/* HAVOLA */}
              <Text style={styles.sectionTitle}>Havola (bosilganda qayerga o'tadi)</Text>

              <SelectButton
                label="Havola turi"
                value={formData.link_type}
                displayValue={getLinkTypeName(formData.link_type)}
                onPress={() => setLinkTypePickerVisible(true)}
              />

              {formData.link_type === 'category' && (
                <SelectButton
                  label="Kategoriya tanlang"
                  value={formData.link_id}
                  displayValue={getLinkIdName('category', formData.link_id) || 'Tanlang...'}
                  onPress={() => setLinkIdPickerVisible(true)}
                />
              )}

              {formData.link_type === 'product' && (
                <SelectButton
                  label="Maxsulot tanlang"
                  value={formData.link_id}
                  displayValue={getLinkIdName('product', formData.link_id) || 'Tanlang...'}
                  onPress={() => setLinkIdPickerVisible(true)}
                />
              )}

              {formData.link_type === 'url' && (
                <>
                  <Text style={styles.label}>URL manzil</Text>
                  <TextInput style={styles.input} value={formData.link_id} onChangeText={t => setFormData({...formData, link_id: t})} placeholder="https://example.com" placeholderTextColor="#6B7280" />
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Saqlash</Text>
              </TouchableOpacity>
              <View style={{height: 80}} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rang tanlash modallari */}
      <PickerModal
        visible={bgColorPickerVisible}
        onClose={() => setBgColorPickerVisible(false)}
        title="Orqa fon rangini tanlang"
        options={bgColorOptions}
        selectedValue={formData.bg_color}
        onSelect={(v) => setFormData({...formData, bg_color: v})}
      />
      <PickerModal
        visible={textColorPickerVisible}
        onClose={() => setTextColorPickerVisible(false)}
        title="Sarlavha rangini tanlang"
        options={textColorOptions}
        selectedValue={formData.text_color}
        onSelect={(v) => setFormData({...formData, text_color: v})}
      />
      <PickerModal
        visible={subTextColorPickerVisible}
        onClose={() => setSubTextColorPickerVisible(false)}
        title="Qisqa matn rangini tanlang"
        options={textColorOptions}
        selectedValue={formData.sub_text_color}
        onSelect={(v) => setFormData({...formData, sub_text_color: v})}
      />

      {/* Link turi tanlash */}
      <PickerModal
        visible={linkTypePickerVisible}
        onClose={() => setLinkTypePickerVisible(false)}
        title="Havola turini tanlang"
        options={LINK_TYPES.map(lt => ({ label: lt.label, value: lt.value }))}
        selectedValue={formData.link_type}
        onSelect={(v) => setFormData({...formData, link_type: v, link_id: ''})}
      />

      {/* Link ID tanlash (kategoriya/maxsulot) */}
      <PickerModal
        visible={linkIdPickerVisible}
        onClose={() => setLinkIdPickerVisible(false)}
        title={formData.link_type === 'category' ? 'Kategoriyani tanlang' : 'Maxsulotni tanlang'}
        options={getLinkIdOptions()}
        selectedValue={formData.link_id}
        onSelect={(v) => setFormData({...formData, link_id: v})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16 },
  card: {
    backgroundColor: '#1F2937', borderRadius: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#374151', overflow: 'hidden'
  },
  bannerPreview: {
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  bannerSubtitle: { fontSize: 14 },
  bannerEmojis: { fontSize: 26 },
  info: {
    padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  infoDetails: { flex: 1 },
  infoBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  badgeText: { color: '#D1D5DB', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconBtn: { padding: 10, borderRadius: 10 },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#9CA3AF', fontSize: 16 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#EF4444', width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  form: { padding: 20 },
  sectionTitle: {
    color: '#60A5FA', fontSize: 15, fontWeight: 'bold', marginBottom: 12, marginTop: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  label: { color: '#D1D5DB', fontSize: 14, marginBottom: 6 },
  input: { backgroundColor: '#374151', color: '#FFF', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#4B5563' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 1, marginRight: 8 },

  // Select tugmasi
  selectBtn: {
    backgroundColor: '#374151', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#4B5563',
  },
  selectBtnText: { color: '#FFF', fontSize: 15, flex: 1 },
  colorDotSmall: { width: 20, height: 20, borderRadius: 10, marginRight: 10, borderWidth: 1.5, borderColor: '#6B728080' },

  // Preview
  previewBox: {
    borderRadius: 14, padding: 20, marginBottom: 16,
  },
  previewContent: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  previewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  previewSubtitle: { fontSize: 14, opacity: 0.9 },

  // Picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  pickerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  pickerList: { padding: 8, paddingBottom: 60 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, marginVertical: 2,
  },
  pickerItemSelected: { backgroundColor: '#374151' },
  pickerItemText: { color: '#D1D5DB', fontSize: 15, flex: 1 },
  pickerItemTextSelected: { color: '#FFF', fontWeight: 'bold' },
  colorDot: { width: 28, height: 28, borderRadius: 14, marginRight: 12, borderWidth: 1.5, borderColor: '#6B728080' },

  saveBtn: { backgroundColor: '#EF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
