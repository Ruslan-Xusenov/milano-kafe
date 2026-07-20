import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './components/DashboardHome';
import MenuManagement from './components/MenuManagement';
import CategoryManagement from './components/CategoryManagement';
import BannersManagement from './components/BannersManagement';
import InventoryManagement from './components/InventoryManagement';
import Reports from './components/Reports';
import Staff from './components/Staff';
import ReviewsManagement from './components/ReviewsManagement';
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
          {/* Simple navigation to switch between Client and Admin for demo purposes */}
          <div className="bg-gray-800 text-white text-xs p-1 flex justify-center space-x-4 z-50 relative">
            <Link to="/" className="hover:text-orange-400">Mijoz Oynasi</Link>
            <Link to="/admin" className="hover:text-orange-400">Admin Panel</Link>
          </div>
          
          <Routes>
            <Route path="/" element={<ClientHome />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardHome />} />
              <Route path="menu" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <MenuManagement />
                </ProtectedRoute>
              } />
              <Route path="categories" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <CategoryManagement />
                </ProtectedRoute>
              } />
              <Route path="banners" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <BannersManagement />
                </ProtectedRoute>
              } />
              <Route path="inventory" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <InventoryManagement />
                </ProtectedRoute>
              } />
              <Route path="reports" element={
                <ProtectedRoute allowedRoles={['Admin', 'Kassir']}>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="staff" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <Staff />
                </ProtectedRoute>
              } />
              <Route path="reviews" element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <ReviewsManagement />
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
