import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

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
  const bannerRef = useRef(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [banRes, catRes] = await Promise.all([
          api.get('/banners'),
          api.get('/categories')
        ]);
        setBanners(banRes.data);
        setCategories(catRes.data.filter(cat => cat.available));
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
            <Bell size={24} color={TEXT_PRIMARY} />
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
                  if (current && current.link_type === 'category' && current.link_id) {
                    navigation.navigate('Katalog', { category: current.link_id });
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
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2E1A1A', '#251515']}
                  style={styles.categoryCardInner}
                >
                  <View style={styles.categoryTopRow}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {i18n.language === 'ru' ? cat.name_ru || cat.name : cat.name}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.categoryEmojiWrap}>
                    {cat.emoji && cat.emoji.startsWith('http') ? (
                      <Image source={{ uri: cat.emoji }} style={styles.categoryImage} resizeMode="contain" />
                    ) : (
                      <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                    )}
                  </View>
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
    borderWidth: 1, borderColor: 'rgba(255,71,71,0.12)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  categoryCardInner: { padding: 16, height: 140, justifyContent: 'space-between' },
  categoryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  categoryBadge: {
    backgroundColor: 'rgba(255,71,71,0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,71,71,0.25)'
  },
  categoryBadgeText: { fontSize: 13, fontWeight: '800', color: ACCENT },
  categoryEmojiWrap: { alignSelf: 'flex-end' },
  categoryEmoji: { fontSize: 44, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 8 },
  categoryImage: { width: 44, height: 44 }
});
