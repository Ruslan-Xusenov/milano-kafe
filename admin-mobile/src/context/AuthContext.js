import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Token tekshirishda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data && response.data.token) {
        // Faqat admin yoki kerakli roldagi xodimlar kirishiga ruxsat
        const role = response.data.user.role ? response.data.user.role.toLowerCase() : '';
        if (['admin', 'superadmin', 'manager'].includes(role)) {
          await AsyncStorage.setItem('token', response.data.token);
          await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
          setUser(response.data.user);
          return { success: true };
        } else {
          return { success: false, message: 'Faqat ma\'murlar kirishi mumkin' };
        }
      }
      return { success: false, message: 'Noto\'g\'ri login yoki parol' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Xatolik yuz berdi' };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
