import React, { useState, useEffect, useRef } from 'react';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, List, ShoppingCart, User, Menu as MenuIcon } from 'lucide-react-native';
import { StyleSheet, View, Text, TextInput, Platform, Animated, Dimensions, StatusBar, Image, Easing, Modal } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

if (Text.defaultProps == null) {
  Text.defaultProps = {};
}
Text.defaultProps.allowFontScaling = false;

if (TextInput.defaultProps == null) {
  TextInput.defaultProps = {};
}
TextInput.defaultProps.allowFontScaling = false;

import HomeScreen from './src/screens/HomeScreen';
import CatalogScreen from './src/screens/CatalogScreen';
import CartScreen from './src/screens/CartScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MoreScreen from './src/screens/MoreScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { CartProvider } from './src/context/CartContext';

const Tab = createBottomTabNavigator();
const { width, height } = Dimensions.get('window');

const DARK_BG = '#1A1A1A';
const DARK_SURFACE = '#252525';
const ACCENT = '#FF4747';
const INACTIVE_COLOR = '#777777';

// ==================== ANIMATED SPLASH SCREEN ====================
function SplashScreen({ onFinish }) {
  const logoScale    = useRef(new Animated.Value(0.82)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;

  const ringScale    = useRef(new Animated.Value(0.6)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;

  const titleOpacity      = useRef(new Animated.Value(0)).current;
  const titleTranslateY   = useRef(new Animated.Value(20)).current;

  // lineWidth uses non-native driver — kept separate from native-driver items
  const lineWidth         = useRef(new Animated.Value(0)).current;

  const subtitleOpacity   = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(10)).current;

  const screenOpacity     = useRef(new Animated.Value(1)).current;
  const screenScale       = useRef(new Animated.Value(1)).current;

  const ringLoop = useRef(null);

  useEffect(() => {
    // 1. Logo elastic pop-in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1, duration: 550,
        easing: Easing.out(Easing.back(1.3)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Glowing ring expands then pulses
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 1, duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0.9, duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        ringLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(ringOpacity, {
              toValue: 0.3, duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(ringOpacity, {
              toValue: 0.9, duration: 900,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        ringLoop.current.start();
      });
    }, 250);

    // 3. Title fades + slides up (native driver only)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1, duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslateY, {
          toValue: 0, duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);

    // 4. Accent line grows (non-native — width property)
    setTimeout(() => {
      Animated.timing(lineWidth, {
        toValue: 1, duration: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 600);

    // 5. Subtitle fades + slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1, duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0, duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 850);

    // 6. Exit: scale-down + fade
    setTimeout(() => {
      // Stop ring loop before exit
      if (ringLoop.current) ringLoop.current.stop();

      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0, duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(screenScale, {
          toValue: 0.96, duration: 550,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(() => { onFinish(); });
    }, 1900);

    return () => {
      if (ringLoop.current) ringLoop.current.stop();
    };
  }, []);

  return (
    <Animated.View style={[splashStyles.container, {
      opacity: screenOpacity,
      transform: [{ scale: screenScale }],
    }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      <LinearGradient
        colors={['#0A0A0A', '#161616', '#1A0A0A']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <View style={splashStyles.content}>

        {/* Logo + ring */}
        <View style={splashStyles.logoContainer}>
          <Animated.View style={[splashStyles.ring, {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          }]} />
          <Animated.View style={{
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          }}>
            <View style={splashStyles.logoShadow}>
              <Image
                source={require('./assets/milano_icon_512.png')}
                style={splashStyles.logoImage}
              />
            </View>
          </Animated.View>
        </View>

        {/* Title — native driver only */}
        <Animated.Text style={[splashStyles.title, {
          opacity: titleOpacity,
          transform: [{ translateY: titleTranslateY }],
        }]}>
          Milano Foods
        </Animated.Text>

        {/* Accent line — non-native driver, in its own Animated.View */}
        <Animated.View style={[splashStyles.accentLine, {
          width: lineWidth.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '38%'],
          }),
        }]} />

        {/* Subtitle — native driver only */}
        <Animated.Text style={[splashStyles.subtitle, {
          opacity: subtitleOpacity,
          transform: [{ translateY: subtitleTranslateY }],
        }]}>
          Mazali taomlar — bir bosishda
        </Animated.Text>

      </View>
    </Animated.View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  ring: {
    position: 'absolute',
    width: 138,
    height: 138,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: ACCENT,
  },

  logoShadow: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 10,
  },
  accentLine: {
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

// ==================== TAB NAVIGATOR ====================
function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: DARK_SURFACE, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' }]} />
        ),
        tabBarIcon: ({ color, focused }) => {
          let IconComponent;
          if (route.name === 'Asosiy') IconComponent = Home;
          else if (route.name === 'Katalog') IconComponent = List;
          else if (route.name === 'Savat') IconComponent = ShoppingCart;
          else if (route.name === 'Profil') IconComponent = User;
          else if (route.name === 'Yana') IconComponent = MenuIcon;
          return (
            <IconComponent color={focused ? ACCENT : INACTIVE_COLOR} size={22} strokeWidth={focused ? 2.5 : 2} />
          );
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 20,
          backgroundColor: DARK_SURFACE,
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.4,
          shadowRadius: 16,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        }
      })}
    >
      <Tab.Screen name="Asosiy" component={HomeScreen} options={{ tabBarLabel: t('menu') || 'Asosiy' }} />
      <Tab.Screen name="Katalog" component={CatalogScreen} options={{ tabBarLabel: t('catalog') || 'Katalog' }} />
      <Tab.Screen name="Savat" component={CartScreen} options={{ tabBarLabel: t('cart') || 'Savat' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarLabel: t('profile') || 'Profil' }} />
      <Tab.Screen name="Yana" component={MoreScreen} options={{ tabBarLabel: t('more') || 'Yana' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </CartProvider>
      <Modal 
        visible={showSplash} 
        transparent={true} 
        animationType="none"
        statusBarTranslucent={true}
      >
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </Modal>
    </SafeAreaProvider>
  );
}
