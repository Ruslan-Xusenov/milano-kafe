import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useFocusEffect } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { getOptimizedImageUri, ImageSize } from '../utils/imageOptimizer';

const { width } = Dimensions.get('window');

const DARK_BG = '#1A1A1A';
const DARK_CARD = '#252525';
const DARK_SURFACE = '#2E2E2E';
const ACCENT = '#FF4747';
const BROWN = '#A79277';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#AAAAAA';
const BORDER_COLOR = 'rgba(255,255,255,0.07)';

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  
  const [activeBanner, setActiveBanner] = useState(null);
  const [giftTiers, setGiftTiers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);

  const bannerRef = useRef(null);
  const { t, i18n } = useTranslation();

  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        try {
          const [banRes, catRes, setRes, menuRes] = await Promise.all([
            api.get('/banners'),
            api.get('/categories'),
            api.get('/settings').catch(() => ({ data: {} })),
            api.get('/menu').catch(() => ({ data: [] }))
          ]);
          setBanners(banRes.data || []);
          setCategories((catRes.data || []).filter(cat => cat.available));
          setMenuItems(menuRes.data || []);
          
          if (setRes.data) {
            try {
              if (setRes.data.active_banner) {
                setActiveBanner(JSON.parse(setRes.data.active_banner));
              } else {
                setActiveBanner(null);
              }
              if (setRes.data.gift_tiers) {
                setGiftTiers(JSON.parse(setRes.data.gift_tiers));
              } else {
                setGiftTiers([]);
              }
            } catch (e) {
              console.error("Error parsing settings JSON", e);
            }
          }
        } catch (error) {
          console.error("Error fetching home data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const fetchNotifications = async () => {
        try {
          const res = await api.get('/notifications');
          const unread = res.data.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        } catch (error) {
          // Ignore, user might not be logged in
        }
      };
      fetchNotifications();
    }, [])
  );

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true })
      ]).start(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const quickCategories = categories.filter(c => c.is_quick);
  const displayCategories = quickCategories.length > 0 ? quickCategories : categories;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/milano_icon_512.png')} style={{ width: 42, height: 42, borderRadius: 12 }} />
            <View>
              <Text style={styles.headerGreeting}>{t('greeting', 'Xush kelibsiz 👋')}</Text>
              <Text style={styles.headerTitle}>Milano Foods</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.notificationBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <ExpoImage 
              source={require('../../assets/bell_white.gif')} 
              style={{ width: 26, height: 26 }} 
              contentFit="contain" 
            />
            {unreadCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Banners */}
      {banners.length > 0 && (
        <View style={styles.bannerSection}>
          <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 16 }}>
            {banners.length > 0 && (
              <TouchableOpacity
                style={styles.bannerCard}
                onPress={() => {
                  const current = banners[currentBanner];
                  if (!current) return;
                  if (current.link_type === 'category' && current.link_id) {
                    // Kategoriya ID bo'yicha nomini topamiz
                    const cat = categories.find(c => String(c.id) === String(current.link_id));
                    if (cat) {
                      navigation.navigate('Katalog', { category: cat.name });
                    }
                  } else if (current.link_type === 'product' && current.link_id) {
                    navigation.navigate('Katalog', { productId: current.link_id });
                  }
                }}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#3D1A1A', '#2A0F0F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bannerGradient}
                >
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerBadgeText}>PREMIUM</Text>
                    </View>
                    <Text style={styles.bannerTitle}>{banners[currentBanner].title}</Text>
                    <Text style={styles.bannerSubtitle}>{banners[currentBanner].subtitle}</Text>
                    <View style={styles.bannerBtn}>
                      <Text style={styles.bannerBtnText}>{t('checkout', 'Buyurtma berish')}</Text>
                    </View>
                  </View>
                  <View style={styles.bannerEmojiContainer}>
                    <View style={styles.bannerEmojiGlow} />
                    <Text style={styles.bannerEmoji}>{banners[currentBanner].emoji || '🍽️'}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>
          {/* Dots */}
          {banners.length > 1 && (
            <View style={styles.dotsContainer}>
              {banners.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    currentBanner === index ? styles.dotActive : styles.dotInactive
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      )}

      {/* ACTIVE BANNER (from Broadcast) */}
      {activeBanner && (() => {
        const item = menuItems.find(i => i.id === activeBanner.productId);
        if (!item) return null;
        return (
          <TouchableOpacity
            style={[styles.bannerCard, { marginHorizontal: 16, marginBottom: 16, borderColor: 'rgba(255,200,0,0.3)' }]}
            onPress={() => navigation.navigate('Katalog', { productId: item.id })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4A2A00', '#2A1A00']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContent}>
                <View style={[styles.bannerBadge, { backgroundColor: 'rgba(255,200,0,0.2)', borderColor: 'rgba(255,200,0,0.4)' }]}>
                  <Text style={[styles.bannerBadgeText, { color: '#FFD700' }]}>MAXSUS TAKLIF</Text>
                </View>
                <Text style={styles.bannerTitle}>{item.name}</Text>
                <Text style={styles.bannerSubtitle}>{activeBanner.messageText}</Text>
                <View style={[styles.bannerBtn, { backgroundColor: '#FFD700' }]}>
                  <Text style={[styles.bannerBtnText, { color: '#000' }]}>Buyurtma berish</Text>
                </View>
              </View>
              <View style={styles.bannerEmojiContainer}>
                <View style={[styles.bannerEmojiGlow, { backgroundColor: 'rgba(255,200,0,0.1)' }]} />
                {item.emoji?.startsWith('http') || item.emoji?.startsWith('/uploads') ? (
                  <ExpoImage
                    source={{ uri: getOptimizedImageUri(item.emoji, ImageSize.BANNER) }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={100}
                    recyclingKey={`home-popular-${item.id}`}
                  />
                ) : (
                  <Text style={styles.bannerEmoji}>{item.emoji || '🎁'}</Text>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })()}

      {/* GIFT TIERS */}
      {giftTiers.map((tier, index) => {
        const items = tier.itemIds.map(id => menuItems.find(i => i.id === id)).filter(Boolean);
        if (items.length === 0) return null;
        
        return (
          <TouchableOpacity
            key={`gift-${index}`}
            style={[styles.bannerCard, { marginHorizontal: 16, marginBottom: 16, borderColor: 'rgba(255,165,0,0.3)' }]}
            onPress={() => navigation.navigate('Katalog')}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#D97706', '#9A3412']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              <View style={styles.bannerContent}>
                <View style={[styles.bannerBadge, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]}>
                  <Text style={[styles.bannerBadgeText, { color: '#FFF' }]}>SOVG'A</Text>
                </View>
                <Text style={styles.bannerTitle}>{tier.minSum.toLocaleString()} so'm</Text>
                <Text style={styles.bannerSubtitle}>Xarid qiling va quyidagilardan birini bepul oling: {items.map(i => i.name).join(', ')}</Text>
                <View style={[styles.bannerBtn, { backgroundColor: '#FFF' }]}>
                  <Text style={[styles.bannerBtnText, { color: '#D97706' }]}>{t('go_to_catalog', "Katalogga o'tish")}</Text>
                </View>
              </View>
              <View style={styles.bannerEmojiContainer}>
                <View style={[styles.bannerEmojiGlow, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                <Text style={styles.bannerEmoji}>🎁</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}

      {/* Quick Categories */}
      {displayCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {quickCategories.length > 0 ? (i18n.language === 'ru' ? 'Быстрый выбор' : 'Tezkor Tanlovlar') : t('all_dishes', 'Barcha toifalar')}
          </Text>
          <View style={styles.grid}>
            {displayCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => navigation.navigate('Katalog', { category: cat.name })}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#2A1010', '#1E0E0E']}
                  style={styles.categoryCardInner}
                >
                  {/* Image centered */}
                  <View style={styles.categoryEmojiWrap}>
                    {cat.emoji && (cat.emoji.startsWith('http') || cat.emoji.startsWith('/uploads')) ? (
                      <ExpoImage
                        source={{ uri: getOptimizedImageUri(cat.emoji, ImageSize.CHIP) }}
                        style={styles.categoryImage}
                        contentFit="contain"
                        cachePolicy="memory-disk"
                        transition={200}
                      />
                    ) : (
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    )}
                  </View>
                  {/* Name at bottom with gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(20,5,5,0.92)']}
                    style={styles.categoryNameOverlay}
                  >
                    <Text style={styles.categoryNameText} numberOfLines={2}>
                      {i18n.language === 'ru' ? cat.name_ru || cat.name : cat.name}
                    </Text>
                  </LinearGradient>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG },
  container: { flex: 1, backgroundColor: DARK_BG },

  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14 },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationBtn: {
    padding: 8,
    backgroundColor: DARK_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative'
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: ACCENT,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBg: {
    width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6, marginRight: 10
  },
  logoText: { fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  headerGreeting: { fontSize: 12, color: TEXT_SECONDARY, fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: TEXT_PRIMARY, letterSpacing: -0.5 },

  bannerSection: { marginBottom: 8 },
  bannerCard: {
    borderRadius: 22, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.15)'
  },
  bannerGradient: { borderRadius: 22, padding: 22, flexDirection: 'row', alignItems: 'center', minHeight: 180 },
  bannerContent: { flex: 1, paddingRight: 10 },
  bannerBadge: {
    backgroundColor: 'rgba(255,71,71,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.3)'
  },
  bannerBadgeText: { fontSize: 10, fontWeight: '800', color: ACCENT, letterSpacing: 1.5 },
  bannerTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.5, lineHeight: 30 },
  bannerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500', lineHeight: 20, marginBottom: 16 },
  bannerBtn: {
    backgroundColor: ACCENT, alignSelf: 'flex-start', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 18,
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 4
  },
  bannerBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  bannerEmojiContainer: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
  bannerEmojiGlow: { position: 'absolute', width: 110, height: 110, backgroundColor: 'rgba(255,71,71,0.1)', borderRadius: 55 },
  bannerEmoji: { fontSize: 58 },

  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14, gap: 6 },
  dot: { height: 5, borderRadius: 3 },
  dotActive: { width: 22, backgroundColor: ACCENT },
  dotInactive: { width: 5, backgroundColor: '#555555' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: TEXT_PRIMARY, marginBottom: 14, letterSpacing: -0.3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: {
    width: '48%', marginBottom: 14, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.18)',
    shadowColor: ACCENT, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6
  },
  categoryCardInner: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  categoryEmojiWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
  },
  categoryEmoji: {
    fontSize: 64,
    textShadowColor: 'rgba(255,71,71,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  categoryImage: { width: 110, height: 110 },
  categoryNameOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 22,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  categoryNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});
