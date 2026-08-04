import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import MenuManagement from './components/MenuManagement';
import CategoryManagement from './components/CategoryManagement';
import BannersManagement from './components/BannersManagement';
import InventoryManagement from './components/InventoryManagement';
import Reports from './components/Reports';
import Staff from './components/Staff';
import ReviewsManagement from './components/ReviewsManagement';
import SettingsManagement from './components/SettingsManagement';
import ClientHome from './pages/ClientHome';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ClientHome />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin', 'cashier', 'kitchen', 'waiter', 'manager', 'staff']}>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardHome />} />
              <Route path="menu" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <MenuManagement />
                </ProtectedRoute>
              } />
              <Route path="categories" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <CategoryManagement />
                </ProtectedRoute>
              } />
              <Route path="banners" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <BannersManagement />
                </ProtectedRoute>
              } />
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <InventoryManagement />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin', 'cashier']}>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="staff" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <Staff />
                </ProtectedRoute>
              } />
              <Route path="reviews" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <ReviewsManagement />
                </ProtectedRoute>
              } />
              <Route path="settings" element={
                <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                  <SettingsManagement />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
