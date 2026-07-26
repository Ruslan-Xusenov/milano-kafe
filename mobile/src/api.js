import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Always use production URL in the built app
const apiUrl = 'https://milano.securehub.uz/api';

export const API_URL = apiUrl;

export const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor: automatically attach JWT token from AsyncStorage
api.interceptors.request.use(
  async (config) => {
    try {
      const storedUser = await AsyncStorage.getItem('kafe_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.token) {
          config.headers['Authorization'] = `Bearer ${user.token}`;
        }
      }
    } catch (e) {
      // Silently ignore storage read errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);
