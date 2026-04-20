// ============================================================
//  App.js — Main router connecting all 6 phases
// ============================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages (one per phase)
import Login      from './pages/Login';
import Layout     from './components/Layout';
import Dashboard  from './pages/Dashboard';
import Orders     from './pages/Orders';
import Customers  from './pages/Customers';
import Inventory  from './pages/Inventory';
import Reports    from './pages/Reports';
import Settings   from './pages/Settings';

// Protected route — redirects to login if not logged in
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#6b7280'}}>Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected — all inside shared Layout (sidebar + header) */}
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index             element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<Dashboard />} />
            <Route path="orders"     element={<Orders />} />
            <Route path="customers"  element={<Customers />} />
            <Route path="inventory"  element={<Inventory />} />
            <Route path="reports"    element={<Reports />} />
            <Route path="settings"   element={<Settings />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
