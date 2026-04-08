import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminOwners from './pages/admin/Owners';
import AdminCredits from './pages/admin/Credits';
import AdminSettings from './pages/admin/Settings';
import OwnerDashboard from './pages/owner/Dashboard';
import OwnerProducts from './pages/owner/Products';
import OwnerGenerate from './pages/owner/Generate';
import OwnerCustomerTryOn from './pages/owner/CustomerTryOn';
import OwnerCredits from './pages/owner/Credits';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cv-bg">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-purple-400 font-display text-sm tracking-widest">LOADING</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/owner'} replace />;
  return children;
};

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/owner'} /> : <LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/owners" element={<ProtectedRoute role="admin"><AdminOwners /></ProtectedRoute>} />
      <Route path="/admin/credits" element={<ProtectedRoute role="admin"><AdminCredits /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
      <Route path="/owner" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
      <Route path="/owner/products" element={<ProtectedRoute role="owner"><OwnerProducts /></ProtectedRoute>} />
      <Route path="/owner/generate/:id" element={<ProtectedRoute role="owner"><OwnerGenerate /></ProtectedRoute>} />
      <Route path="/owner/customer-tryon" element={<ProtectedRoute role="owner"><OwnerCustomerTryOn /></ProtectedRoute>} />
      <Route path="/owner/credits" element={<ProtectedRoute role="owner"><OwnerCredits /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
