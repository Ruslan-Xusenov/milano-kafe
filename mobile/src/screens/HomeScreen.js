import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { api } from '../api';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
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

  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Auto-rotate banners with fade effect
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
        <ActivityIndicator size="large" color="#FF4747" />
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
            <LinearGradient colors={['#FF4747', '#FF4747CC']} style={styles.logoBg}>
              <Text style={styles.logoText}>M</Text>
            </LinearGradient>
            <View>
              <Text style={styles.headerGreeting}>{t('greeting', 'Xush kelibsiz 👋')}</Text>
              <Text style={styles.headerTitle}>Milano Kafe</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Banners */}
      {banners.length > 0 && (
        <View style={styles.bannerSection}>
          <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 20 }}>
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
                  colors={['#A79277', '#8B7355']}
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
                  colors={['rgba(247,233,152,0.4)', 'rgba(247,233,152,0.2)']}
                  style={styles.categoryCardInner}
                >
                  <Text style={styles.categoryName}>
                    {i18n.language === 'ru' ? cat.name_ru || cat.name : cat.name}
                  </Text>
                  <View style={styles.categoryEmojiWrap}>
                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF2E1' },
  container: { flex: 1, backgroundColor: '#FFF2E1' },

  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBg: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#FF4747', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, marginRight: 12 },
  logoText: { fontSize: 22, fontWeight: '900', color: '#FFF2E1' },
  headerGreeting: { fontSize: 13, color: '#A79277', fontWeight: '500', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#A79277', letterSpacing: -0.5 },

  bannerSection: { marginBottom: 8 },
  bannerCard: { borderRadius: 28, overflow: 'hidden', shadowColor: '#A79277', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  bannerGradient: { borderRadius: 28, padding: 24, flexDirection: 'row', alignItems: 'center', minHeight: 200 },
  bannerContent: { flex: 1, paddingRight: 10 },
  bannerBadge: { backgroundColor: 'rgba(247,233,152,0.3)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(247,233,152,0.5)' },
  bannerBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFF2E1', letterSpacing: 1.5 },
  bannerTitle: { fontSize: 26, fontWeight: '900', color: '#FFF2E1', marginBottom: 6, letterSpacing: -0.5, lineHeight: 32 },
  bannerSubtitle: { fontSize: 14, color: 'rgba(255,242,225,0.85)', fontWeight: '500', lineHeight: 20, marginBottom: 16 },
  bannerBtn: { backgroundColor: '#FF4747', alignSelf: 'flex-start', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, shadowColor: '#FF4747', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  bannerBtnText: { fontSize: 13, fontWeight: '800', color: '#FFF2E1' },
  bannerEmojiContainer: { width: 100, height: 100, justifyContent: 'center', alignItems: 'center' },
  bannerEmojiGlow: { position: 'absolute', width: 120, height: 120, backgroundColor: 'rgba(247,233,152,0.15)', borderRadius: 60 },
  bannerEmoji: { fontSize: 64 },

  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24, backgroundColor: '#FF4747' },
  dotInactive: { width: 6, backgroundColor: '#A79277', opacity: 0.3 },

  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#A79277', marginBottom: 16, letterSpacing: -0.3 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  categoryCard: { width: '48%', marginBottom: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#F7E998', shadowColor: '#F7E998', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  categoryCardInner: { padding: 20, height: 150, justifyContent: 'space-between' },
  categoryName: { fontSize: 16, fontWeight: '800', color: '#A79277' },
  categoryEmojiWrap: { alignSelf: 'flex-end' },
  categoryEmoji: { fontSize: 48 },
});
