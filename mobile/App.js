import React from 'react';
import './src/i18n';
import { useTranslation } from 'react-i18next';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, List, ShoppingCart, User, Menu as MenuIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { StyleSheet, View, Text, TextInput, Platform } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { CartProvider } from './src/context/CartContext';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]} />
        ),
        tabBarIcon: ({ color, focused }) => {
          let IconComponent;
          if (route.name === 'Asosiy') IconComponent = Home;
          else if (route.name === 'Katalog') IconComponent = List;
          else if (route.name === 'Savat') IconComponent = ShoppingCart;
          else if (route.name === 'Profil') IconComponent = User;
          else if (route.name === 'Yana') IconComponent = MenuIcon;
          return (
            <IconComponent color={focused ? '#FF4747' : '#A79277'} size={24} strokeWidth={focused ? 2.5 : 2} />
          );
        },
        tabBarActiveTintColor: '#FF4747', 
        tabBarInactiveTintColor: '#A79277',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 15,
          backgroundColor: '#FFFFFF',
          height: 60 + (insets.bottom > 0 ? insets.bottom : 10),
          borderTopWidth: 1,
          borderTopColor: 'rgba(167,146,119,0.1)',
          shadowColor: '#A79277',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
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
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <CartProvider>
        <NavigationContainer>
          <TabNavigator />
        </NavigationContainer>
      </CartProvider>
    </SafeAreaProvider>
  );
}
