/* eslint-disable */
// ── DO NOT add any imports above this line ──
// ── Modern React 17+ does not need "import React" for JSX ──
import { Suspense, lazy } from 'react';
import './styles/global.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './context/AuthContext';
import Login           from './pages/Login';
import Layout          from './components/Layout';
import MobileScan      from './pages/MobileScan';
import Dashboard       from './pages/Dashboard';
import Orders          from './pages/Orders';
import NewOrder        from './pages/NewOrder';
import Customers       from './pages/Customers';
import Inventory       from './pages/Inventory';
import LensPrices      from './pages/LensPrices';
import QuickSale       from './pages/QuickSale';
import Grinding        from './pages/Grinding';
import Reports         from './pages/Reports';
import Expenses        from './pages/Expenses';
import Settings        from './pages/Settings';
import BalanceFollowUp from './pages/BalanceFollowUp';
import RxTracker       from './pages/RxTracker';
import DealerPurchases from './pages/DealerPurchases';
import Repairs         from './pages/Repairs';
import LabReceivings   from './pages/LabReceivings';
import KalutotaAccount from './pages/KalutotaAccount';
import BulkImport      from './pages/BulkImport';
import ReportPDF       from './pages/ReportPDF';
import WalkInRx        from './pages/WalkInRx';
import ActivityView    from './pages/ActivityView';
import EndOfDay        from './pages/EndOfDay';
import WarrantyClaims  from './pages/WarrantyClaims';

const LensCalculator = lazy(() =>
  import('./pages/LensCalculator').catch(() => ({ default: () => <div>Loading…</div> }))
);

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', fontFamily:"'Inter',sans-serif",
      background:'var(--bg-base,#f6f4f0)', color:'var(--text-muted,#9ca3af)',
      flexDirection:'column', gap:14,
    }}>
      <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#C9A84C,#E8C96A)', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0A1628" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>
          <line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/>
        </svg>
      </div>
      <div style={{ fontSize:13, fontWeight:500 }}>Loading…</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/scan"  element={<MobileScan />} />
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
            <Route path="dealers"         element={<DealerPurchases />} />
            <Route path="repairs"         element={<Repairs />} />
            <Route path="warranty"        element={<WarrantyClaims />} />
            <Route path="lab-receivings"  element={<LabReceivings />} />
            <Route path="kalutota"        element={<KalutotaAccount />} />
            <Route path="bulk-import"     element={<BulkImport />} />
            <Route path="report-pdf"      element={<ReportPDF />} />
            <Route path="walkin-rx"       element={<WalkInRx />} />
            <Route path="activity"        element={<ActivityView />} />
            <Route path="end-of-day"      element={<EndOfDay />} />
            <Route path="calculator"      element={<Suspense fallback={<div>Loading…</div>}><LensCalculator /></Suspense>} />
            <Route path="grinding"        element={<AdminOnly><Grinding /></AdminOnly>} />
            <Route path="reports"         element={<AdminOnly><Reports  /></AdminOnly>} />
            <Route path="expenses"        element={<AdminOnly><Expenses /></AdminOnly>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}