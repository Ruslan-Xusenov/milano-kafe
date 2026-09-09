import React, { useContext } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, ListOrdered, Menu, BookOpen, Image as ImageIcon, Box, BarChart2, Users, MessageSquare, Settings } from 'lucide-react-native';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MenuScreen from '../screens/MenuScreen';

// Placeholder screens for new drawer items
import KatalogScreen from '../screens/KatalogScreen';
import BannerlarScreen from '../screens/BannerlarScreen';
import OmborScreen from '../screens/OmborScreen';
import HisobotlarScreen from '../screens/HisobotlarScreen';
import XodimlarScreen from '../screens/XodimlarScreen';
import MijozlarFikriScreen from '../screens/MijozlarFikriScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#1F2937', borderTopColor: '#374151' },
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Dashboard') return <LayoutDashboard color={color} size={size} />;
          if (route.name === 'Orders') return <ListOrdered color={color} size={size} />;
          if (route.name === 'Menu') return <Menu color={color} size={size} />;
          return null;
        },
        tabBarActiveTintColor: '#EF4444',
        tabBarInactiveTintColor: '#9CA3AF',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Asosiy' }} />
      <Tab.Screen name="Orders" component={OrdersScreen} options={{ title: 'Buyurtmalar' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'Menyu' }} />
    </Tab.Navigator>
  );
}

function AdminDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1F2937' },
        headerTintColor: '#F9FAFB',
        drawerStyle: { backgroundColor: '#111827' },
        drawerActiveTintColor: '#EF4444',
        drawerInactiveTintColor: '#F9FAFB',
      }}
    >
      <Drawer.Screen 
        name="MainTabs" 
        component={AdminTabs} 
        options={{ headerShown: false, title: 'Dashboard', drawerIcon: ({ color }) => <LayoutDashboard color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Katalog" 
        component={KatalogScreen} 
        options={{ title: 'Katalog', drawerIcon: ({ color }) => <BookOpen color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Bannerlar" 
        component={BannerlarScreen} 
        options={{ title: 'Bannerlar', drawerIcon: ({ color }) => <ImageIcon color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Ombor" 
        component={OmborScreen} 
        options={{ title: 'Ombor', drawerIcon: ({ color }) => <Box color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Hisobotlar" 
        component={HisobotlarScreen} 
        options={{ title: 'Hisobotlar', drawerIcon: ({ color }) => <BarChart2 color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Xodimlar" 
        component={XodimlarScreen} 
        options={{ title: 'Xodimlar', drawerIcon: ({ color }) => <Users color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="MijozlarFikri" 
        component={MijozlarFikriScreen} 
        options={{ title: 'Mijozlar fikri', drawerIcon: ({ color }) => <MessageSquare color={color} size={24} /> }} 
      />
      <Drawer.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ title: 'Sozlamalar', drawerIcon: ({ color }) => <Settings color={color} size={24} /> }} 
      />
    </Drawer.Navigator>
  );
}

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#111827',
    card: '#1F2937',
    text: '#F9FAFB',
    border: '#374151',
    primary: '#EF4444',
  },
};

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' }}>
        <ActivityIndicator size="large" color="#EF4444" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={CustomDarkTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Admin" component={AdminDrawer} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
