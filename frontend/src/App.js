/* eslint-disable */
import './styles/global.css';
import './mobile.css';
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login      from './pages/Login';
import Layout     from './components/Layout';
import MobileScan from './pages/MobileScan';
import Dashboard  from './pages/Dashboard';
import Orders     from './pages/Orders';
import NewOrder   from './pages/NewOrder';
import Customers  from './pages/Customers';
import Inventory  from './pages/Inventory';
import LensPrices from './pages/LensPrices';
import LensPriceCheckerPage from './pages/LensPriceChecker';
import StoreManager from './pages/StoreManager';
import HistoricalRecords from './pages/HistoricalRecords';
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
import WalkInRx        from './pages/WalkInRx';
import ActivityView    from './pages/ActivityView';
const LensCalculator = React.lazy(() => import('./pages/LensCalculator').catch(() => ({ default: () => <div>Calculator loading...</div> })));
import EndOfDay        from './pages/EndOfDay';
import Warranty        from './pages/Warranty';
import BackupRestore   from './pages/BackupRestore';

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

// Permission guard — redirects to dashboard if user lacks permission
function PermGuard({ perm, children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return children; // admin always allowed
  const perms = user?.permissions;
  if (!perms || perms.length === 0) return children; // no restrictions = allowed
  if (perms.includes(perm)) return children;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/scan" element={<MobileScan />}/>
          <Route path="/" element={<Protected><Layout /></Protected>}>
            <Route index                  element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"       element={<Dashboard />} />
            <Route path="orders"          element={<PermGuard perm="orders"><Orders /></PermGuard>} />
            <Route path="orders/new"      element={<PermGuard perm="new_order"><NewOrder /></PermGuard>} />
            <Route path="customers"       element={<PermGuard perm="customers"><Customers /></PermGuard>} />
            <Route path="inventory"       element={<PermGuard perm="inventory"><Inventory /></PermGuard>} />
            <Route path="lens-prices"     element={<PermGuard perm="lens_prices"><LensPrices /></PermGuard>} />
            <Route path="price-check"     element={<LensPriceCheckerPage />} />
            <Route path="store-manager"    element={<PermGuard perm="inventory"><StoreManager /></PermGuard>} />
            <Route path="historical-records" element={<PermGuard perm="historical_records"><HistoricalRecords /></PermGuard>} />
            <Route path="quick-sale"      element={<PermGuard perm="quick_sale"><QuickSale /></PermGuard>} />
            <Route path="settings"        element={<Settings />} />
            <Route path="balance"         element={<PermGuard perm="orders"><BalanceFollowUp /></PermGuard>} />
            <Route path="rx-tracker"      element={<RxTracker />} />
            <Route path="dealers"          element={<DealerPurchases />} />
            <Route path="repairs"          element={<PermGuard perm="repairs"><Repairs /></PermGuard>} />
            <Route path="lab-receivings"   element={<LabReceivings />} />
            <Route path="kalutota"          element={<KalutotaAccount />} />
            <Route path="bulk-import"       element={<BulkImport />} />
            <Route path="report-pdf"       element={<ReportPDF />} />
            <Route path="walkin-rx"        element={<WalkInRx />} />
            <Route path="activity"          element={<ActivityView />} />
            <Route path="calculator"        element={<Suspense fallback={<div>Loading...</div>}><LensCalculator /></Suspense>} />
            <Route path="end-of-day"      element={<EndOfDay />} />
            <Route path="warranty"         element={<PermGuard perm="orders"><Warranty /></PermGuard>} />
            <Route path="backup"           element={<BackupRestore />} />
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