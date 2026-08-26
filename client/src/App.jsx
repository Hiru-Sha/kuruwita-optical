import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Layout from "./components/Layout";

import InventoryFrames from "./pages/InventoryFrames";
import InventoryLenses from "./pages/InventoryLenses";
import CreateInvoice from "./pages/CreateInvoice";
import Reports from "./pages/Reports";

import Invoices from "./pages/Invoices";
import InvoiceView from "./pages/InvoiceView";
import Suppliers from "./pages/Suppliers";
import Purchases from "./pages/Purchases";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Customers />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/frames"
            element={
              <ProtectedRoute>
                <Layout>
                  <InventoryFrames />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/lenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <InventoryLenses />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateInvoice />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Layout>
                  <Invoices />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <InvoiceView />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suppliers />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <Layout>
                  <Purchases />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}