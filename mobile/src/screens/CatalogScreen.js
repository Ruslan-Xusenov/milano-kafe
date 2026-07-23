import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Platform } from 'react-native';
import { Plus, Minus, X } from 'lucide-react-native';
import { api } from '../api';
import { CartContext } from '../context/CartContext';
import { useTranslation } from 'react-i18next';

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
        <ActivityIndicator size="large" color="#FF4747" />
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
              <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
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
                        <Plus size={20} color="#FF4747" strokeWidth={3} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyControlInline}>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); updateQuantity(item.id, -1); }}
                          style={styles.qtyBtnMinus}
                        >
                          <Minus size={14} color="#A79277" strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.qtyTextInline}>{qty}</Text>
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation?.(); updateQuantity(item.id, 1); }}
                          style={styles.qtyBtnPlus}
                        >
                          <Plus size={14} color="#FFF2E1" strokeWidth={2.5} />
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
              <X size={20} color="#A79277" />
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
                        <Text style={styles.modalAddText}>{t('add_to_cart', 'Savatga qo\'shish')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.modalQtyControl}>
                        <TouchableOpacity onPress={() => updateQuantity(selectedProduct.id, -1)} style={styles.modalQtyBtn}>
                          <Minus size={20} color="#A79277" />
                        </TouchableOpacity>
                        <Text style={styles.modalQtyText}>{getItemQuantity(selectedProduct.id)}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(selectedProduct.id, 1)} style={styles.modalQtyBtnPlus}>
                          <Plus size={20} color="#FFF2E1" />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF2E1' },
  container: { flex: 1, backgroundColor: '#FFF2E1' },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#A79277', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, color: '#A79277', opacity: 0.6, fontWeight: '500', marginTop: 2 },

  categoriesWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(167,146,119,0.1)', backgroundColor: 'rgba(255,242,225,0.9)' },
  categoriesContainer: { paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(167,146,119,0.2)' },
  activeCategoryChip: { backgroundColor: '#FF4747', borderColor: '#FF4747', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  categoryChipEmoji: { fontSize: 16, marginRight: 6 },
  categoryChipText: { fontSize: 14, fontWeight: '700', color: '#A79277' },
  activeCategoryChipText: { color: '#FFF2E1' },

  gridContainer: { padding: 16, paddingBottom: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  productCard: { width: '48%', backgroundColor: '#fff', borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)', overflow: 'hidden' },
  productImageContainer: { height: 130, backgroundColor: 'rgba(247,233,152,0.3)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  productEmoji: { fontSize: 56 },
  productImage: { width: '100%', height: '100%' },
  productInfo: { padding: 14 },
  productNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  productName: { fontSize: 15, fontWeight: '700', color: '#A79277', flex: 1, lineHeight: 20, marginRight: 4 },
  weightBadge: { backgroundColor: 'rgba(247,233,152,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#F7E998' },
  weightText: { fontSize: 10, fontWeight: '700', color: '#A79277' },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productPrice: { fontSize: 17, fontWeight: '900', color: '#FF4747' },
  productPriceSuffix: { fontSize: 11, fontWeight: '600', color: '#A79277', marginTop: -2 },

  addBtn: { width: 42, height: 42, backgroundColor: '#FFF2E1', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  qtyControlInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,233,152,0.5)', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: '#F7E998' },
  qtyBtnMinus: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#FF4747', justifyContent: 'center', alignItems: 'center' },
  qtyTextInline: { marginHorizontal: 10, fontSize: 14, fontWeight: '800', color: '#A79277' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingBottom: 40, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  closeButton: { position: 'absolute', top: 20, right: 20, zIndex: 10, padding: 10, backgroundColor: '#FFF2E1', borderRadius: 20 },
  modalImageContainer: { height: 220, backgroundColor: 'rgba(247,233,152,0.3)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, borderRadius: 24, marginTop: 8, overflow: 'hidden' },
  modalProductImage: { width: '100%', height: '100%' },
  modalEmoji: { fontSize: 100 },
  modalBody: { padding: 24 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#A79277', flex: 1, letterSpacing: -0.3, marginRight: 8 },
  modalWeightBadge: { backgroundColor: 'rgba(247,233,152,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F7E998' },
  modalWeightText: { fontSize: 12, fontWeight: '700', color: '#A79277' },
  modalDesc: { fontSize: 15, color: '#A79277', opacity: 0.7, lineHeight: 24, marginBottom: 24, fontWeight: '400' },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalPrice: { fontSize: 28, fontWeight: '900', color: '#FF4747' },
  modalPriceSuffix: { fontSize: 13, fontWeight: '600', color: '#A79277' },
  modalAddBtn: { backgroundColor: '#FF4747', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 20, shadowColor: '#FF4747', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  modalAddText: { fontSize: 16, fontWeight: '800', color: '#FFF2E1' },
  modalQtyControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,233,152,0.5)', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#F7E998' },
  modalQtyBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  modalQtyBtnPlus: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#FF4747', justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { marginHorizontal: 16, fontSize: 18, fontWeight: '900', color: '#A79277' },
});
