import React, { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, ScrollView, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LogOut, MapPin, Navigation, Star, Edit3, Trash2 } from 'lucide-react-native';
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
  
  // Auth states (Telegram-only authentication)
  const [telegramCode, setTelegramCode] = useState('');
  const [botUsername, setBotUsername] = useState('BoomBurgerZar_bot');
  const codeInputRef = useRef(null);
  
  // App states
  const [tempAddress, setTempAddress] = useState(address);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile Tabs & Editing
  const [activeTab, setActiveTab] = useState('profil');
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  // Temp picker state
  const [pickerDay, setPickerDay] = useState(1);
  const [pickerMonth, setPickerMonth] = useState(1);
  const [pickerYear, setPickerYear] = useState(2000);

  // Rating States
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrderToRate, setSelectedOrderToRate] = useState(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');

  React.useEffect(() => {
    if (user?.isLoggedIn) {
      setEditName(user.name || '');
      setEditPhone(user.phone || '');
      setEditBirthday(user.birthday ? user.birthday.split('T')[0] : '');
      if (user.birthday) {
        const d = new Date(user.birthday);
        setPickerDay(d.getDate());
        setPickerMonth(d.getMonth() + 1);
        setPickerYear(d.getFullYear());
      }
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

  // Real-time updates for orders — faqat ekran aktiv bo'lganda ishlaydi
  useFocusEffect(
    useCallback(() => {
      let interval;
      if (activeTab === 'buyurtmalar' && user?.isLoggedIn) {
        fetchOrders(true);
        // 3s dan 10s ga oshirildi — batareyani saqlash uchun
        interval = setInterval(() => {
          fetchOrders(false);
        }, 10000);
      }
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [activeTab, user?.isLoggedIn, user?.id])
  );

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await api.put('/auth/client/update', {
        id: user.id,
        name: editName,
        phone: editPhone,
        email: user.email || null,
        birthday: editBirthday || null
      });
      login(res.data, user.token);
      setIsEditing(false);
      Alert.alert(t('success', "Muvaffaqiyatli"), t('data_saved', "Ma'lumotlar saqlandi"));
    } catch (err) {
      Alert.alert(t('error', "Xatolik"), err.response?.data?.error || t('save_error', "Saqlashda xatolik"));
    } finally {
      setLoading(false);
    }
  };

  const formatBirthday = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const getAge = (dateStr) => {
    if (!dateStr) return null;
    const bd = new Date(dateStr);
    if (isNaN(bd.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
    return age;
  };

  const confirmBirthdayPick = () => {
    const pad = (n) => n.toString().padStart(2, '0');
    const dateStr = `${pickerYear}-${pad(pickerMonth)}-${pad(pickerDay)}`;
    setEditBirthday(dateStr);
    setBirthdayPickerVisible(false);
  };

  const openBirthdayPicker = () => {
    if (editBirthday) {
      const d = new Date(editBirthday);
      setPickerDay(d.getDate());
      setPickerMonth(d.getMonth() + 1);
      setPickerYear(d.getFullYear());
    } else {
      setPickerDay(1);
      setPickerMonth(1);
      setPickerYear(2000);
    }
    setBirthdayPickerVisible(true);
  };

  const MONTHS_UZ = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
  const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const MONTHS = i18n.language === 'ru' ? MONTHS_RU : MONTHS_UZ;
  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate();
  const DAYS = Array.from({ length: getDaysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1);

  const submitRating = async () => {
    if (!selectedOrderToRate || rating === 0) return;
    try {
      await api.post(`/orders/${selectedOrderToRate}/rate`, {
        rating,
        comment: ratingComment
      });
      setRatingModalVisible(false);
      Alert.alert(t('thank_you', "Rahmat!"), t('thanks_for_feedback', "Fikringiz uchun tashakkur."));
      fetchOrders(false);
    } catch (err) {
      Alert.alert(t('error', "Xatolik"), err.response?.data?.error || t('rating_error', "Baholashda xatolik yuz berdi"));
    }
  };

  useEffect(() => {
    api.get('/config')
      .then(res => {
        if (res.data?.bot_username) {
          setBotUsername(res.data.bot_username);
        }
      })
      .catch(() => {});
  }, []);

  const changeLanguage = async (lng) => {
    await i18n.changeLanguage(lng);
    await AsyncStorage.setItem('appLanguage', lng);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('delete_account_title', "Hisobni o'chirish"),
      t('delete_account_confirm', "Haqiqatan ham akkauntingizni o'chirmoqchimisiz? Barcha shaxsiy ma'lumotlaringiz butunlay o'chiriladi."),
      [
        { text: t('cancel', "Bekor qilish"), style: 'cancel' },
        {
          text: t('delete', "O'chirish"),
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.delete('/auth/client/account');
              logout();
              Alert.alert(t('success', "Muvaffaqiyatli"), t('account_deleted', "Akkauntingiz muvaffaqiyatli o'chirildi"));
            } catch (err) {
              Alert.alert(t('error', "Xatolik"), err.response?.data?.error || t('delete_account_error', "Akkauntni o'chirishda xatolik yuz berdi"));
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleTelegramContinue = async () => {
    const botUrl = `https://t.me/${botUsername}?start=login`;
    if (Platform.OS === 'web') {
      window.open(botUrl, '_blank');
    } else {
      try {
        const supported = await Linking.canOpenURL(botUrl);
        if (supported) {
          await Linking.openURL(botUrl);
        } else {
          await Linking.openURL(`https://t.me/${botUsername}`);
        }
      } catch {
        Linking.openURL(botUrl).catch(() => {
          Alert.alert(t('error', "Xatolik"), t('telegram_open_error', "Telegram ilovasini ochib bo'lmadi"));
        });
      }
    }
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 400);
  };
  
  const handleTelegramVerify = useCallback(async () => {
    const code = telegramCode.trim();
    if (!code || code.length !== 6) {
      Alert.alert(t('error', "Xatolik"), t('enter_bot_code', "Bot bergan 6 xonali kodni kiriting"));
      return;
    }
    setLoading(true);
    try {
      const device = Device.modelName || (Platform.OS === 'web' ? 'Web Brauzer' : 'Qurilma');
      const os = Device.osName || Platform.OS;
      const time = formatDate(new Date());
      
      const res = await api.post('/auth/client/telegram/verify', {
        code,
        device,
        os,
        location: tempAddress || 'Aniqlanmadi',
        time
      });
      
      if (res.data.status === 'success') {
        login(res.data.user, res.data.token);
        setTelegramCode('');
      }
    } catch (err) {
      Alert.alert(t('error', "Xatolik"), err.response?.data?.error || t('code_invalid', "Kod xato yoki tasdiqlanmadi"));
    } finally {
      setLoading(false);
    }
  }, [telegramCode, tempAddress, login, t]);

  useEffect(() => {
    if (telegramCode.trim().length === 6) {
      handleTelegramVerify();
    }
  }, [telegramCode, handleTelegramVerify]);

  const fetchLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error', "Xatolik"), t('location_permission_denied', "Lokatsiyani olish uchun ruxsat berilmadi!"));
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
      Alert.alert(t('error', "Xatolik"), t('location_failed', "Lokatsiyani aniqlab bo'lmadi."));
    } finally {
      setLocating(false);
    }
  };

  // ============== AUTH SCREENS ==============
  if (!user?.isLoggedIn) {
    return (
      <ScrollView 
        style={{ flex: 1, backgroundColor: '#1A1A1A' }} 
        contentContainerStyle={styles.authContainer} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authHeader}>
          <View style={styles.authIconWrap}>
            <Navigation size={30} color="#229ED9" />
          </View>
          <Text style={styles.authTitle}>{t('register_via_telegram', "Telegram orqali ro'yxatdan o'tish")}</Text>
          <Text style={styles.authSubtitle}>
            {t('telegram_auth_subtitle', "Ro'yxatdan o'tish va tizimga kirish uchun Telegram botimizdan foydalaning")}
          </Text>
          
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language === 'uz' && styles.langBtnActive, { paddingVertical: 10 }]} 
              onPress={() => changeLanguage('uz')}
            >
              <Text style={[styles.langBtnText, i18n.language === 'uz' && styles.langBtnTextActive, { fontSize: 13 }]}>O'zbek</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.langBtn, i18n.language === 'ru' && styles.langBtnActive, { paddingVertical: 10 }]} 
              onPress={() => changeLanguage('ru')}
            >
              <Text style={[styles.langBtnText, i18n.language === 'ru' && styles.langBtnTextActive, { fontSize: 13 }]}>Русский</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.authForm}>
          <TouchableOpacity 
            style={[styles.telegramBtn, loading && { opacity: 0.7 }]} 
            onPress={handleTelegramContinue} 
            activeOpacity={0.8}
          >
            <Navigation size={22} color="#FFFFFF" />
            <Text style={styles.telegramBtnText}>{t('open_telegram_bot_btn', "Telegram bot orqali ro'yxatdan o'tish")}</Text>
          </TouchableOpacity>

          <Text style={styles.authStepHint}>
            {t('telegram_step_instructions', "1. Botga o'tib telefon raqamingizni tasdiqlang\n2. Bot yuborgan 6 xonali kodni quyida kiriting")}
          </Text>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('enter_bot_code_title', 'TASDIQLASH KODI')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TextInput 
            ref={codeInputRef}
            style={styles.codeInput}
            value={telegramCode}
            onChangeText={(text) => setTelegramCode(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="------"
            maxLength={6}
            placeholderTextColor="#444444"
          />

          <TouchableOpacity 
            style={[
              styles.primaryBtn, 
              telegramCode.length === 6 ? styles.primaryBtnActive : styles.primaryBtnInactive
            ]} 
            onPress={handleTelegramVerify} 
            disabled={loading} 
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.primaryBtnText, telegramCode.length !== 6 && { color: '#888888' }]}>
                {t('confirm_login', 'Tasdiqlash va Kirish')}
              </Text>
            )}
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
                    <TextInput style={styles.editInput} value={editName} onChangeText={setEditName} placeholder={t('name_placeholder', "Ism")} placeholderTextColor="#555555" />
                    <TextInput style={styles.editInput} value={editPhone} onChangeText={setEditPhone} placeholder={t('phone', "Telefon raqam")} keyboardType="phone-pad" placeholderTextColor="#555555" />
                    {/* Birthday Picker Button */}
                    <TouchableOpacity style={styles.birthdayPickerBtn} onPress={openBirthdayPicker} activeOpacity={0.8}>
                      <Text style={styles.birthdayPickerIcon}>🎂</Text>
                      <Text style={[styles.birthdayPickerText, editBirthday ? styles.birthdayPickerTextFilled : {}]}>
                        {editBirthday ? formatBirthday(editBirthday) : (i18n.language === 'ru' ? 'Дата рождения' : "Tug'ilgan kun")}
                      </Text>
                      {editBirthday && (
                        <TouchableOpacity onPress={() => setEditBirthday('')} style={styles.birthdayClearBtn}>
                          <Text style={styles.birthdayClearText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveProfileBtn} onPress={handleSaveProfile}>
                      {loading ? <ActivityIndicator color="#FFF2E1" /> : <Text style={styles.saveProfileBtnText}>{t('save', 'Saqlash')}</Text>}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.userName}>{user.name || t('guest', 'Mijoz')}</Text>
                    <Text style={styles.userInfo}>{user.phone || t('not_entered', 'Kiritilmagan')}</Text>
                    {user.birthday && (
                      <View style={styles.birthdayRow}>
                        <Text style={styles.birthdayIcon}>🎂</Text>
                        <Text style={styles.birthdayText}>
                          {formatBirthday(user.birthday)}
                          {getAge(user.birthday) !== null ? `  •  ${getAge(user.birthday)} ${i18n.language === 'ru' ? 'лет' : 'yosh'}` : ''}
                        </Text>
                      </View>
                    )}
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
                <Text style={styles.cashbackTitle}>{t('cashback_balance', 'Keshbek balansi')}</Text>
                <Text style={styles.cashbackValue}>{formatNumber(user.cashback_balance || 0)}</Text>
                <Text style={styles.cashbackSuffix}>{t('coin', 'tanga')}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('delivery_address', 'Yetkazib berish manzili')}</Text>
              <View style={styles.addressInputContainer}>
                <MapPin size={20} color="#FF4747" style={{ marginRight: 10 }} />
                <TextInput 
                  style={styles.addressInput}
                  value={tempAddress}
                  onChangeText={setTempAddress}
                  placeholder={t('enter_address', "Manzilni kiriting...")}
                  placeholderTextColor="#555555"
                />
                <TouchableOpacity onPress={fetchLocation} style={styles.locationBtn}>
                  {locating ? (
                    <ActivityIndicator size="small" color="#FF4747" />
                  ) : (
                    <Navigation size={18} color="#FF4747" />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.saveBtn} onPress={() => { setAddress(tempAddress); Alert.alert(t('saved', "Saqlandi"), t('address_saved', "Manzil muvaffaqiyatli saqlandi!")); }} activeOpacity={0.8}>
                <Text style={styles.saveBtnText}>{t('save', 'Saqlash')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.8}>
              <LogOut size={20} color="#FF4747" />
              <Text style={styles.logoutBtnText}>{t('logout', 'Tizimdan chiqish')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
              <Trash2 size={16} color="#777777" />
              <Text style={styles.deleteAccountBtnText}>{t('delete_account', "Hisobni o'chirish")}</Text>
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
                      <Text style={styles.orderTotal}>{t('total_amount', 'Jami summa:')} {formatNumber(order.total || 0)} so'm</Text>
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
                          <Text style={styles.rateBtnText}>{t('rate', 'Baholash')}</Text>
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
      <Modal visible={ratingModalVisible} transparent animationType="slide" onRequestClose={() => setRatingModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setRatingModalVisible(false)} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('rate_order', 'Buyurtmani Baholash')}</Text>
            <Text style={styles.modalSubtitle}>{t('rate_order_desc_mobile', 'Sizning fikringiz biz uchun muhim.')}</Text>
            
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
              placeholder={t('comment_optional', "Qo'shimcha izoh qoldiring (ixtiyoriy)...")}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={3}
              placeholderTextColor="#555555"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.modalCancelText}>{t('cancel', 'Bekor qilish')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={submitRating}>
                <Text style={styles.modalSubmitText}>{t('send', 'Yuborish')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Birthday Picker Modal */}
      <Modal visible={birthdayPickerVisible} transparent animationType="slide" onRequestClose={() => setBirthdayPickerVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setBirthdayPickerVisible(false)} activeOpacity={1} />
          <View style={[styles.modalContent, { paddingBottom: 30 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>🎂 {i18n.language === 'ru' ? "Дата рождения" : "Tug'ilgan kun"}</Text>

            <View style={styles.pickerContainer}>
              {/* Day */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>{i18n.language === 'ru' ? 'День' : 'Kun'}</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                >
                  {DAYS.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.pickerItem, pickerDay === d && styles.pickerItemActive]}
                      onPress={() => setPickerDay(d)}
                    >
                      <Text style={[styles.pickerItemText, pickerDay === d && styles.pickerItemTextActive]}>
                        {d.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month */}
              <View style={[styles.pickerCol, { flex: 2 }]}>
                <Text style={styles.pickerLabel}>{i18n.language === 'ru' ? 'Месяц' : 'Oy'}</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                >
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.pickerItem, pickerMonth === idx + 1 && styles.pickerItemActive]}
                      onPress={() => setPickerMonth(idx + 1)}
                    >
                      <Text style={[styles.pickerItemText, pickerMonth === idx + 1 && styles.pickerItemTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Year */}
              <View style={styles.pickerCol}>
                <Text style={styles.pickerLabel}>{i18n.language === 'ru' ? 'Год' : 'Yil'}</Text>
                <ScrollView
                  style={styles.pickerScroll}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={44}
                  decelerationRate="fast"
                >
                  {YEARS.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[styles.pickerItem, pickerYear === y && styles.pickerItemActive]}
                      onPress={() => setPickerYear(y)}
                    >
                      <Text style={[styles.pickerItemText, pickerYear === y && styles.pickerItemTextActive]}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setBirthdayPickerVisible(false)}>
                <Text style={styles.modalCancelText}>{t('cancel', 'Bekor qilish')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={confirmBirthdayPick}>
                <Text style={styles.modalSubmitText}>{t('save', 'Saqlash')}</Text>
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
  authContainer: { flexGrow: 1, backgroundColor: '#1A1A1A', padding: 24, justifyContent: 'center' },
  authHeader: { alignItems: 'center', marginBottom: 28 },
  authIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(34,158,217,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 18, borderWidth: 1.5, borderColor: 'rgba(34,158,217,0.25)' },
  authTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, letterSpacing: -0.5, textAlign: 'center' },
  authSubtitle: { fontSize: 14, color: '#AAAAAA', fontWeight: '500', textAlign: 'center', lineHeight: 21, paddingHorizontal: 12 },
  authForm: { marginBottom: 20 },
  telegramBtn: {
    backgroundColor: '#229ED9',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#229ED9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  telegramBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  authStepHint: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 22,
    lineHeight: 19,
    fontWeight: '500',
  },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { marginHorizontal: 14, color: '#666666', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  codeInput: {
    backgroundColor: '#252525',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 16,
    fontSize: 28,
    color: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 158, 217, 0.35)',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 10,
  },
  primaryBtn: { backgroundColor: '#FF4747', padding: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  primaryBtnActive: { backgroundColor: '#FF4747' },
  primaryBtnInactive: { backgroundColor: '#2E2E2E', shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  primaryBtnText: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },

  // Logged-in styles
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#FF4747' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#666666' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '800' },

  content: { padding: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#252525', padding: 18, borderRadius: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,71,71,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,71,71,0.3)' },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#FF4747' },
  userName: { fontSize: 19, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  userInfo: { fontSize: 13, color: '#AAAAAA', fontWeight: '500', marginBottom: 2 },
  
  editInput: { backgroundColor: '#2E2E2E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF', fontWeight: '500' },
  editProfileBtn: { marginTop: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  editProfileBtnText: { fontSize: 13, fontWeight: '700', color: '#AAAAAA' },
  saveProfileBtn: { marginTop: 8, backgroundColor: '#FF4747', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  saveProfileBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  
  cashbackCard: { backgroundColor: '#2E1A1A', borderRadius: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)', overflow: 'hidden' },
  cashbackInner: { padding: 22, alignItems: 'center' },
  cashbackTitle: { fontSize: 14, fontWeight: '700', color: '#AAAAAA', marginBottom: 8 },
  cashbackValue: { fontSize: 36, fontWeight: '900', color: '#FF4747' },
  cashbackSuffix: { fontSize: 14, fontWeight: '600', color: '#AAAAAA', marginTop: 2 },

  section: { backgroundColor: '#252525', padding: 18, borderRadius: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 14 },
  addressInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2E2E', borderRadius: 14, paddingHorizontal: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  addressInput: { flex: 1, paddingVertical: 14, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  locationBtn: { padding: 8, backgroundColor: 'rgba(255,71,71,0.12)', borderRadius: 12, marginLeft: 8 },
  saveBtn: { backgroundColor: '#FF4747', padding: 15, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,71,71,0.08)', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  logoutBtnText: { marginLeft: 10, fontSize: 16, fontWeight: '700', color: '#FF4747' },

  langBtn: { flex: 1, paddingVertical: 13, backgroundColor: '#2E2E2E', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
  langBtnActive: { backgroundColor: '#FF4747', borderColor: '#FF4747' },
  langBtnText: { fontSize: 14, fontWeight: '700', color: '#AAAAAA' },
  langBtnTextActive: { color: '#FFFFFF' },

  emptyOrdersText: { textAlign: 'center', fontSize: 16, color: '#AAAAAA', fontWeight: '600' },
  orderCard: { backgroundColor: '#252525', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderId: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '800' },
  orderDate: { fontSize: 12, color: '#666666', fontWeight: '500', marginBottom: 12 },
  orderItems: { backgroundColor: '#2E2E2E', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  orderItemRow: { fontSize: 13, color: '#AAAAAA', marginBottom: 3, fontWeight: '500' },
  orderFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 14, fontWeight: '900', color: '#FFFFFF' },
  rateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,71,71,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, gap: 6, borderWidth: 1, borderColor: 'rgba(255,71,71,0.2)' },
  rateBtnText: { color: '#FF4747', fontWeight: '700', fontSize: 13 },
  
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.75)' },
  modalContent: { backgroundColor: '#252525', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#444444', borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#AAAAAA', textAlign: 'center', marginBottom: 24 },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  commentInput: { backgroundColor: '#2E2E2E', borderRadius: 14, padding: 14, fontSize: 15, minHeight: 90, textAlignVertical: 'top', marginBottom: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#2E2E2E', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalCancelText: { color: '#AAAAAA', fontWeight: '700', fontSize: 15 },
  modalSubmitBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#FF4747', alignItems: 'center', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4 },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },

  // Birthday
  birthdayPickerBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E2E2E',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)'
  },
  birthdayPickerIcon: { fontSize: 18, marginRight: 10 },
  birthdayPickerText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#555555' },
  birthdayPickerTextFilled: { color: '#FFFFFF' },
  birthdayClearBtn: { padding: 4, marginLeft: 8 },
  birthdayClearText: { fontSize: 14, color: '#777777' },
  birthdayRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginTop: 2 },
  birthdayIcon: { fontSize: 14, marginRight: 6 },
  birthdayText: { fontSize: 13, color: '#AAAAAA', fontWeight: '500' },

  // Date Picker
  pickerContainer: {
    flexDirection: 'row', gap: 8, marginVertical: 16, height: 200
  },
  pickerCol: { flex: 1, overflow: 'hidden' },
  pickerLabel: {
    fontSize: 11, fontWeight: '700', color: '#666666', textAlign: 'center',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8
  },
  pickerScroll: { flex: 1 },
  pickerItem: {
    height: 44, justifyContent: 'center', alignItems: 'center',
    borderRadius: 10, marginBottom: 4
  },
  pickerItemActive: {
    backgroundColor: 'rgba(255,71,71,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.3)'
  },
  pickerItemText: { fontSize: 15, fontWeight: '600', color: '#666666' },
  pickerItemTextActive: { color: '#FF4747', fontWeight: '800' },
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, marginTop: 8, marginBottom: 20
  },
  deleteAccountBtnText: {
    fontSize: 13, fontWeight: '500', color: '#777777'
  }
});