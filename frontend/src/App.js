// ============================================================
//  App.js — Updated with Grinding + Reports routes
// ============================================================
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import Layout     from './components/Layout';
import Dashboard  from './pages/Dashboard';
import Orders     from './pages/Orders';
import NewOrder   from './pages/NewOrder';
import Customers  from './pages/Customers';
import Inventory  from './pages/Inventory';
import LensPrices from './pages/LensPrices';
import QuickSale  from './pages/QuickSale';
import Grinding   from './pages/Grinding';
import Reports    from './pages/Reports';
import Settings   from './pages/Settings';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'DM Sans',sans-serif", color:'#6b7280', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div><div>Loading Kuruwita Optical...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index                  element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"       element={<Dashboard />} />
            <Route path="orders"          element={<Orders />} />
            <Route path="orders/new"      element={<NewOrder />} />
            <Route path="customers"       element={<Customers />} />
            <Route path="inventory"       element={<Inventory />} />
            <Route path="lens-prices"     element={<LensPrices />} />
            <Route path="quick-sale"      element={<QuickSale />} />
            <Route path="grinding"        element={<Grinding />} />
            <Route path="reports"         element={<Reports />} />
            <Route path="settings"        element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
