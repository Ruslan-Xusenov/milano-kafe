import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Plus, Minus, Trash2, MapPin } from 'lucide-react-native';
import { CartContext } from '../context/CartContext';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
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
  return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart, user, address, updateUser } = useContext(CartContext);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const { t, i18n } = useTranslation();
  
  const totalAmount = getTotal();
  const maxCashback = Math.min(user?.cashback_balance || 0, Math.floor(totalAmount / 2));
  const finalAmount = useCashback ? totalAmount - maxCashback : totalAmount;

  const [orderName, setOrderName] = useState(user?.name || '');
  const [orderPhone, setOrderPhone] = useState(user?.phone || '');
  const [orderAddress, setOrderAddress] = useState(address || '');
  const [paymentMethod, setPaymentMethod] = useState('naqd');
  const [deliveryType, setDeliveryType] = useState('yetkazish'); // 'olib_ketish' yoki 'yetkazish'

  const [giftTiers, setGiftTiers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedGiftId, setSelectedGiftId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/settings').catch(() => ({ data: {} })),
      api.get('/menu').catch(() => ({ data: [] }))
    ]).then(([setRes, menuRes]) => {
      setMenuItems(menuRes.data || []);
      if (setRes.data && setRes.data.gift_tiers) {
        try {
          setGiftTiers(JSON.parse(setRes.data.gift_tiers));
        } catch (e) {
          console.error("Error parsing gift_tiers JSON", e);
        }
      }
    });
  }, []);

  const eligibleTier = giftTiers
    .filter(t => t.minSum <= totalAmount)
    .sort((a, b) => b.minSum - a.minSum)[0];

  useEffect(() => {
    if (!eligibleTier || !eligibleTier.itemIds.includes(selectedGiftId)) {
      setSelectedGiftId(null);
    }
  }, [eligibleTier, selectedGiftId]);

  useEffect(() => {
    if (user?.name) setOrderName(user.name);
    if (user?.phone) setOrderPhone(user.phone);
  }, [user]);

  useEffect(() => {
    if (address) setOrderAddress(address);
  }, [address]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    if (!user?.isLoggedIn) {
      Alert.alert(t('error', "Xatolik"), t('please_login_first', "Iltimos, avval profil sahifasiga kirib tizimdan o'ting."));
      navigation.navigate("Profil");
      return;
    }

    if (!orderName.trim() || !orderPhone.trim()) {
      Alert.alert(t('error', "Xatolik"), t('please_fill_all', "Iltimos, ism, telefon raqam va manzilni to'liq kiriting!"));
      return;
    }

    if (deliveryType === 'yetkazish' && !orderAddress.trim()) {
      Alert.alert(t('error', "Xatolik"), t('please_fill_all', "Iltimos, ism, telefon raqam va manzilni to'liq kiriting!"));
      return;
    }

    setLoading(true);
    try {
      const orderItems = [...cartItems];
      if (selectedGiftId) {
        const giftItem = menuItems.find(i => i.id === selectedGiftId);
        if (giftItem) {
          orderItems.push({
            id: giftItem.id,
            name: `🎁 ${giftItem.name}`,
            price: 0,
            quantity: 1
          });
        }
      }

      const orderData = {
        customer_name: orderName.trim(),
        phone: orderPhone.trim(),
        items: orderItems,
        total: totalAmount,
        address: deliveryType === 'olib_ketish' ? "O'zi olib ketish" : orderAddress.trim(),
        user_id: user.id,
        cashback_used: useCashback ? maxCashback : 0,
        payment_method: paymentMethod
      };

      const res = await api.post('/orders', orderData);
      if (res.status === 201) {
        setOrderSuccess(true);
        setTimeout(() => {
          setOrderSuccess(false);
          clearCart();
          
          api.get('/auth/client/me/' + user.id)
            .then(r => updateUser(r.data))
            .catch(e => console.error(e));

          navigation.navigate("Asosiy");
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t('error', "Xatolik"), t('order_error', "Buyurtma berishda xatolik yuz berdi."));
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Text style={styles.emptyIcon}>🛒</Text>
        </View>
        <Text style={styles.emptyTitle}>{t('cart_empty', "Savatchangiz bo'sh")}</Text>
        <Text style={styles.emptySubtitle}>{t('cart_empty_desc', "Mazali taomlarni tanlang va savatchaga qo'shing")}</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate("Katalog")}
          activeOpacity={0.8}
        >
          <Text style={styles.browseButtonText}>{t('go_to_catalog', "Katalogga o'tish")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('cart', 'Savatcha')}</Text>
        <View style={styles.itemCountBadge}>
          <Text style={styles.itemCountText}>{cartItems.reduce((s, i) => s + i.quantity, 0)} {t('items_count', 'ta')}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cartItems.map(item => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemImageWrap}>
              {item.emoji?.startsWith('http') || item.emoji?.startsWith('/uploads') ? (
                <ExpoImage
                  source={{ uri: getOptimizedImageUri(item.emoji, ImageSize.CART) }}
                  style={{ width: '100%', height: 70, borderRadius: 14 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={100}
                  recyclingKey={`cart-${item.id}`}
                  placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
                />
              ) : (
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
              )}
            </View>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {i18n.language === 'ru' ? item.name_ru || item.name : item.name}
                </Text>
                <TouchableOpacity onPress={() => removeFromCart(item.id)} style={styles.deleteBtn} activeOpacity={0.7}>
                  <Trash2 size={16} color={ACCENT} />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>{formatNumber(item.price * item.quantity)} so'm</Text>
              
              <View style={styles.actionRow}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtnMinus}>
                    <Minus size={14} color={TEXT_SECONDARY} strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtnPlus}>
                    <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Sovg'a tanlash */}
        {eligibleTier && eligibleTier.itemIds && eligibleTier.itemIds.length > 0 && (
          <View style={[styles.formContainer, { backgroundColor: '#FFFAED', borderColor: '#FDE68A' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>🎁</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#92400E' }}>Sovg'a tanlang!</Text>
            </View>
            <Text style={{ fontSize: 13, color: '#B45309', marginBottom: 16 }}>
              Sizning buyurtmangiz {formatNumber(eligibleTier.minSum)} so'mga yetdi. Quyidagi taomlardan birini bepul tanlashingiz mumkin:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8, gap: 12 }}>
              {eligibleTier.itemIds.map(itemId => {
                const item = menuItems.find(i => i.id === itemId);
                if (!item) return null;
                const isSelected = selectedGiftId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedGiftId(item.id)}
                    activeOpacity={0.8}
                    style={{
                      width: 130,
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: isSelected ? '#F59E0B' : 'transparent',
                      overflow: 'hidden',
                      shadowColor: '#000',
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                      transform: [{ scale: isSelected ? 1.05 : 1 }]
                    }}
                  >
                    {item.emoji?.startsWith('http') || item.emoji?.startsWith('/uploads') ? (
                      <ExpoImage
                        source={{ uri: getOptimizedImageUri(item.emoji, ImageSize.GIFT) }}
                        style={{ width: '100%', height: 90 }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        transition={100}
                        recyclingKey={`gift-${item.id}`}
                      />
                    ) : (
                      <View style={{ width: '100%', height: 90, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
                        <Text style={{ fontSize: 40 }}>{item.emoji || '🍽️'}</Text>
                      </View>
                    )}
                    <View style={{ padding: 8, alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1F2937', textAlign: 'center', marginBottom: 4 }} numberOfLines={2}>
                        {i18n.language === 'ru' ? item.name_ru || item.name : item.name}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#10B981' }}>Bepul</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{t('order_type', 'BUYURTMA TURI')}</Text>
          <View style={styles.deliveryToggleRow}>
            <TouchableOpacity 
              style={[styles.deliveryToggleBtn, deliveryType === 'olib_ketish' && styles.deliveryToggleBtnActive]}
              onPress={() => setDeliveryType('olib_ketish')}
              activeOpacity={0.8}
            >
              <Text style={styles.deliveryToggleEmoji}>🏃</Text>
              <Text style={[styles.deliveryToggleText, deliveryType === 'olib_ketish' && styles.deliveryToggleTextActive]}>
                {t('pickup', "O'zi olib ketish")}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.deliveryToggleBtn, deliveryType === 'yetkazish' && styles.deliveryToggleBtnActive]}
              onPress={() => setDeliveryType('yetkazish')}
              activeOpacity={0.8}
            >
              <Text style={styles.deliveryToggleEmoji}>🛵</Text>
              <Text style={[styles.deliveryToggleText, deliveryType === 'yetkazish' && styles.deliveryToggleTextActive]}>
                {t('delivery', 'Yetkazish')}
              </Text>
            </TouchableOpacity>
          </View>
          
          {deliveryType === 'yetkazish' && (
            <View style={styles.deliveryInfoBox}>
              <Text style={styles.deliveryInfoText}>
                {t('delivery_fee_info', 'Yetkazish narxi buyurtmaga kirmagan. Operator narxni alohida kelishadi.')}
              </Text>
            </View>
          )}

          <TextInput 
            style={[styles.input, { marginTop: 16 }]} 
            placeholder={t('name', "Ismingiz *")}
            value={orderName} 
            onChangeText={setOrderName} 
            placeholderTextColor="#555555"
          />
          <TextInput 
            style={styles.input} 
            placeholder={t('phone', "Telefon raqamingiz *")}
            value={orderPhone} 
            onChangeText={setOrderPhone} 
            keyboardType="phone-pad"
            placeholderTextColor="#555555"
          />
          
          {deliveryType === 'yetkazish' && (
            <TextInput 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder={t('address', "Yetkazib berish manzili *")}
              value={orderAddress} 
              onChangeText={setOrderAddress} 
              multiline
              placeholderTextColor="#555555"
            />
          )}

          <Text style={styles.formTitle}>{t('payment_method', "To'lov turi")}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity 
              style={[styles.paymentBtn, paymentMethod === 'naqd' && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod('naqd')}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === 'naqd' && styles.paymentBtnTextActive]}>Naqd</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentBtn, paymentMethod === 'karta' && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod('karta')}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === 'karta' && styles.paymentBtnTextActive]}>Karta</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.paymentBtn, paymentMethod === 'click' && styles.paymentBtnActive]}
              onPress={() => setPaymentMethod('click')}
            >
              <Text style={[styles.paymentBtnText, paymentMethod === 'click' && styles.paymentBtnTextActive]}>Click</Text>
            </TouchableOpacity>
          </View>

          {maxCashback > 0 && (
            <View style={styles.cashbackToggleRow}>
              <View>
                <Text style={styles.cashbackToggleLabel}>Keshbekdan foydalanish</Text>
                <Text style={styles.cashbackToggleSub}>Max: {formatNumber(maxCashback)} tanga</Text>
              </View>
              <Switch 
                value={useCashback} 
                onValueChange={setUseCashback} 
                trackColor={{ false: '#333333', true: 'rgba(255,71,71,0.4)' }}
                thumbColor={useCashback ? ACCENT : '#666666'}
              />
            </View>
          )}
          {useCashback && maxCashback > 0 && (
            <View style={styles.cashbackDiscountRow}>
              <Text style={styles.cashbackDiscountLabel}>Keshbek chegirmasi:</Text>
              <Text style={styles.cashbackDiscountValue}>-{formatNumber(maxCashback)} so'm</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('total_amount', 'Jami:')}</Text>
          <Text style={styles.totalValue}>{formatNumber(useCashback ? finalAmount : totalAmount)} so'm</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]} 
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ExpoImage 
              source={require('../../assets/cart_loader.gif')} 
              style={{ width: 40, height: 40 }} 
              contentFit="contain" 
            />
          ) : (
            <Text style={styles.checkoutBtnText}>{t('checkout', 'Buyurtma berish')}</Text>
          )}
        </TouchableOpacity>
      </View>

      {orderSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successModal}>
             <ExpoImage 
               source={require('../../assets/success_loader.gif')} 
               style={{ width: 150, height: 150 }} 
               contentFit="contain" 
             />
             <Text style={styles.successText}>{t('order_accepted', "Buyurtmangiz qabul qilindi.")}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,71,71,0.1)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)'
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, color: TEXT_PRIMARY, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  browseButton: {
    backgroundColor: ACCENT, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
  },
  browseButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },

  container: { flex: 1, backgroundColor: DARK_BG },
  header: {
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: -0.5 },
  itemCountBadge: {
    backgroundColor: 'rgba(255,71,71,0.15)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,71,71,0.25)'
  },
  itemCountText: { fontSize: 12, fontWeight: '800', color: ACCENT },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 16 },
  cartItem: {
    flexDirection: 'row', backgroundColor: DARK_CARD, borderRadius: 18, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: BORDER_COLOR
  },
  itemImageWrap: {
    width: 76, height: 76, borderRadius: 14, backgroundColor: '#222222',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
    borderWidth: 1, borderColor: BORDER_COLOR
  },
  itemEmoji: { fontSize: 34 },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 15, fontWeight: '700', color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 15, fontWeight: '900', color: ACCENT, marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 6 },
  quantityControl: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: DARK_SURFACE,
    borderRadius: 12, padding: 3, borderWidth: 1, borderColor: BORDER_COLOR
  },
  qtyBtnMinus: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#333333', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { width: 28, height: 28, borderRadius: 8, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  qtyText: { marginHorizontal: 12, fontWeight: '900', fontSize: 14, color: TEXT_PRIMARY },
  deleteBtn: { padding: 6, backgroundColor: 'rgba(255,71,71,0.1)', borderRadius: 10 },

  formContainer: {
    backgroundColor: DARK_CARD, borderRadius: 22, padding: 18, marginTop: 8,
    borderWidth: 1, borderColor: BORDER_COLOR
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 14 },
  input: {
    backgroundColor: DARK_SURFACE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: TEXT_PRIMARY, marginBottom: 10, borderWidth: 1, borderColor: BORDER_COLOR, fontWeight: '500'
  },
  paymentBtn: {
    flex: 1, paddingVertical: 12, marginHorizontal: 4, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER_COLOR, alignItems: 'center', backgroundColor: DARK_SURFACE
  },
  paymentBtnActive: { borderColor: ACCENT, backgroundColor: 'rgba(255,71,71,0.1)' },
  paymentBtnText: { color: TEXT_SECONDARY, fontSize: 14, fontWeight: '700' },
  paymentBtnTextActive: { color: ACCENT },

  footer: {
    backgroundColor: DARK_CARD, padding: 18, paddingBottom: 20,
    marginBottom: 70,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 15,
    borderTopWidth: 1, borderTopColor: BORDER_COLOR
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' },
  totalLabel: { fontSize: 15, color: TEXT_SECONDARY, fontWeight: '600' },
  totalValue: { fontSize: 22, fontWeight: '900', color: TEXT_PRIMARY },
  cashbackToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: DARK_SURFACE, padding: 14, borderRadius: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.15)'
  },
  cashbackToggleLabel: { fontSize: 14, fontWeight: '700', color: TEXT_PRIMARY },
  cashbackToggleSub: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  checkoutBtn: {
    backgroundColor: ACCENT, paddingVertical: 17, borderRadius: 18, alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
  },
  checkoutBtnDisabled: { opacity: 0.7 },
  checkoutBtnText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
  cashbackDiscountRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 4, paddingBottom: 2
  },
  cashbackDiscountLabel: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: '600' },
  cashbackDiscountValue: { fontSize: 14, color: ACCENT, fontWeight: '700' },
  deliveryToggleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  deliveryToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: BORDER_COLOR,
    backgroundColor: DARK_SURFACE, gap: 8
  },
  deliveryToggleBtnActive: {
    backgroundColor: '#E6F4EA', borderColor: '#1E4620',
  },
  deliveryToggleEmoji: { fontSize: 16 },
  deliveryToggleText: { fontSize: 14, fontWeight: '700', color: TEXT_SECONDARY },
  deliveryToggleTextActive: { color: '#1E4620' },
  deliveryInfoBox: {
    backgroundColor: '#FEF3C7', borderColor: '#FDE68A', borderWidth: 1,
    borderRadius: 12, padding: 12, marginTop: 12
  },
  deliveryInfoText: { color: '#92400E', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  successOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 1000
  },
  successModal: {
    backgroundColor: DARK_CARD, padding: 30, borderRadius: 24,
    alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 15
  },
  successText: {
    color: TEXT_PRIMARY, fontSize: 18, fontWeight: '800', marginTop: 16, textAlign: 'center'
  }
});
