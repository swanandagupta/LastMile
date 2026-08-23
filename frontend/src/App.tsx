import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { UserRole } from './types';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Customer Pages
import { CustomerDashboardPage } from './pages/customer/CustomerDashboardPage';
import { CreateOrderPage } from './pages/customer/CreateOrderPage';
import { CustomerOrdersPage } from './pages/customer/CustomerOrdersPage';
import { OrderDetailPage } from './pages/customer/OrderDetailPage';

// Agent Pages
import { AgentDashboardPage } from './pages/agent/AgentDashboardPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminZonesPage } from './pages/admin/AdminZonesPage';
import { AdminRateCardsPage } from './pages/admin/AdminRateCardsPage';
import { AdminAgentsPage } from './pages/admin/AdminAgentsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === UserRole.ADMIN) return <Navigate to="/admin/dashboard" replace />;
  if (user.role === UserRole.AGENT) return <Navigate to="/agent/dashboard" replace />;
  return <Navigate to="/customer/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Root redirect */}
            <Route path="/" element={<HomeRedirect />} />

            {/* Customer Routes */}
            <Route element={<ProtectedLayout allowedRoles={[UserRole.CUSTOMER, UserRole.ADMIN]} />}>
              <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
              <Route path="/customer/create-order" element={<CreateOrderPage />} />
              <Route path="/customer/orders" element={<CustomerOrdersPage />} />
              <Route path="/customer/orders/:id" element={<OrderDetailPage />} />
            </Route>

            {/* Agent Routes */}
            <Route element={<ProtectedLayout allowedRoles={[UserRole.AGENT, UserRole.ADMIN]} />}>
              <Route path="/agent/dashboard" element={<AgentDashboardPage />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedLayout allowedRoles={[UserRole.ADMIN]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/zones" element={<AdminZonesPage />} />
              <Route path="/admin/rate-cards" element={<AdminRateCardsPage />} />
              <Route path="/admin/agents" element={<AdminAgentsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
