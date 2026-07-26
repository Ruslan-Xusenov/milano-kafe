import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('cafebot_user');
    const storedToken = localStorage.getItem('cafebot_token');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('cafebot_user', JSON.stringify(data.user));
        localStorage.setItem('cafebot_token', data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      return { success: false, error: "Server bilan aloqa yo'q" };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('cafebot_user');
    localStorage.removeItem('cafebot_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * apiFetch — barcha API so'rovlari uchun markazlashtirilgan yordamchi.
 * localStorage'dan tokenni o'qib, Authorization headeriga qo'shadi.
 * fetch() bilan bir xil interfeysda ishlaydi.
 */
export function apiFetch(url, options = {}) {
  const storedToken = localStorage.getItem('cafebot_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(storedToken ? { 'Authorization': `Bearer ${storedToken}` } : {}),
  };
  return fetch(url, { ...options, headers });
}