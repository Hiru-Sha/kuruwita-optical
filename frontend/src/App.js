/* eslint-disable */
// ============================================================
//  App.js
//  Added:
//    1. <ToastProvider> — overrides window.alert() globally so
//       all existing alert() calls become toasts automatically
//    2. <ErrorBoundary> — wraps every page so one page crash
//       doesn't take down the whole app
// ============================================================
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth }  from './context/AuthContext';
import { ToastProvider }          from './components/Toast';
import ErrorBoundary              from './components/ErrorBoundary';
import Login          from './pages/Login';
import Layout         from './components/Layout';
import MobileScan     from './pages/MobileScan';
import Dashboard      from './pages/Dashboard';
import Orders         from './pages/Orders';
import NewOrder       from './pages/NewOrder';
import Customers      from './pages/Customers';
import Inventory      from './pages/Inventory';
import LensPrices     from './pages/LensPrices';
import QuickSale      from './pages/QuickSale';
import Grinding       from './pages/Grinding';
import Reports        from './pages/Reports';
import Expenses       from './pages/Expenses';
import Settings       from './pages/Settings';
import BalanceFollowUp from './pages/BalanceFollowUp';
import RxTracker      from './pages/RxTracker';
import DealerPurchases from './pages/DealerPurchases';
import Repairs        from './pages/Repairs';
import LabReceivings  from './pages/LabReceivings';
import KalutotaAccount from './pages/KalutotaAccount';
import BulkImport     from './pages/BulkImport';
import ReportPDF      from './pages/ReportPDF';
import WalkInRx       from './pages/WalkInRx';
import ActivityView   from './pages/ActivityView';
import WarrantyClaims from './pages/WarrantyClaims';
import EndOfDay       from './pages/EndOfDay';

const LensCalculator = React.lazy(() =>
  import('./pages/LensCalculator').catch(() => ({
    default: () => <div>Calculator loading...</div>,
  }))
);

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: "'DM Sans',sans-serif",
      color: '#6b7280', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: 32 }}>👁️</div>
      <div>Loading...</div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role === 'admin') return children;
  return <Navigate to="/dashboard" replace />;
}

// Wraps a page in ErrorBoundary so crashes are contained
function Page({ component: Component }) {
  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    // ToastProvider must wrap everything so window.alert override
    // is active for all pages from the first render
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/scan"  element={<MobileScan />} />
            <Route path="/" element={<Protected><Layout /></Protected>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"      element={<Page component={Dashboard} />} />
              <Route path="orders"         element={<Page component={Orders} />} />
              <Route path="orders/new"     element={<Page component={NewOrder} />} />
              <Route path="customers"      element={<Page component={Customers} />} />
              <Route path="inventory"      element={<Page component={Inventory} />} />
              <Route path="lens-prices"    element={<Page component={LensPrices} />} />
              <Route path="quick-sale"     element={<Page component={QuickSale} />} />
              <Route path="settings"       element={<Page component={Settings} />} />
              <Route path="balance"        element={<Page component={BalanceFollowUp} />} />
              <Route path="rx-tracker"     element={<Page component={RxTracker} />} />
              <Route path="dealers"        element={<Page component={DealerPurchases} />} />
              <Route path="repairs"        element={<Page component={Repairs} />} />
              <Route path="lab-receivings" element={<Page component={LabReceivings} />} />
              <Route path="kalutota"       element={<Page component={KalutotaAccount} />} />
              <Route path="bulk-import"    element={<Page component={BulkImport} />} />
              <Route path="report-pdf"     element={<Page component={ReportPDF} />} />
              <Route path="walkin-rx"      element={<Page component={WalkInRx} />} />
              <Route path="activity"       element={<Page component={ActivityView} />} />
              <Route path="warranty"      element={<Page component={WarrantyClaims} />} />
              <Route path="end-of-day"     element={<Page component={EndOfDay} />} />
              <Route path="calculator" element={
                <ErrorBoundary>
                  <Suspense fallback={<div>Loading...</div>}>
                    <LensCalculator />
                  </Suspense>
                </ErrorBoundary>
              } />
              {/* Admin-only routes */}
              <Route path="grinding" element={<AdminOnly><Page component={Grinding} /></AdminOnly>} />
              <Route path="reports"  element={<AdminOnly><Page component={Reports}  /></AdminOnly>} />
              <Route path="expenses" element={<AdminOnly><Page component={Expenses} /></AdminOnly>} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}