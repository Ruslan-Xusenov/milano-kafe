import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
