import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50">Yuklanmoqda...</div>;
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If role is not authorized, redirect to admin home (which they should have access to)
    return <Navigate to="/admin" replace />;
  }

  return children;
};

export default ProtectedRoute;
