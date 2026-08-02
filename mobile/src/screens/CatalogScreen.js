import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Platform } from 'react-native';
import { Plus, Minus, X } from 'lucide-react-native';
import { api } from '../api';
import { CartContext } from '../context/CartContext';
import { useTranslation } from 'react-i18next';

const DARK_BG = '#1A1A1A';
const DARK_CARD = '#252525';
const DARK_SURFACE = '#2E2E2E';
const ACCENT = '#FF4747';
const BROWN = '#A79277';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#AAAAAA';
const BORDER_COLOR = 'rgba(255,255,255,0.07)';

const formatNumber = (num) => {
  return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function CatalogScreen({ route }) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(route.params?.category || null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { t, i18n } = useTranslation();

  const { cartItems, addToCart, removeFromCart, updateQuantity } = useContext(CartContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          api.get('/menu'),
          api.get('/categories')
        ]);
        setMenuItems(menuRes.data.filter(item => item.available));
        setCategories(catRes.data.filter(cat => cat.available));
      } catch (error) {
        console.error("Error fetching catalog data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (route.params?.category) {
      setActiveCategory(route.params.category);
    }
  }, [route.params?.category]);

  const getItemQuantity = (id) => {
    const item = cartItems.find(i => i.id === id);
    return item ? item.quantity : 0;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const filteredItems = activeCategory
    ? menuItems.filter(item => item.category === activeCategory)
    : menuItems;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('catalog', 'Katalog')}</Text>
        <Text style={styles.headerSubtitle}>{filteredItems.length} {t('items_count', 'ta taom')}</Text>
      </View>

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !activeCategory && styles.activeCategoryChip]}
            onPress={() => setActiveCategory(null)}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryChipEmoji}>🌟</Text>
            <Text style={[styles.categoryChipText, !activeCategory && styles.activeCategoryChipText]}>{t('all', 'Barchasi')}</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.name && styles.activeCategoryChip]}
              onPress={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              activeOpacity={0.8}
            >
              {cat.emoji?.startsWith('http') ? (
                <Image source={{ uri: cat.emoji }} style={styles.categoryChipImage} />
              ) : (
                <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
              )}
              <Text style={[styles.categoryChipText, activeCategory === cat.name && styles.activeCategoryChipText]}>
                {i18n.language === 'ru' ? cat.name_ru || cat.name : cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Menu Grid */}
      <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {filteredItems.map(item => {
            const qty = getItemQuantity(item.id);
            return (
              <TouchableOpacity key={item.id} style={styles.productCard} onPress={() => setSelectedProduct(item)} activeOpacity={0.85}>
                <View style={styles.productImageContainer}>
                  {item.emoji?.startsWith('http') ? (
                    <Image source={{ uri: item.emoji }} style={styles.productImage} />
                  ) : (
                    <Text style={styles.productEmoji}>{item.emoji}</Text>
                  )}
                </View>
                <View style={styles.productInfo}>
                  <View style={styles.productNameRow}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {i18n.language === 'ru' ? item.name_ru || item.name : item.name}
                    </Text>
                    {item.weight ? (
                      <View style={styles.weightBadge}>
                        <Text style={styles.weightText}>{item.weight}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.productFooter}>
                    <View>
                      <Text style={styles.productPrice}>{formatNumber(item.price)}</Text>
                      <Text style={styles.productPriceSuffix}>so'm</Text>
                    </View>
                    {qty === 0 ? (
                      <TouchableOpacity
                        style={styles.addBtn}
                        onPress={(e) => { e.stopPropagation?.(); addToCart(item); }}
                        activeOpacity={0.7}
                      >
                        <Plus size={20} color={ACCENT} strokeWidth={3} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyControlInline}>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); updateQuantity(item.id, -1); }}
                          style={styles.qtyBtnMinus}
                        >
                          <Minus size={14} color={TEXT_SECONDARY} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.qtyTextInline}>{qty}</Text>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); updateQuantity(item.id, 1); }}
                          style={styles.qtyBtnPlus}
                        >
                          <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>

      {/* Product Modal */}
      <Modal visible={!!selectedProduct} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setSelectedProduct(null)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedProduct(null)}>
              <X size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>

            {selectedProduct && (
              <>
                <View style={styles.modalImageContainer}>
                  {selectedProduct.emoji?.startsWith('http') ? (
                    <Image source={{ uri: selectedProduct.emoji }} style={styles.modalProductImage} />
                  ) : (
                    <Text style={styles.modalEmoji}>{selectedProduct.emoji}</Text>
                  )}
                </View>
                <View style={styles.modalBody}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalTitle}>
                      {i18n.language === 'ru' ? selectedProduct.name_ru || selectedProduct.name : selectedProduct.name}
                    </Text>
                    {selectedProduct.weight && (
                      <View style={styles.modalWeightBadge}>
                        <Text style={styles.modalWeightText}>{selectedProduct.weight}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.modalDesc}>
                    {i18n.language === 'ru' 
                      ? selectedProduct.description_ru || selectedProduct.description || "Вкусное блюдо, приготовлено из лучших ингредиентов."
                      : selectedProduct.description || "Mazali taom, eng yaxshi masalliqlardan tayyorlangan."}
                  </Text>

                  <View style={styles.modalFooter}>
                    <View>
                      <Text style={styles.modalPrice}>{formatNumber(selectedProduct.price)}</Text>
                      <Text style={styles.modalPriceSuffix}>so'm</Text>
                    </View>
                    {getItemQuantity(selectedProduct.id) === 0 ? (
                      <TouchableOpacity
                        style={styles.modalAddBtn}
                        onPress={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.modalAddText}>{t('add_to_cart', "Savatga qo'shish")}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.modalQtyControl}>
                        <TouchableOpacity onPress={() => updateQuantity(selectedProduct.id, -1)} style={styles.modalQtyBtn}>
                          <Minus size={20} color={TEXT_SECONDARY} />
                        </TouchableOpacity>
                        <Text style={styles.modalQtyText}>{getItemQuantity(selectedProduct.id)}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(selectedProduct.id, 1)} style={styles.modalQtyBtnPlus}>
                          <Plus size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG },
  container: { flex: 1, backgroundColor: DARK_BG },

  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '500', marginTop: 2 },

  categoriesWrapper: { borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, backgroundColor: DARK_BG },
  categoriesContainer: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 9,
    backgroundColor: DARK_CARD, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  activeCategoryChip: {
    backgroundColor: ACCENT, borderColor: ACCENT,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4
  },
  categoryChipEmoji: { fontSize: 15, marginRight: 6 },
  categoryChipImage: { width: 15, height: 15, marginRight: 6 },
  categoryChipText: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  activeCategoryChipText: { color: '#FFFFFF' },

  gridContainer: { padding: 12, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  productCard: {
    width: '48.5%', backgroundColor: DARK_CARD, borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: BORDER_COLOR, overflow: 'hidden'
  },
  productImageContainer: {
    height: 125, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  productEmoji: { fontSize: 54 },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 12 },
  productNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY, flex: 1, lineHeight: 20, marginRight: 4 },
  weightBadge: {
    backgroundColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR
  },
  weightText: { fontSize: 10, fontWeight: '700', color: TEXT_SECONDARY },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 16, fontWeight: '900', color: ACCENT },
  productPriceSuffix: { fontSize: 11, fontWeight: '600', color: TEXT_SECONDARY, marginTop: -2 },

  addBtn: {
    width: 38, height: 38, backgroundColor: 'rgba(255,71,71,0.12)', borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,71,71,0.25)'
  },
  qtyControlInline: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_SURFACE,
    borderRadius: 12, padding: 3, borderWidth: 1, borderColor: BORDER_COLOR
  },
  qtyBtnMinus: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { width: 28, height: 28, borderRadius: 8, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  qtyTextInline: { marginHorizontal: 8, fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  modalContent: {
    backgroundColor: DARK_CARD, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 25,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)'
  },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444444', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  closeButton: {
    position: 'absolute', top: 18, right: 18, zIndex: 10, padding: 8,
    backgroundColor: DARK_SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER_COLOR
  },
  modalImageContainer: {
    height: 210, backgroundColor: '#222222', justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 16, borderRadius: 20, marginTop: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER_COLOR
  },
  modalProductImage: { width: '100%', height: '100%' },
  modalEmoji: { fontSize: 96 },
  modalBody: { padding: 22 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: TEXT_PRIMARY, flex: 1, letterSpacing: -0.3, marginRight: 8 },
  modalWeightBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: BORDER_COLOR
  },
  modalWeightText: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  modalDesc: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 22, marginBottom: 22, fontWeight: '400' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPrice: { fontSize: 26, fontWeight: '900', color: ACCENT },
  modalPriceSuffix: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  modalAddBtn: {
    backgroundColor: ACCENT, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 18,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
  },
  modalAddText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  modalQtyControl: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_SURFACE,
    borderRadius: 18, padding: 4, borderWidth: 1, borderColor: BORDER_COLOR
  },
  modalQtyBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  modalQtyBtnPlus: { width: 40, height: 40, borderRadius: 14, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { marginHorizontal: 14, fontSize: 18, fontWeight: '900', color: TEXT_PRIMARY },
});
