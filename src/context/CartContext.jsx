import React, { createContext, useState } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [user, setUser] = useState(() => {
    try {
      const savedToken = localStorage.getItem('cafebot_token');
      const savedUser = localStorage.getItem('cafebot_user');
      if (savedToken && savedUser) {
        return { isLoggedIn: true, ...JSON.parse(savedUser) };
      }
    } catch (e) {}
    return { isLoggedIn: false, phone: '+998', name: '', email: '' };
  });
  const [address, setAddress] = useState(() => {
    const saved = localStorage.getItem('delivery_address');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if less than 30 days old
        if (Date.now() - parsed.timestamp < 2592000000) {
          return parsed.address;
        } else {
          localStorage.removeItem('delivery_address');
        }
      } catch (e) {}
    }
    return '';
  });

  const updateAddress = (newAddress) => {
    setAddress(newAddress);
    localStorage.setItem('delivery_address', JSON.stringify({
      address: newAddress,
      timestamp: Date.now()
    }));
  };

  const login = (userData, token) => {
    localStorage.setItem('cafebot_token', token);
    localStorage.setItem('cafebot_user', JSON.stringify(userData));
    setUser({ isLoggedIn: true, ...userData });
  };

  const logout = () => {
    localStorage.removeItem('cafebot_token');
    localStorage.removeItem('cafebot_user');
    setUser({ isLoggedIn: false, phone: '+998', name: '', email: '' });
  };

  const updateUser = (userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      localStorage.setItem('cafebot_user', JSON.stringify(updated));
      return updated;
    });
  };

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const clearCart = () => setCartItems([]);

  const getTotal = () => cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ 
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotal,
      user, login, updateUser, logout,
      address, updateAddress
    }}>
      {children}
    </CartContext.Provider>
  );
};
