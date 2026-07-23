import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, TextInput, Switch, ActivityIndicator } from 'react-native';
import { Plus, Minus, Trash2, MapPin } from 'lucide-react-native';
import { CartContext } from '../context/CartContext';
import { api } from '../api';
import { useTranslation } from 'react-i18next';

const formatNumber = (num) => {
  return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function CartScreen({ navigation }) {
  const { cartItems, removeFromCart, updateQuantity, getTotal, clearCart, user, address, updateUser } = useContext(CartContext);
  const [loading, setLoading] = useState(false);
  const [useCashback, setUseCashback] = useState(false);
  const { t, i18n } = useTranslation();
  
  const totalAmount = getTotal();
  const maxCashback = Math.min(user?.cashback_balance || 0, Math.floor(totalAmount / 2));
  const finalAmount = useCashback ? totalAmount - maxCashback : totalAmount;

  const [orderName, setOrderName] = useState(user?.name || '');
  const [orderPhone, setOrderPhone] = useState(user?.phone || '');
  const [orderAddress, setOrderAddress] = useState(address || '');

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

    if (!orderName.trim() || !orderPhone.trim() || !orderAddress.trim()) {
      Alert.alert(t('error', "Xatolik"), t('please_fill_all', "Iltimos, ism, telefon raqam va manzilni to'liq kiriting!"));
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer_name: orderName.trim(),
        phone: orderPhone.trim(),
        items: cartItems,
        total: totalAmount,
        address: orderAddress.trim(),
        user_id: user.id,
        cashback_used: useCashback ? maxCashback : 0
      };

      const res = await api.post('/orders', orderData);
      if (res.status === 201) {
        Alert.alert(t('success', "Muvaffaqiyatli!"), t('order_accepted', "Buyurtmangiz qabul qilindi."));
        clearCart();
        
        // Refresh user to update cashback balance
        api.get('/auth/client/me/' + user.id)
          .then(r => updateUser(r.data))
          .catch(e => console.error(e));

        navigation.navigate("Asosiy");
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
        <Text style={styles.emptyTitle}>{t('cart_empty', 'Savatchangiz bo\'sh')}</Text>
        <Text style={styles.emptySubtitle}>{t('cart_empty_desc', 'Mazali taomlarni tanlang va savatchaga qo\'shing')}</Text>
        <TouchableOpacity 
          style={styles.browseButton}
          onPress={() => navigation.navigate("Katalog")}
          activeOpacity={0.8}
        >
          <Text style={styles.browseButtonText}>Katalogga o'tish</Text>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {cartItems.map(item => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemImageWrap}>
              {item.emoji?.startsWith('http') ? (
                <Image source={{ uri: item.emoji }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
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
                  <Trash2 size={16} color="#FF4747" />
                </TouchableOpacity>
              </View>
              <Text style={styles.itemPrice}>{formatNumber(item.price * item.quantity)} so'm</Text>
              
              <View style={styles.actionRow}>
                <View style={styles.quantityControl}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, -1)} style={styles.qtyBtnMinus}>
                    <Minus size={14} color="#A79277" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, 1)} style={styles.qtyBtnPlus}>
                    <Plus size={14} color="#FFF2E1" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ))}

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Yetkazib berish ma'lumotlari</Text>
          <TextInput 
            style={styles.input} 
            placeholder={t('name', "Ismingiz *")}
            value={orderName} 
            onChangeText={setOrderName} 
            placeholderTextColor="#A79277"
          />
          <TextInput 
            style={styles.input} 
            placeholder={t('phone', "Telefon raqamingiz *")}
            value={orderPhone} 
            onChangeText={setOrderPhone} 
            keyboardType="phone-pad"
            placeholderTextColor="#A79277"
          />
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
            placeholder={t('address', "Yetkazib berish manzili *")}
            value={orderAddress} 
            onChangeText={setOrderAddress} 
            multiline
            placeholderTextColor="#A79277"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {maxCashback > 0 && (
          <View style={styles.cashbackToggleRow}>
            <View>
              <Text style={styles.cashbackToggleLabel}>Keshbekdan foydalanish</Text>
              <Text style={styles.cashbackToggleSub}>Max: {formatNumber(maxCashback)} tanga</Text>
            </View>
            <Switch 
              value={useCashback} 
              onValueChange={setUseCashback} 
              trackColor={{ false: '#d1d5db', true: '#F7E998' }}
              thumbColor={useCashback ? '#FF4747' : '#f4f3f4'}
            />
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('total_amount', 'Umumiy summa:')}</Text>
          <Text style={styles.totalValue}>{formatNumber(useCashback ? finalAmount : totalAmount)} so'm</Text>
        </View>
        {useCashback && maxCashback > 0 && (
          <View style={[styles.totalRow, { marginTop: -12 }]}>
            <Text style={[styles.totalLabel, { fontSize: 13 }]}>Keshbek chegirmasi:</Text>
            <Text style={[styles.totalLabel, { color: '#FF4747', fontWeight: '700' }]}>-{formatNumber(maxCashback)} so'm</Text>
          </View>
        )}
        <TouchableOpacity 
          style={[styles.checkoutBtn, loading && styles.checkoutBtnDisabled]} 
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFF2E1" />
          ) : (
            <Text style={styles.checkoutBtnText}>{t('checkout', 'Buyurtma berish')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF2E1', paddingHorizontal: 40 },
  emptyIconWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(247,233,152,0.4)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 22, color: '#A79277', fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#A79277', opacity: 0.6, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  browseButton: { backgroundColor: '#FF4747', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 20, shadowColor: '#FF4747', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  browseButtonText: { color: '#FFF2E1', fontSize: 16, fontWeight: '800' },

  container: { flex: 1, backgroundColor: '#FFF2E1' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#A79277', letterSpacing: -0.5 },
  itemCountBadge: { backgroundColor: 'rgba(255,71,71,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  itemCountText: { fontSize: 12, fontWeight: '800', color: '#FF4747' },

  scrollContent: { padding: 20, paddingBottom: 260 },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)' },
  itemImageWrap: { width: 80, height: 80, borderRadius: 16, backgroundColor: 'rgba(247,233,152,0.3)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  itemEmoji: { fontSize: 36 },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemName: { fontSize: 16, fontWeight: '700', color: '#A79277', flex: 1, marginRight: 8 },
  itemPrice: { fontSize: 15, fontWeight: '900', color: '#FF4747', marginTop: 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 6 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(247,233,152,0.5)', borderRadius: 14, padding: 3, borderWidth: 1, borderColor: '#F7E998' },
  qtyBtnMinus: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  qtyBtnPlus: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#FF4747', justifyContent: 'center', alignItems: 'center' },
  qtyText: { marginHorizontal: 14, fontWeight: '900', fontSize: 15, color: '#A79277' },
  deleteBtn: { padding: 6, backgroundColor: 'rgba(255,71,71,0.1)', borderRadius: 10 },

  formContainer: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginTop: 8, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)' },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#A79277', marginBottom: 16 },
  input: { backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#A79277', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', fontWeight: '500' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.97)', padding: 20, paddingBottom: 110, borderTopLeftRadius: 28, borderTopRightRadius: 28, shadowColor: '#A79277', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 10, borderTopWidth: 1, borderTopColor: 'rgba(167,146,119,0.1)' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' },
  totalLabel: { fontSize: 15, color: '#A79277', fontWeight: '600' },
  totalValue: { fontSize: 24, fontWeight: '900', color: '#A79277' },
  cashbackToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(247,233,152,0.4)', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F7E998' },
  cashbackToggleLabel: { fontSize: 14, fontWeight: '700', color: '#A79277' },
  cashbackToggleSub: { fontSize: 12, color: '#A79277', opacity: 0.7, marginTop: 2 },
  checkoutBtn: { backgroundColor: '#FF4747', paddingVertical: 18, borderRadius: 20, alignItems: 'center', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  checkoutBtnDisabled: { opacity: 0.7 },
  checkoutBtnText: { fontSize: 17, fontWeight: '900', color: '#FFF2E1' },
});
