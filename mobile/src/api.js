import axios from 'axios';
import { Platform } from 'react-native';

// Always use production URL in the built app
const apiUrl = 'https://milano.securehub.uz/api';

export const API_URL = apiUrl;

export const api = axios.create({
  baseURL: API_URL,
});
