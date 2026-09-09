import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const DARK_BG = '#0D0D10';
const ACCENT = '#FF4747';

export default function OnboardingModal({ visible, onClose }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(0);

  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0) + 8;
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 52 : 24) + 12;

  const steps = [
    {
      id: 'menu',
      badge: t('onboarding_step1_badge', '1-QADAM • TAOM TANLASH'),
      title: t('onboarding_step1_title', 'Sevimli taomlaringizni tanlang'),
      image: require('../../assets/onboarding_menu.jpg'),
      color: '#FF9500',
      gradient: ['#FF9500', '#E06B00'],
      glow: 'rgba(255, 149, 0, 0.35)',
      features: [
        t('onboarding_step1_f1', 'Pitsa, burger, lavash va shirinliklar'),
        t('onboarding_step1_f2', 'Haqiqiy fotosuratlar va batafsil tarkibi'),
        t('onboarding_step1_f3', 'Qulay qidiruv va toifalarga ajratilgan menyu'),
      ],
    },
    {
      id: 'cart',
      badge: t('onboarding_step2_badge', '2-QADAM • SAVATCHA VA MANZIL'),
      title: t('onboarding_step2_title', 'Savatchaga soling va buyurtma bering'),
      image: require('../../assets/onboarding_delivery.jpg'),
      color: '#10B981',
      gradient: ['#10B981', '#059669'],
      glow: 'rgba(16, 185, 129, 0.35)',
      features: [
        t('onboarding_step2_f1', 'Bitta bosishda savatchaga qo\'shish'),
        t('onboarding_step2_f2', 'GPS orqali yetkazish manzilini aniq belgilash'),
        t('onboarding_step2_f3', 'Keshbek tangalari orqali chegirma olish'),
      ],
    },
    {
      id: 'telegram',
      badge: t('onboarding_step3_badge', '3-QADAM • TELEGRAM VA KESHBEK'),
      title: t('onboarding_step3_title', 'Telegram orqali tez va oson kiring'),
      image: require('../../assets/onboarding_telegram.jpg'),
      color: '#229ED9',
      gradient: ['#229ED9', '#0284C7'],
      glow: 'rgba(34, 158, 217, 0.35)',
      features: [
        t('onboarding_step3_f1', 'Parolsiz, Telegram orqali 5 soniyada kirish'),
        t('onboarding_step3_f2', 'Har bir buyurtmangizdan keshbek to\'plash'),
        t('onboarding_step3_f3', 'Buyurtma holatini jonli kuzatib borish'),
      ],
    },
    {
      id: 'ready',
      badge: t('onboarding_step4_badge', 'TAYYOR • XUSH KELIBSIZ'),
      title: t('onboarding_step4_title', 'Milano Foods sizni kutmoqda!'),
      image: require('../../assets/onboarding_ready.jpg'),
      color: '#FF4747',
      gradient: ['#FF4747', '#DC2626'],
      glow: 'rgba(255, 71, 71, 0.4)',
      features: [
        t('onboarding_step4_f1', 'Issiq va yangi tayyorlangan mazali taomlar'),
        t('onboarding_step4_f2', 'Eshigingizgacha tezkor va xavfsiz yetkazish'),
        t('onboarding_step4_f3', 'Hoziroq birinchi buyurtmangizni bering!'),
      ],
    },
  ];

  const stepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinish = () => {
    setCurrentStep(0);
    if (onClose) onClose();
  };

  if (!visible) return null;

  // Calculate image card height depending on device height
  const imageCardHeight = height > 750 ? 200 : 160;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={handleFinish}
    >
      <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
        <StatusBar barStyle="light-content" translucent={true} />

        {/* Cinematic Luxury Background Gradient */}
        <LinearGradient
          colors={['#0B0B0E', '#16161E', '#0E0E14']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
        />

        {/* Ambient colored aura */}
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: stepData.glow,
              top: height * 0.18,
            },
          ]}
        />

        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.appTitleWrap}>
            <Text style={styles.appLogoText}>Milano</Text>
            <Text style={styles.appLogoSub}>Foods</Text>
            <View style={styles.guideBadge}>
              <Text style={styles.guideBadgeText}>QO'LLANMA</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleFinish}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>{t('onboarding_skip', "O'tkazib yuborish")}</Text>
            <X size={15} color="#AAAAAA" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Center Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* Hero 3D Visual Card with glass frame */}
          <View style={[styles.heroCard, { borderColor: `${stepData.color}45` }]}>
            <ExpoImage
              source={stepData.image}
              style={[styles.heroImage, { height: imageCardHeight }]}
              contentFit="cover"
              transition={250}
            />
            {/* Subtle bottom shadow overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(15,15,20,0.7)']}
              style={styles.imageGradientOverlay}
            />
          </View>

          {/* Badge Pill */}
          <View style={[styles.badgePill, { borderColor: `${stepData.color}50` }]}>
            <View style={[styles.badgeDot, { backgroundColor: stepData.color }]} />
            <Text style={[styles.badgeText, { color: stepData.color }]}>
              {stepData.badge}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.titleText}>{stepData.title}</Text>

          {/* Micro-Features List */}
          <View style={styles.featuresContainer}>
            {stepData.features.map((feat, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={[styles.featureIconWrap, { backgroundColor: `${stepData.color}1A` }]}>
                  <CheckCircle2 size={16} color={stepData.color} strokeWidth={2.5} />
                </View>
                <Text style={styles.featureText}>{feat}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Bar: Segmented Progress & Buttons */}
        <View style={styles.bottomBar}>
          {/* Progress Indicators */}
          <View style={styles.progressContainer}>
            {steps.map((s, idx) => {
              const isActive = idx === currentStep;
              return (
                <TouchableOpacity
                  key={s.id}
                  onPress={() => setCurrentStep(idx)}
                  activeOpacity={0.8}
                  style={[
                    styles.progressBar,
                    isActive
                      ? [
                          styles.progressBarActive,
                          {
                            backgroundColor: stepData.color,
                            shadowColor: stepData.color,
                          },
                        ]
                      : styles.progressBarInactive,
                  ]}
                />
              );
            })}
          </View>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {currentStep > 0 ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={handlePrev}
                activeOpacity={0.8}
              >
                <ChevronLeft size={20} color="#CCCCCC" />
                <Text style={styles.backBtnText}>{t('onboarding_back', 'Orqaga')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 85 }} />
            )}

            <TouchableOpacity
              style={styles.primaryBtnWrapper}
              onPress={handleNext}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={stepData.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.primaryBtnGradient,
                  {
                    shadowColor: stepData.color,
                  },
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {isLastStep
                    ? t('onboarding_start', 'Tushunarli, boshlash!')
                    : t('onboarding_next', 'Keyingisi')}
                </Text>
                {isLastStep ? (
                  <Sparkles size={19} color="#FFFFFF" strokeWidth={2.5} />
                ) : (
                  <ChevronRight size={19} color="#FFFFFF" strokeWidth={2.5} />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_BG,
    justifyContent: 'space-between',
  },
  ambientGlow: {
    position: 'absolute',
    alignSelf: 'center',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    opacity: 0.45,
    filter: 'blur(60px)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 10,
    zIndex: 10,
  },
  appTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  appLogoText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appLogoSub: {
    fontSize: 21,
    fontWeight: '900',
    color: ACCENT,
    letterSpacing: -0.5,
  },
  guideBadge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  guideBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#CCCCCC',
    letterSpacing: 0.8,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CCCCCC',
  },
  scrollContent: {
    paddingHorizontal: 22,
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#16161E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
    marginBottom: 20,
  },
  heroImage: {
    width: '100%',
  },
  imageGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  featuresContainer: {
    width: '100%',
    gap: 9,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 12,
  },
  featureIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 13.5,
    color: '#D1D5DB',
    fontWeight: '600',
    lineHeight: 19,
  },
  bottomBar: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 18,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
  },
  progressBarActive: {
    width: 34,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  progressBarInactive: {
    width: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  primaryBtnWrapper: {
    flex: 1,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 7,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
