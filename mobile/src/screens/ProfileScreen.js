import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { User, LogOut, MapPin, Navigation, Star, Edit3, Save, ChevronRight, Globe } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import { CartContext } from '../context/CartContext';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const formatNumber = (num) => {
  return Number(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export default function ProfileScreen() {
  const { user, login, logout, address, setAddress, updateUser } = useContext(CartContext);
  const { t, i18n } = useTranslation();
  
  // Auth states
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('+998');
  
  // App states
  const [tempAddress, setTempAddress] = useState(address);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Telegram Flow
  const [telegramFlowStep, setTelegramFlowStep] = useState(0);
  const [telegramCode, setTelegramCode] = useState('');

  // Profile Tabs & Editing
  const [activeTab, setActiveTab] = useState('profil');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Rating States
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrderToRate, setSelectedOrderToRate] = useState(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  React.useEffect(() => {
    if (user?.isLoggedIn) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditEmail(user.email || '');
      fetchOrders();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user?.isLoggedIn && user?.id) {
        api.get('/auth/client/me/' + user.id)
          .then(res => {
            updateUser(res.data);
          })
          .catch(err => console.log('Failed to refresh user data', err));
      }
    }, [user?.isLoggedIn, user?.id])
  );

  const fetchOrders = async (showLoading = true) => {
    if (!user?.id) return;
    if (showLoading) setLoadingOrders(true);
    try {
      const res = await api.get(`/orders/user/${user.id}`);
      setOrders(res.data);
    } catch (err) {
      console.log("Buyurtmalarni yuklashda xatolik", err);
    } finally {
      if (showLoading) setLoadingOrders(false);
    }
  };

  // Real-time updates for orders
  React.useEffect(() => {
    let interval;
    if (activeTab === 'buyurtmalar' && user?.isLoggedIn) {
      fetchOrders(true);
      interval = setInterval(() => {
        fetchOrders(false);
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await api.put('/auth/client/update', {
        id: user.id,
        name: editName,
        phone: editPhone,
        email: editEmail
      });
      login(res.data, user.token);
      setIsEditing(false);
      Alert.alert("Muvaffaqiyatli", "Ma'lumotlar saqlandi");
    } catch (err) {
      Alert.alert("Xatolik", err.response?.data?.error || "Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const submitRating = async () => {
    if (!selectedOrderToRate || rating === 0) return;
    try {
      await api.post(`/orders/${selectedOrderToRate}/rate`, {
        rating,
        comment: ratingComment
      });
      setRatingModalVisible(false);
      Alert.alert("Rahmat!", "Fikringiz uchun tashakkur.");
      fetchOrders(false);
    } catch (err) {
      Alert.alert("Xatolik", err.response?.data?.error || "Baholashda xatolik yuz berdi");
    }
  };

  const handlePhoneChange = (text) => {
    let cleaned = text.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+998')) cleaned = '+998';
    if (cleaned.length > 13) cleaned = cleaned.substring(0, 13);
    setPhone(cleaned);
  };

  const changeLanguage = async (lng) => {
    await i18n.changeLanguage(lng);
    await AsyncStorage.setItem('appLanguage', lng);
  };

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert("Xatolik", "Iltimos, barcha maydonlarni to'ldiring");
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/client/login' : '/auth/client/register';
      const payload = isLogin ? { email, password } : { name, email, password };
      
      const res = await api.post(endpoint, payload);
      login(res.data.user, res.data.token);
    } catch (err) {
      Alert.alert("Xatolik", err.response?.data?.error || "Xatolik yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider) => {
    if (provider === 'Google') {
      Alert.alert("Tez orada", "Google orqali kirish vaqtinchalik o'chirilgan.");
    } else if (provider === 'Telegram') {
      setTelegramFlowStep(1);
    } else {
      Alert.alert("Tez orada", `${provider} orqali kirish tez orada ishga tushadi!`);
    }
  };
  
  const handleTelegramContinue = () => {
    const botUrl = `https://t.me/zara_marketbot?start=login`;
    if (Platform.OS === 'web') {
      window.open(botUrl, '_blank');
    } else {
      import('react-native').then(({ Linking }) => Linking.openURL(botUrl));
    }
    setTelegramFlowStep(2);
  };
  
  const handleTelegramVerify = async () => {
    if (!telegramCode || telegramCode.length !== 6) {
      return;
    }
    setLoading(true);
    try {
      const device = Device.modelName || (Platform.OS === 'web' ? 'Web Brauzer' : 'Qurilma');
      const os = Device.osName || Platform.OS;
      const time = formatDate(new Date());
      
      const res = await api.post('/auth/client/telegram/verify', {
        code: telegramCode.trim(),
        device,
        os,
        location: tempAddress || 'Aniqlanmadi',
        time
      });
      
      if (res.data.status === 'success') {
        login(res.data.user, res.data.token);
        setTelegramFlowStep(0);
      }
    } catch (err) {
      Alert.alert("Xatolik", err.response?.data?.error || "Kod xato yoki tasdiqlanmadi");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (telegramCode.length === 6) {
      handleTelegramVerify();
    }
  }, [telegramCode]);

  const fetchLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Xatolik", "Lokatsiyani olish uchun ruxsat berilmadi!");
        setLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.coords.latitude}&lon=${location.coords.longitude}`);
          const data = await response.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.county || '';
            const road = data.address.road || data.address.suburb || '';
            const addr = `${city}${city && road ? ', ' : ''}${road}`;
            setTempAddress(addr || `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
          } else {
            setTempAddress(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
          }
        } catch (e) {
          setTempAddress(`${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
        }
      } else {
        let geocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (geocode && geocode.length > 0) {
          const place = geocode[0];
          const addressString = `${place.city || place.subregion || ''}, ${place.street || place.name || ''}`;
          setTempAddress(addressString);
        }
      }
    } catch (error) {
      Alert.alert("Xatolik", "Lokatsiyani aniqlab bo'lmadi.");
    } finally {
      setLocating(false);
    }
  };

  // ============== AUTH SCREENS ==============
  if (!user?.isLoggedIn) {
    if (telegramFlowStep > 0) {
      return (
        <View style={styles.authContainer}>
          <View style={styles.authHeader}>
            <View style={styles.authIconWrap}>
              <Navigation size={28} color="#3B82F6" />
            </View>
            <Text style={styles.authTitle}>Telegram orqali kirish</Text>
            <Text style={styles.authSubtitle}>
              {telegramFlowStep === 1 
                ? "Telefon raqamingizni kiriting va botga o'ting" 
                : "Bot bergan 6 xonali kodni kiriting"}
            </Text>
          </View>
          <View style={styles.authForm}>
            {telegramFlowStep === 1 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleTelegramContinue} activeOpacity={0.8}>
                <Text style={styles.primaryBtnText}>Davom etish (Botni ochish)</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput 
                  style={[styles.authInput, { textAlign: 'center', fontSize: 28, letterSpacing: 8, fontWeight: '900' }]}
                  value={telegramCode}
                  onChangeText={setTelegramCode}
                  keyboardType="number-pad"
                  placeholder="------"
                  maxLength={6}
                  placeholderTextColor="rgba(167,146,119,0.3)"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleTelegramVerify} disabled={loading} activeOpacity={0.8}>
                  {loading ? <ActivityIndicator color="#FFF2E1" /> : <Text style={styles.primaryBtnText}>Tasdiqlash va Kirish</Text>}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setTelegramFlowStep(0)} style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={styles.toggleLink}>Orqaga qaytish</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#FFF2E1' }} contentContainerStyle={styles.authContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.authHeader}>
          <View style={styles.authIconWrap}>
            <User size={28} color="#FF4747" />
          </View>
          <Text style={styles.authTitle}>{isLogin ? "Tizimga kirish" : "Ro'yxatdan o'tish"}</Text>
          <Text style={styles.authSubtitle}>
            {isLogin ? "Ma'lumotlaringizni kiritib profilingizga kiring" : "Yangi profil yarating va buyurtma bering"}
          </Text>
        </View>
        
        <View style={styles.authForm}>
          {!isLogin && (
            <TextInput 
              style={styles.authInput}
              value={name}
              onChangeText={setName}
              placeholder="Ismingiz"
              placeholderTextColor="rgba(167,146,119,0.5)"
            />
          )}
          
          <TextInput 
            style={styles.authInput}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="Email manzil"
            placeholderTextColor="rgba(167,146,119,0.5)"
            autoCapitalize="none"
          />
          
          <TextInput 
            style={styles.authInput}
            value={password}
            onChangeText={setPassword}
            placeholder="Parol"
            placeholderTextColor="rgba(167,146,119,0.5)"
            secureTextEntry
          />
          
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator color="#FFF2E1" /> : <Text style={styles.primaryBtnText}>{isLogin ? "Kirish" : "Ro'yxatdan o'tish"}</Text>}
          </TouchableOpacity>
          
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>{isLogin ? "Akkauntingiz yo'qmi?" : "Akkauntingiz bormi?"}</Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.toggleLink}>{isLogin ? "Ro'yxatdan o'tish" : "Tizimga kirish"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Yoki quyidagilar orqali</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.socialContainer}>
          <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialAuth('Google')} activeOpacity={0.7}>
            <Text style={styles.socialIcon}>G</Text>
            <Text style={styles.socialBtnText}>Google</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.socialBtn, { backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }]} onPress={() => handleSocialAuth('Telegram')} activeOpacity={0.7}>
            <Navigation size={18} color="#3B82F6" />
            <Text style={[styles.socialBtnText, { color: '#3B82F6' }]}>Telegram</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ============== LOGGED IN VIEW ==============
  const getStatusColor = (status) => {
    switch(status) {
      case 'new': return { bg: 'rgba(247,233,152,0.4)', text: '#A79277', label: 'Yangi', border: '#F7E998' };
      case 'preparing': return { bg: 'rgba(59,130,246,0.1)', text: '#1d4ed8', label: 'Tayyorlanmoqda', border: 'rgba(59,130,246,0.3)' };
      case 'delivering': return { bg: 'rgba(255,71,71,0.1)', text: '#FF4747', label: 'Yetkazilmoqda', border: 'rgba(255,71,71,0.3)' };
      case 'completed': return { bg: 'rgba(34,197,94,0.1)', text: '#15803d', label: 'Bajarildi', border: 'rgba(34,197,94,0.3)' };
      case 'rejected': return { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', label: 'Bekor qilindi', border: 'rgba(239,68,68,0.3)' };
      default: return { bg: '#f3f4f6', text: '#374151', label: "Noma'lum", border: '#e5e7eb' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile', 'Profil')}</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'profil' && styles.tabBtnActive]} onPress={() => setActiveTab('profil')}>
          <Text style={[styles.tabText, activeTab === 'profil' && styles.tabTextActive]}>{t('my_details', 'Ma\'lumotlarim')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'buyurtmalar' && styles.tabBtnActive]} onPress={() => setActiveTab('buyurtmalar')}>
          <Text style={[styles.tabText, activeTab === 'buyurtmalar' && styles.tabTextActive]}>{t('orders', 'Buyurtmalar')}</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {activeTab === 'profil' ? (
          <View style={styles.content}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user?.name && user.name.length > 0 ? user.name[0].toUpperCase() : 'M'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                {isEditing ? (
                  <>
                    <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder="Ism" placeholderTextColor="rgba(167,146,119,0.5)" />
                    <TextInput style={styles.editInput} value={editPhone} onChangeText={setEditPhone} placeholder="Telefon raqam" keyboardType="phone-pad" placeholderTextColor="rgba(167,146,119,0.5)" />
                    <TextInput style={styles.editInput} value={editEmail} onChangeText={setEditEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="rgba(167,146,119,0.5)" />
                    <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile}>
                      {loading ? <ActivityIndicator color="#FFF2E1" /> : <Text style={styles.saveProfileBtnText}>Saqlash</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.userName}>{user.name || 'Mijoz'}</Text>
                    <Text style={styles.userInfo}>{user.phone || 'Raqam kiritilmagan'}</Text>
                    <Text style={styles.userInfo}>{user.email || 'Email kiritilmagan'}</Text>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => setIsEditing(true)}>
                      <Edit3 size={14} color="#A79277" />
                      <Text style={styles.editProfileBtnText}>{t('edit', 'Tahrirlash')}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('language', 'Tilni tanlash')}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  style={[styles.langBtn, i18n.language === 'uz' && styles.langBtnActive]} 
                  onPress={() => changeLanguage('uz')}
                >
                  <Text style={[styles.langBtnText, i18n.language === 'uz' && styles.langBtnTextActive]}>O'zbek</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.langBtn, i18n.language === 'ru' && styles.langBtnActive]} 
                  onPress={() => changeLanguage('ru')}
                >
                  <Text style={[styles.langBtnText, i18n.language === 'ru' && styles.langBtnTextActive]}>Русский</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.cashbackCard}>
              <View style={styles.cashbackInner}>
                <Text style={styles.cashbackTitle}>Keshbek balansi</Text>
                <Text style={styles.cashbackValue}>{formatNumber(user.cashback_balance || 0)}</Text>
                <Text style={styles.cashbackSuffix}>tanga</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Yetkazib berish manzili</Text>
              <View style={styles.addressInputContainer}>
                <MapPin size={20} color="#FF4747" style={{ marginRight: 10 }} />
                <TextInput 
                  style={styles.addressInput}
                  value={tempAddress}
                  onChangeText={setTempAddress}
                  placeholder="Manzilni kiriting..."
                  placeholderTextColor="rgba(167,146,119,0.5)"
                />
                <TouchableOpacity onPress={fetchLocation} style={styles.locationBtn}>
                  {locating ? (
                    <ActivityIndicator size="small" color="#FF4747" />
                  ) : (
                    <Navigation size={18} color="#FF4747" />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => { setAddress(tempAddress); Alert.alert("Saqlandi", "Manzil muvaffaqiyatli saqlandi!"); }} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>{t('save', 'Saqlash')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <LogOut size={20} color="#FF4747" />
              <Text style={styles.logoutBtnText}>{t('logout', 'Tizimdan chiqish')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {loadingOrders ? (
              <ActivityIndicator size="large" color="#FF4747" style={{ marginTop: 40 }} />
            ) : orders.length === 0 ? (
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
                <Text style={styles.emptyOrdersText}>{t('no_orders', 'Hozircha buyurtmalar yo\'q')}</Text>
              </View>
            ) : (
              orders.map(order => {
                const status = getStatusColor(order.status);
                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>#{order.id}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: status.border }]}>
                        <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                    
                    <View style={styles.orderItems}>
                      {order.items && order.items.map((item, idx) => (
                        <Text key={idx} style={styles.orderItemRow}>{item.quantity}x {item.name}</Text>
                      ))}
                    </View>
                    
                    <View style={styles.orderFooter}>
                      <Text style={styles.orderTotal}>Jami: {formatNumber(order.total || 0)} so'm</Text>
                      {order.status === 'completed' && !order.is_rated && (
                        <TouchableOpacity 
                          style={styles.rateBtn} 
                          onPress={() => {
                            setSelectedOrderToRate(order.id);
                            setRating(5);
                            setRatingComment('');
                            setRatingModalVisible(true);
                          }}
                        >
                          <Star size={14} color="#FF4747" fill="rgba(255,71,71,0.2)" />
                          <Text style={styles.rateBtnText}>Baholash</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal visible={ratingModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setRatingModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Buyurtmani Baholash</Text>
            <Text style={styles.modalSubtitle}>Sizning fikringiz biz uchun muhim.</Text>
            
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)}>
                  <Star 
                    size={36} 
                    color={star <= rating ? "#FF4747" : "#D1D5DB"} 
                    fill={star <= rating ? "#FF4747" : "transparent"} 
                  />
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput 
              style={styles.commentInput}
              placeholder="Qo'shimcha izoh (ixtiyoriy)..."
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={3}
              placeholderTextColor="rgba(167,146,119,0.5)"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.modalCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitRating}>
                <Text style={styles.modalSubmitText}>Yuborish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Auth styles
  authContainer: { flexGrow: 1, backgroundColor: '#FFF2E1', padding: 24, justifyContent: 'center' },
  authHeader: { alignItems: 'center', marginBottom: 32 },
  authIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,71,71,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  authTitle: { fontSize: 28, fontWeight: '900', color: '#A79277', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  authSubtitle: { fontSize: 15, color: '#A79277', fontWeight: '500', opacity: 0.7, textAlign: 'center', lineHeight: 22 },
  authForm: { marginBottom: 24 },
  authInput: { backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, marginBottom: 14, fontSize: 16, color: '#A79277', borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', fontWeight: '500' },
  primaryBtn: { backgroundColor: '#FF4747', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 8, shadowColor: '#FF4747', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  primaryBtnText: { fontSize: 17, fontWeight: '900', color: '#FFF2E1' },
  toggleContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  toggleText: { color: '#A79277', fontSize: 14, opacity: 0.7 },
  toggleLink: { color: '#FF4747', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(167,146,119,0.15)' },
  dividerText: { marginHorizontal: 16, color: '#A79277', fontWeight: '600', fontSize: 13, opacity: 0.6 },
  
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', gap: 8 },
  socialIcon: { fontSize: 18, fontWeight: 'bold', color: '#DB4437' },
  socialBtnText: { fontSize: 15, fontWeight: '700', color: '#A79277' },

  // Logged-in styles
  container: { flex: 1, backgroundColor: '#FFF2E1' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#A79277', letterSpacing: -0.5 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#FF4747' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#A79277', opacity: 0.5 },
  tabTextActive: { color: '#A79277', fontWeight: '800', opacity: 1 },

  content: { padding: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,71,71,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#FF4747' },
  userName: { fontSize: 20, fontWeight: '900', color: '#A79277', marginBottom: 4 },
  userInfo: { fontSize: 14, color: '#A79277', fontWeight: '500', marginBottom: 2, opacity: 0.7 },
  
  editInput: { backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 14, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', color: '#A79277', fontWeight: '500' },
  editProfileBtn: { marginTop: 10, backgroundColor: 'rgba(247,233,152,0.4)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#F7E998' },
  editProfileBtnText: { fontSize: 13, fontWeight: '700', color: '#A79277' },
  saveProfileBtn: { marginTop: 8, backgroundColor: '#FF4747', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveProfileBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF2E1' },
  
  cashbackCard: { backgroundColor: 'rgba(247,233,152,0.4)', borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: '#F7E998', overflow: 'hidden' },
  cashbackInner: { padding: 24, alignItems: 'center' },
  cashbackTitle: { fontSize: 14, fontWeight: '700', color: '#A79277', marginBottom: 8, opacity: 0.7 },
  cashbackValue: { fontSize: 36, fontWeight: '900', color: '#A79277' },
  cashbackSuffix: { fontSize: 14, fontWeight: '600', color: '#A79277', opacity: 0.6, marginTop: 2 },

  section: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#A79277', marginBottom: 16 },
  addressInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 16, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)' },
  addressInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: '600', color: '#A79277' },
  locationBtn: { padding: 8, backgroundColor: 'rgba(255,71,71,0.1)', borderRadius: 12, marginLeft: 8 },
  saveBtn: { backgroundColor: '#FF4747', padding: 16, borderRadius: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF2E1' },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,71,71,0.08)', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  logoutBtnText: { marginLeft: 10, fontSize: 16, fontWeight: '700', color: '#FF4747' },

  langBtn: { flex: 1, paddingVertical: 14, backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', alignItems: 'center' },
  langBtnActive: { backgroundColor: '#FF4747', borderColor: '#FF4747' },
  langBtnText: { fontSize: 15, fontWeight: '700', color: '#A79277' },
  langBtnTextActive: { color: '#FFF2E1' },

  emptyOrdersText: { textAlign: 'center', fontSize: 16, color: '#A79277', fontWeight: '600', opacity: 0.6 },
  orderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(167,146,119,0.1)' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 17, fontWeight: '900', color: '#A79277' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  orderDate: { fontSize: 12, color: '#A79277', fontWeight: '500', marginBottom: 14, opacity: 0.5 },
  orderItems: { backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 14, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(167,146,119,0.08)' },
  orderItemRow: { fontSize: 13, color: '#A79277', marginBottom: 3, fontWeight: '500' },
  orderFooter: { borderTopWidth: 1, borderTopColor: 'rgba(167,146,119,0.1)', paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 15, fontWeight: '900', color: '#A79277' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,71,71,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  rateBtnText: { color: '#FF4747', fontWeight: '700', fontSize: 13 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#A79277', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#A79277', textAlign: 'center', marginBottom: 24, opacity: 0.6 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  commentInput: { backgroundColor: 'rgba(255,242,225,0.5)', borderRadius: 16, padding: 16, fontSize: 15, minHeight: 90, textAlignVertical: 'top', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(167,146,119,0.15)', color: '#A79277' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(167,146,119,0.1)', alignItems: 'center' },
  modalCancelText: { color: '#A79277', fontWeight: '700', fontSize: 15 },
  modalSubmitBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#FF4747', alignItems: 'center', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  modalSubmitText: { color: '#FFF2E1', fontWeight: '900', fontSize: 15 },
});
