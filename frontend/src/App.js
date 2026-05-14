/* eslint-disable */
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
import Expenses   from './pages/Expenses';
import Settings        from './pages/Settings';
import BalanceFollowUp from './pages/BalanceFollowUp';
import RxTracker       from './pages/RxTracker';
import DealerPurchases from './pages/DealerPurchases';
import Repairs         from './pages/Repairs';
import LabReceivings   from './pages/LabReceivings';
import KalutotaAccount from './pages/KalutotaAccount';
import BulkImport     from './pages/BulkImport';
import ReportPDF       from './pages/ReportPDF';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:"'DM Sans',sans-serif", color:'#6b7280', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:32 }}>👁️</div><div>Loading...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

// Admin-only route — redirects staff to dashboard
function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return children;
  return <Navigate to="/dashboard" replace />;
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
            <Route path="settings"        element={<Settings />} />
            <Route path="balance"         element={<BalanceFollowUp />} />
            <Route path="rx-tracker"      element={<RxTracker />} />
            <Route path="dealers"          element={<DealerPurchases />} />
            <Route path="repairs"          element={<Repairs />} />
            <Route path="lab-receivings"   element={<LabReceivings />} />
            <Route path="kalutota"          element={<KalutotaAccount />} />
            <Route path="bulk-import"       element={<BulkImport />} />
            <Route path="report-pdf"       element={<ReportPDF />} />
            {/* Admin-only routes */}
            <Route path="grinding"  element={<AdminOnly><Grinding /></AdminOnly>} />
            <Route path="reports"   element={<AdminOnly><Reports  /></AdminOnly>} />
            <Route path="expenses"  element={<AdminOnly><Expenses /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
