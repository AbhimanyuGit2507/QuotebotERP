import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Dashboard from './pages/Dashboard';
import UserPermissions from './pages/UserPermissions';
import Quotations from './pages/Quotations';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Analytics from './pages/Analytics';
import RFQInbox from './pages/RFQInbox';
import ClientLedger from './pages/ClientLedger';
import SystemConfig from './pages/SystemConfig';
import Inbox from './pages/Inbox';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import Landing from './pages/Landing';
import AdminConsole from './pages/AdminConsole';
import Invoices from './pages/Invoices';
import EmailTemplates from './pages/EmailTemplates';
import AuditLog from './pages/AuditLog';
import Payments from './pages/Payments';
import Suppliers from './pages/Suppliers';
import PurchaseOrdersPage from './pages/PurchaseOrders';
import InventoryPage from './pages/Inventory';
import Accounting from './pages/Accounting';

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-500">
        Connecting to Quotebot backend...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return children;
};

const LAST_ROUTE_KEY = 'lastRoute';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  React.useEffect(() => {
    if (location.pathname === '/' || location.pathname === '/login') {
      return;
    }

    localStorage.setItem(
      LAST_ROUTE_KEY,
      `${location.pathname}${location.search}${location.hash}`,
    );
  }, [location.hash, location.pathname, location.search]);

  const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
  const initialRoute =
    lastRoute && lastRoute.startsWith('/') && lastRoute !== '/login'
      ? lastRoute
      : '/dashboard';

  useKeyboardShortcuts();
  
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/home" element={<Landing />} />
      <Route path="/landing" element={<Landing />} />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to={initialRoute} replace /> : <Landing />}
      />
      <Route path="/admin" element={<ProtectedRoute><AdminConsole /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inbox/:id?" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
      <Route path="/user-permissions" element={<ProtectedRoute><UserPermissions /></ProtectedRoute>} />
      <Route path="/quotations/:id?" element={<ProtectedRoute><Quotations /></ProtectedRoute>} />
      <Route path="/orders/:id?" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/invoices/:id?" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/products/:id?" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/rfq-inbox/:id?" element={<ProtectedRoute><RFQInbox /></ProtectedRoute>} />
      <Route path="/client-ledger/:id?" element={<ProtectedRoute><ClientLedger /></ProtectedRoute>} />
      <Route path="/system-config" element={<ProtectedRoute><SystemConfig /></ProtectedRoute>} />
      <Route path="/email-templates" element={<ProtectedRoute><EmailTemplates /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/accounting" element={<ProtectedRoute><Accounting /></ProtectedRoute>} />
      <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
      <Route path="/purchase-orders/:id?" element={<ProtectedRoute><PurchaseOrdersPage /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
