import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'b0e0db14-23bd-47a3-baf0-64d7c0f135b9', // Need this to work in dev without app.json projectId? We'll let Expo figure it out if app.json has it. Actually, better pass empty or remove projectId arg if unknown.
      })).data;
    } catch (e) {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
    console.log("Expo Push Token:", token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState({ isLoggedIn: false, id: null, name: '', phone: '', email: '', token: null, role: null, cashback_balance: 0 });
  const [address, setAddress] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('kafe_user');
        const storedAddress = await AsyncStorage.getItem('kafe_address');
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedAddress) setAddress(storedAddress);
      } catch (err) {
        console.error("Storage load error:", err);
      } finally {
        setIsReady(true);
      }
    };
    loadStorage();
  }, []);

  useEffect(() => {
    if (user.isLoggedIn && user.id) {
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          api.post('/users/push-token', { user_id: user.id, push_token: token })
            .catch(err => console.log('Failed to save push token:', err));
        }
      });
    }
  }, [user.isLoggedIn, user.id]);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem('kafe_user', JSON.stringify(user));
    }
  }, [user, isReady]);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem('kafe_address', address);
    }
  }, [address, isReady]);

  const addToCart = (item, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const getTotal = () => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const clearCart = () => setCartItems([]);

  const login = (userData, token) => {
    setUser({ 
      isLoggedIn: true, 
      id: userData.id, 
      name: userData.name || '',
      phone: userData.phone || '', 
      email: userData.email || '',
      role: userData.role || 'client',
      cashback_balance: userData.cashback_balance || 0,
      token
    });
  };

  const updateUser = (userData) => {
    setUser(prev => ({
      ...prev,
      ...userData,
      cashback_balance: userData.cashback_balance !== undefined ? userData.cashback_balance : prev.cashback_balance
    }));
  };

  const logout = () => {
    setUser({ isLoggedIn: false, id: null, name: '', phone: '', email: '', token: null, role: null, cashback_balance: 0 });
  };

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, getTotal, clearCart,
      user, login, updateUser, logout, address, setAddress
    }}>
      {children}
    </CartContext.Provider>
  );
};
