import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Platform, TextInput, FlatList } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Plus, Minus, X, Search } from 'lucide-react-native';
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
  const n = Number(num);
  if (isNaN(n)) return '0';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Parse variants safely from item
const parseVariants = (item) => {
  try {
    const v = typeof item?.variants === 'string' ? JSON.parse(item.variants || '[]') : (item?.variants || []);
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
};

// Memoized Product Card - only re-renders when its own props change
const ProductCard = React.memo(({ item, qty, onPress, onAdd, onMinus, onPlus, lang }) => {
  const variants = parseVariants(item);
  const hasVariants = variants.length > 0;
  const displayPrice = hasVariants
    ? Math.min(...variants.map(v => Number(v.price) || Number(item.price || 0)))
    : (Number(item.price) || 0);

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImageContainer}>
        {item.emoji?.startsWith('http') ? (
          <ExpoImage
            source={{ uri: item.emoji }}
            style={styles.productImage}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
          />
        ) : (
          <Text style={styles.productEmoji}>{item.emoji}</Text>
        )}
      </View>
      <View style={styles.productInfo}>
        <View style={styles.productNameRow}>
          <Text style={styles.productName} numberOfLines={2}>
            {lang === 'ru' ? item.name_ru || item.name : item.name}
          </Text>
          {item.weight ? (
            <View style={styles.weightBadge}>
              <Text style={styles.weightText}>{item.weight}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>{formatNumber(displayPrice)}</Text>
            <Text style={styles.productPriceSuffix}>so'm{hasVariants ? 'dan' : ''}</Text>
          </View>
          {qty === 0 ? (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={hasVariants ? onPress : onAdd}
              activeOpacity={0.7}
            >
              <Plus size={20} color={ACCENT} strokeWidth={3} />
            </TouchableOpacity>
          ) : (
            hasVariants ? (
              <TouchableOpacity style={styles.variantQtyBadge} onPress={onPress} activeOpacity={0.7}>
                <Text style={styles.variantQtyText}>{qty}✓</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyControlInline}>
                <TouchableOpacity
                  onPress={onMinus}
                  style={styles.qtyBtnMinus}
                >
                  <Minus size={14} color={TEXT_SECONDARY} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.qtyTextInline}>{qty}</Text>
                <TouchableOpacity
                  onPress={onPlus}
                  style={styles.qtyBtnPlus}
                >
                  <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function CatalogScreen({ route }) {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(route.params?.category || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
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

  // Build a quick lookup map for cart quantities to avoid .find() on every render
  // For variant items, sum all variant quantities under same baseId
  const cartQuantityMap = useMemo(() => {
    const map = {};
    cartItems.forEach(item => {
      // Direct id quantity
      map[item.id] = (map[item.id] || 0) + item.quantity;
      // Also accumulate to baseId so parent card shows total count
      if (item.baseId && item.baseId !== item.id) {
        map[item.baseId] = (map[item.baseId] || 0) + item.quantity;
      }
      // Handle string ids like "123_4dona" — accumulate to base numeric id
      if (typeof item.id === 'string') {
        const underscoreIdx = item.id.indexOf('_');
        if (underscoreIdx > 0) {
          const baseId = item.id.slice(0, underscoreIdx);
          map[baseId] = (map[baseId] || 0) + item.quantity;
        }
      }
    });
    return map;
  }, [cartItems]);

  const getItemQuantity = useCallback((id) => {
    return cartQuantityMap[id] || 0;
  }, [cartQuantityMap]);

  // Memoize filtered items to avoid recalculation on every render
  const filteredItems = useMemo(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return menuItems.filter(item => {
        const nameUz = (item.name || '').toLowerCase();
        const nameRu = (item.name_ru || '').toLowerCase();
        return nameUz.includes(query) || nameRu.includes(query);
      });
    }
    if (activeCategory) {
      return menuItems.filter(item => item.category === activeCategory);
    }
    return menuItems;
  }, [menuItems, searchQuery, activeCategory]);

  // Stable callback references for FlatList items
  const handleAddToCart = useCallback((item) => {
    addToCart(item);
  }, [addToCart]);

  const handleUpdateQuantityMinus = useCallback((id) => {
    updateQuantity(id, -1);
  }, [updateQuantity]);

  const handleUpdateQuantityPlus = useCallback((id) => {
    updateQuantity(id, 1);
  }, [updateQuantity]);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    if (text.trim()) {
      setActiveCategory(null);
    }
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    setSelectedVariant(null);
  }, []);

  const handleSelectProduct = useCallback((item) => {
    setSelectedProduct(item);
    // Auto-select first variant if available
    const v = parseVariants(item);
    setSelectedVariant(v.length > 0 ? v[0] : null);
  }, []);

  // Render item for FlatList
  const renderProductItem = useCallback(({ item }) => {
    const qty = cartQuantityMap[item.id] || 0;
    return (
      <ProductCard
        item={item}
        qty={qty}
        onPress={() => handleSelectProduct(item)}
        onAdd={() => handleAddToCart(item)}
        onMinus={() => handleUpdateQuantityMinus(item.id)}
        onPlus={() => handleUpdateQuantityPlus(item.id)}
        lang={i18n.language}
      />
    );
  }, [cartQuantityMap, i18n.language, handleSelectProduct, handleAddToCart, handleUpdateQuantityMinus, handleUpdateQuantityPlus]);

  const keyExtractor = useCallback((item) => String(item.id), []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('catalog', 'Katalog')}</Text>
        <Text style={styles.headerSubtitle}>{filteredItems.length} {t('items_count', 'ta taom')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={TEXT_SECONDARY} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search', 'Qidirish...')}
            placeholderTextColor={'#666666'}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.searchClearBtn}>
              <X size={16} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>
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
                <ExpoImage
                  source={{ uri: cat.emoji }}
                  style={styles.categoryChipImage}
                  contentFit="cover"
                  transition={150}
                  cachePolicy="memory-disk"
                />
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

      {/* Menu Grid — FlatList for virtualized rendering */}
      <FlatList
        data={filteredItems}
        renderItem={renderProductItem}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={3}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={false}
        getItemLayout={undefined}
      />

      {/* Product Modal */}
      <Modal visible={!!selectedProduct} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleCloseModal} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
              <X size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>

            {selectedProduct && (() => {
              const variants = parseVariants(selectedProduct);
              const hasVariants = variants.length > 0;
              const currentPrice = selectedVariant ? Number(selectedVariant.price) : Number(selectedProduct.price || 0);
              const currentId = selectedVariant ? `${selectedProduct.id}_${selectedVariant.name}` : selectedProduct.id;
              const currentQty = cartQuantityMap[currentId] || 0;

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalImageContainer}>
                    {selectedProduct.emoji?.startsWith('http') ? (
                      <ExpoImage
                        source={{ uri: selectedProduct.emoji }}
                        style={styles.modalProductImage}
                        contentFit="cover"
                        transition={200}
                        cachePolicy="memory-disk"
                      />
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

                    {/* Variants Selector */}
                    {hasVariants && (
                      <View style={styles.variantsSection}>
                        <Text style={styles.variantsSectionTitle}>Porsiya / O'lchamni tanlang:</Text>
                        <View style={styles.variantsGrid}>
                          {variants.map((v, idx) => {
                            const isSelected = selectedVariant && selectedVariant.name === v.name;
                            const vId = `${selectedProduct.id}_${v.name}`;
                            const vQty = cartQuantityMap[vId] || 0;
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.variantChip, isSelected && styles.variantChipActive]}
                                onPress={() => setSelectedVariant(v)}
                                activeOpacity={0.8}
                              >
                                {vQty > 0 && (
                                  <View style={styles.variantQtyDot}>
                                    <Text style={styles.variantQtyDotText}>{vQty}</Text>
                                  </View>
                                )}
                                <Text style={[styles.variantChipName, isSelected && styles.variantChipNameActive]}>{v.name}</Text>
                                <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceActive]}>
                                  {formatNumber(v.price)} so'm
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    )}

                    <View style={styles.modalFooter}>
                      <View>
                        <Text style={styles.modalPrice}>{formatNumber(currentPrice)}</Text>
                        <Text style={styles.modalPriceSuffix}>so'm{selectedVariant ? ` (${selectedVariant.name})` : ''}</Text>
                      </View>
                      {currentQty === 0 ? (
                        <TouchableOpacity
                          style={styles.modalAddBtn}
                          onPress={() => {
                            addToCart({
                              ...selectedProduct,
                              id: currentId,
                              baseId: selectedProduct.id,
                              name: selectedVariant
                                ? `${selectedProduct.name} (${selectedVariant.name})`
                                : selectedProduct.name,
                              price: currentPrice,
                              selectedVariant: selectedVariant ? selectedVariant.name : null,
                            });
                            if (!hasVariants) handleCloseModal();
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.modalAddText}>{t('add_to_cart', "Savatga qo'shish")}</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.modalQtyControl}>
                          <TouchableOpacity
                            onPress={() => updateQuantity(currentId, -1)}
                            style={styles.modalQtyBtn}
                          >
                            <Minus size={20} color={TEXT_SECONDARY} />
                          </TouchableOpacity>
                          <Text style={styles.modalQtyText}>{currentQty}</Text>
                          <TouchableOpacity
                            onPress={() => addToCart({
                              ...selectedProduct,
                              id: currentId,
                              baseId: selectedProduct.id,
                              name: selectedVariant
                                ? `${selectedProduct.name} (${selectedVariant.name})`
                                : selectedProduct.name,
                              price: currentPrice,
                              selectedVariant: selectedVariant ? selectedVariant.name : null,
                            })}
                            style={styles.modalQtyBtnPlus}
                          >
                            <Plus size={20} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                </ScrollView>
              );
            })()}
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

  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  searchInputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: DARK_CARD, borderRadius: 16,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1, fontSize: 15, color: TEXT_PRIMARY, fontWeight: '500',
    paddingVertical: 0
  },
  searchClearBtn: {
    padding: 6, backgroundColor: DARK_SURFACE, borderRadius: 12,
    marginLeft: 8
  },

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
  gridRow: { justifyContent: 'space-between' },

  productCard: {
    width: '48.5%', backgroundColor: DARK_CARD, borderRadius: 20, marginBottom: 14,
    borderWidth: 1, borderColor: BORDER_COLOR, overflow: 'hidden'
  },
  productImageContainer: {
    height: 125, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  productEmoji: { fontSize: 54 },
  productImage: { width: '100%', height: 125, resizeMode: 'cover' },
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
  modalProductImage: { width: '100%', height: 210, resizeMode: 'cover' },
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

  // Variants section
  variantsSection: { marginBottom: 20 },
  variantsSectionTitle: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY, marginBottom: 12, letterSpacing: 0.2 },
  variantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantChip: {
    position: 'relative',
    paddingVertical: 10, paddingHorizontal: 14,
    backgroundColor: DARK_SURFACE, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER_COLOR,
    minWidth: 80, alignItems: 'flex-start',
    marginRight: 8, marginBottom: 8,
  },
  variantChipActive: {
    backgroundColor: 'rgba(255,71,71,0.15)', borderColor: ACCENT,
  },
  variantChipName: { fontSize: 14, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 2 },
  variantChipNameActive: { color: ACCENT },
  variantChipPrice: { fontSize: 12, fontWeight: '700', color: TEXT_SECONDARY },
  variantChipPriceActive: { color: ACCENT },
  variantQtyDot: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: '#2E7D32', borderRadius: 10, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: DARK_CARD,
  },
  variantQtyDotText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },

  // Variant qty badge on product card
  variantQtyBadge: {
    backgroundColor: 'rgba(255,71,71,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.3)',
  },
  variantQtyText: { fontSize: 13, fontWeight: '800', color: ACCENT },
});
