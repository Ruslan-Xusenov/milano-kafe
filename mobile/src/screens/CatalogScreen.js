import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Platform, TextInput, FlatList } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Plus, Minus, X, Search } from 'lucide-react-native';
import { api } from '../api';
import { CartContext } from '../context/CartContext';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getOptimizedImageUri, ImageSize } from '../utils/imageOptimizer';

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
  const { t, i18n } = useTranslation();
  const variants = parseVariants(item);
  const hasVariants = variants.length > 0;
  const displayPrice = hasVariants
    ? Math.min(...variants.map(v => Number(v.price) || Number(item.price || 0)))
    : (Number(item.price) || 0);

  return (
    <TouchableOpacity style={styles.productCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.productImageContainer}>
        {item.emoji?.startsWith('http') || item.emoji?.startsWith('/uploads') ? (
          <ExpoImage
            source={{ uri: getOptimizedImageUri(item.emoji, ImageSize.THUMBNAIL) }}
            style={styles.productImage}
            contentFit="cover"
            transition={100}
            cachePolicy="memory-disk"
            recyclingKey={`product-${item.id}`}
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
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
            {item.old_price ? (
              <Text style={{ fontSize: 10, textDecorationLine: 'line-through', color: TEXT_SECONDARY, marginBottom: -2 }}>
                {formatNumber(hasVariants ? Math.min(...variants.map(v => Number(v.old_price) || Number(item.old_price || 0))) : item.old_price)} {t('currency', "so'm")}
              </Text>
            ) : null}
            <Text style={styles.productPrice}>{formatNumber(displayPrice)}</Text>
            <Text style={styles.productPriceSuffix}>{t('currency', "so'm")}{hasVariants ? (i18n.language === 'ru' ? '+' : 'dan') : ''}</Text>
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
  // Pagination
  const PAGE_SIZE = 12;
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const { cartItems, addToCart, removeFromCart, updateQuantity } = useContext(CartContext);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [menuRes, catRes] = await Promise.all([
          api.get('/menu'),
          api.get('/categories')
        ]);
        setMenuItems(menuRes.data.filter(item => item.available).map(item => {
          const discount = Number(item.discount_percent) || 0;
          if (discount > 0) {
            item.old_price = Number(item.price);
            item.price = Math.round(Number(item.price) * (1 - discount / 100));
            
            if (item.variants) {
              let variants = typeof item.variants === 'string' ? JSON.parse(item.variants) : item.variants;
              if (Array.isArray(variants)) {
                variants = variants.map(v => {
                  v.old_price = Number(v.price);
                  v.price = Math.round(Number(v.price) * (1 - discount / 100));
                  return v;
                });
                item.variants = JSON.stringify(variants);
              }
            }
          }
          return item;
        }));
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

  // Agar bannerdan maxsulot ID kelsa, maxsulotni ochish
  useEffect(() => {
    if (route.params?.productId && menuItems.length > 0) {
      const product = menuItems.find(p => String(p.id) === String(route.params.productId));
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [route.params?.productId, menuItems]);

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
    if (activeCategory === 'Aksiyalar') {
      return menuItems.filter(item => item.discount_percent > 0 || item.old_price);
    }
    if (activeCategory) {
      return menuItems.filter(item => item.category === activeCategory);
    }
    return menuItems;
  }, [menuItems, searchQuery, activeCategory]);

  // Paginated slice — faqat page*PAGE_SIZE ta element ko'rsatiladi
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, page * PAGE_SIZE);
  }, [filteredItems, page]);

  const hasMore = paginatedItems.length < filteredItems.length;

  // Kategoriya yoki qidiruv o'zgarganda pagination reset
  useEffect(() => {
    setPage(1);
  }, [activeCategory, searchQuery]);

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

  // Scroll oxiriga yetganda keyingi sahifani yuklash
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    // Bir oz kutib yangi batchni render qilamiz (UI freeze bo'lmasin)
    setTimeout(() => {
      setPage(prev => prev + 1);
      setLoadingMore(false);
    }, 300);
  }, [loadingMore, hasMore]);

  // FlatList pastida spinner
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }, [loadingMore]);

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
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === 'Aksiyalar' && styles.activeCategoryChip]}
            onPress={() => setActiveCategory(activeCategory === 'Aksiyalar' ? null : 'Aksiyalar')}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryChipEmoji}>🔥</Text>
            <Text style={[styles.categoryChipText, activeCategory === 'Aksiyalar' && styles.activeCategoryChipText]}>{t('discounts', 'Aksiyalar')}</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.name && styles.activeCategoryChip]}
              onPress={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
              activeOpacity={0.8}
            >
              {cat.emoji?.startsWith('http') || cat.emoji?.startsWith('/uploads') ? (
                <ExpoImage
                  source={{ uri: getOptimizedImageUri(cat.emoji, ImageSize.CHIP) }}
                  style={styles.categoryChipImage}
                  contentFit="cover"
                  transition={100}
                  cachePolicy="memory-disk"
                  recyclingKey={`cat-chip-${cat.id}`}
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

      {/* Menu Grid — paginated FlatList */}
      <FlatList
        data={paginatedItems}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
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
              const currentOldPrice = selectedVariant ? selectedVariant.old_price : selectedProduct.old_price;
              const currentId = selectedVariant ? `${selectedProduct.id}_${selectedVariant.name}` : selectedProduct.id;
              const currentQty = cartQuantityMap[currentId] || 0;

              return (
                <View style={{ flexShrink: 1 }}>
                  <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 120 }}>
                    <View style={styles.modalImageContainer}>
                      {selectedProduct.emoji?.startsWith('http') || selectedProduct.emoji?.startsWith('/uploads') ? (
                        <ExpoImage
                          source={{ uri: getOptimizedImageUri(selectedProduct.emoji, ImageSize.DETAIL) }}
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
                      <Text style={styles.modalTitle}>
                        {i18n.language === 'ru' ? selectedProduct.name_ru || selectedProduct.name : selectedProduct.name}
                      </Text>

                      {(selectedProduct.description || selectedProduct.description_ru) ? (
                        <Text style={styles.modalDesc}>
                          {i18n.language === 'ru'
                            ? selectedProduct.description_ru || selectedProduct.description
                            : selectedProduct.description || selectedProduct.description_ru}
                        </Text>
                      ) : null}

                      {/* Variants Selector */}
                      {hasVariants && (
                        <View style={styles.variantsSection}>
                          <Text style={styles.variantsSectionTitle}>{t('choose_portion', "Porsiya / O'lchamni tanlang:")}</Text>
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
                                  {v.old_price && (
                                    <Text style={{ fontSize: 12, textDecorationLine: 'line-through', color: '#666', marginBottom: 2 }}>
                                      {formatNumber(v.old_price)} {t('currency', "so'm")}
                                    </Text>
                                  )}
                                  <Text style={[styles.variantChipPrice, isSelected && styles.variantChipPriceActive]}>
                                    {formatNumber(v.price)} {t('currency', "so'm")}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      )}

                      {/* Same category related products */}
                      {(() => {
                        const related = menuItems.filter(
                          item => item.category === selectedProduct.category && item.id !== selectedProduct.id
                        ).slice(0, 10);
                        if (related.length === 0) return null;
                        return (
                          <View style={styles.relatedSection}>
                            <Text style={styles.modalSectionTitle}>
                              {t('more_in_category', 'Shu kategoriyadan yana')}
                            </Text>
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.relatedScrollContent}
                            >
                              {related.map(rItem => {
                                const rVariants = parseVariants(rItem);
                                const rPrice = rVariants.length > 0
                                  ? Math.min(...rVariants.map(v => Number(v.price)))
                                  : Number(rItem.price || 0);
                                return (
                                  <TouchableOpacity
                                    key={rItem.id}
                                    style={styles.relatedCard}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                      setSelectedProduct(rItem);
                                      const rv = parseVariants(rItem);
                                      setSelectedVariant(rv.length > 0 ? rv[0] : null);
                                    }}
                                  >
                                    <View style={styles.relatedImageWrap}>
                                      {rItem.emoji?.startsWith('http') || rItem.emoji?.startsWith('/uploads') ? (
                                        <ExpoImage
                                          source={{ uri: getOptimizedImageUri(rItem.emoji, ImageSize.THUMBNAIL) }}
                                          style={styles.relatedImage}
                                          contentFit="cover"
                                          cachePolicy="memory-disk"
                                          transition={100}
                                          recyclingKey={`related-${rItem.id}`}
                                        />
                                      ) : (
                                        <Text style={{ fontSize: 36 }}>{rItem.emoji}</Text>
                                      )}
                                    </View>
                                    <View style={styles.relatedInfo}>
                                      <Text style={styles.relatedName} numberOfLines={2}>
                                        {i18n.language === 'ru' ? rItem.name_ru || rItem.name : rItem.name}
                                      </Text>
                                      <Text style={styles.relatedPrice}>{formatNumber(rPrice)} {t('currency', "so'm")}</Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        );
                      })()}
                    </View>
                  </ScrollView>

                  {/* Fixed Bottom Action Bar */}
                  <View style={[styles.modalBottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
                    <View style={styles.modalPriceContainer}>
                      {currentOldPrice ? (
                        <Text style={styles.modalOldPrice}>
                          {formatNumber(currentOldPrice)} {t('currency', "so'm")}
                        </Text>
                      ) : null}
                      <Text style={styles.modalPrice}>{formatNumber(currentPrice)} <Text style={styles.modalPriceSuffix}>{t('currency', "so'm")}{selectedVariant ? ` (${selectedVariant.name})` : ''}</Text></Text>
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
                          <Minus size={22} color="#FFF" />
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
                          <Plus size={22} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
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
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)' },
  modalContent: {
    backgroundColor: '#1C1C1C', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 30,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  closeButton: {
    position: 'absolute', top: 14, right: 14, zIndex: 10, padding: 8,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
  },
  modalImageContainer: {
    height: 280, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center',
    width: '100%', overflow: 'hidden',
  },
  modalProductImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  modalEmoji: { fontSize: 110 },
  modalBody: { padding: 20, paddingBottom: 40 },
  modalTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  modalTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', flex: 1, letterSpacing: -0.5, lineHeight: 32, marginRight: 12 },
  modalWeightText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY, marginTop: 6 },

  modalSection: { marginTop: 14 },
  modalSectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_SECONDARY, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalDesc: { fontSize: 15, color: '#CCCCCC', lineHeight: 24, fontWeight: '400' },

  ingredientBox: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    borderWidth: 0,
  },

  relatedSection: { marginTop: 20, marginBottom: 8 },
  relatedScrollContent: { paddingRight: 8 },
  relatedCard: {
    width: 130,
    backgroundColor: '#252525',
    borderRadius: 16,
    marginRight: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  relatedImageWrap: {
    height: 90,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  relatedImage: { width: '100%', height: '100%' },
  relatedInfo: { padding: 8 },
  relatedName: {
    fontSize: 12, fontWeight: '700', color: '#FFFFFF',
    lineHeight: 16, marginBottom: 4,
  },
  relatedPrice: { fontSize: 12, fontWeight: '800', color: ACCENT },

  modalBottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1C1C1C', paddingHorizontal: 20, paddingVertical: 14, paddingBottom: Platform.OS === 'ios' ? 30 : 14,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  modalPriceContainer: { flex: 1 },
  modalPrice: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  modalPriceSuffix: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY },
  modalOldPrice: { fontSize: 13, textDecorationLine: 'line-through', color: '#666666', marginBottom: 2 },

  modalAddBtn: {
    backgroundColor: ACCENT, paddingVertical: 15, paddingHorizontal: 28, borderRadius: 100,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
  },
  modalAddText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  modalQtyControl: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2E2E',
    borderRadius: 100, padding: 5, width: 130, justifyContent: 'space-between'
  },
  modalQtyBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#3A3A3A', justifyContent: 'center', alignItems: 'center' },
  modalQtyBtnPlus: { width: 42, height: 42, borderRadius: 21, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  modalQtyText: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },

  // Variants section
  variantsSection: { marginBottom: 20 },
  variantsSectionTitle: { fontSize: 15, fontWeight: '800', color: TEXT_SECONDARY, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  variantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  variantChip: {
    position: 'relative',
    paddingVertical: 12, paddingHorizontal: 16,
    backgroundColor: '#252525', borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    minWidth: 90, alignItems: 'flex-start',
    marginRight: 10, marginBottom: 10,
  },
  variantChipActive: {
    backgroundColor: 'rgba(255,71,71,0.12)', borderColor: ACCENT,
  },
  variantChipName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  variantChipNameActive: { color: ACCENT },
  variantChipPrice: { fontSize: 13, fontWeight: '700', color: TEXT_SECONDARY },
  variantChipPriceActive: { color: ACCENT },
  variantQtyDot: {
    position: 'absolute', top: -8, right: -8,
    backgroundColor: '#2E7D32', borderRadius: 12, minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  variantQtyDotText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },

  // Variant qty badge on product card
  variantQtyBadge: {
    backgroundColor: 'rgba(255,71,71,0.12)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.3)',
  },
  variantQtyText: { fontSize: 13, fontWeight: '800', color: ACCENT },
});
