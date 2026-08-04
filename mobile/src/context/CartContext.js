import React, { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
        projectId: 'b0e0db14-23bd-47a3-baf0-64d7c0f135b9',
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

  // Debounced AsyncStorage writes to avoid blocking JS thread
  const userSaveTimer = useRef(null);
  const addressSaveTimer = useRef(null);

  useEffect(() => {
    const loadStorage = async () => {
      try {
        const [storedUser, storedAddress] = await Promise.all([
          AsyncStorage.getItem('kafe_user'),
          AsyncStorage.getItem('kafe_address')
        ]);
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

  // Debounced user save — waits 300ms before writing to AsyncStorage
  useEffect(() => {
    if (isReady) {
      if (userSaveTimer.current) clearTimeout(userSaveTimer.current);
      userSaveTimer.current = setTimeout(() => {
        AsyncStorage.setItem('kafe_user', JSON.stringify(user));
      }, 300);
    }
    return () => { if (userSaveTimer.current) clearTimeout(userSaveTimer.current); };
  }, [user, isReady]);

  // Debounced address save
  useEffect(() => {
    if (isReady) {
      if (addressSaveTimer.current) clearTimeout(addressSaveTimer.current);
      addressSaveTimer.current = setTimeout(() => {
        AsyncStorage.setItem('kafe_address', address);
      }, 300);
    }
    return () => { if (addressSaveTimer.current) clearTimeout(addressSaveTimer.current); };
  }, [address, isReady]);

  const addToCart = useCallback((item, quantity = 1) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((id) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, []);

  const getTotal = useCallback(() => cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cartItems]);
  const clearCart = useCallback(() => setCartItems([]), []);

  const login = useCallback((userData, token) => {
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
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(prev => ({
      ...prev,
      ...userData,
      cashback_balance: userData.cashback_balance !== undefined ? userData.cashback_balance : prev.cashback_balance
    }));
  }, []);

  const logout = useCallback(() => {
    setUser({ isLoggedIn: false, id: null, name: '', phone: '', email: '', token: null, role: null, cashback_balance: 0 });
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(() => ({
    cartItems, addToCart, removeFromCart, updateQuantity, getTotal, clearCart,
    user, login, updateUser, logout, address, setAddress
  }), [cartItems, addToCart, removeFromCart, updateQuantity, getTotal, clearCart,
      user, login, updateUser, logout, address]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
};
