import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SalesScreen from './pages/SalesScreen';
import ProductList from './pages/ProductList';
import CategoryList from './pages/CategoryList';
import Inventory from './pages/Inventory';
import SalesHistory from './pages/SalesHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import LoginScreen from './pages/LoginScreen';
import ChangePasswordScreen from './pages/ChangePasswordScreen';

// Guard: must be logged in
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Guard: admin only
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== 'admin') return <Navigate to="/sales" replace />;
  return <>{children}</>;
};

// Actual app with auth-aware routing
const AppRouter: React.FC = () => {
  const { currentUser } = useAuth();
  const [changePwdState, setChangePwdState] = useState<{ username: string } | null>(null);

  // Reset change password state when user logs out or session changes
  React.useEffect(() => {
    if (!currentUser) {
      setChangePwdState(null);
    }
  }, [currentUser]);

  if (!currentUser) {
    if (changePwdState) {
      return (
        <ChangePasswordScreen
          username={changePwdState.username}
          oldPassword="admin"
        />
      );
    }
    return (
      <LoginScreen
        onNeedPasswordChange={(username) => setChangePwdState({ username })}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={
            currentUser.role === 'admin' ? <Dashboard /> : <Navigate to="/sales" replace />
          } />
          <Route path="sales" element={<SalesScreen />} />
          <Route path="products" element={<AdminRoute><ProductList /></AdminRoute>} />
          <Route path="categories" element={<AdminRoute><CategoryList /></AdminRoute>} />
          <Route path="inventory" element={<AdminRoute><Inventory /></AdminRoute>} />
          <Route path="history" element={<AdminRoute><SalesHistory /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><Reports /></AdminRoute>} />
          <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="settings" element={<AdminRoute><Settings /></AdminRoute>} />
          <Route path="*" element={<Navigate to={currentUser.role === 'admin' ? '/' : '/sales'} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SettingsProvider>
          <AppRouter />
        </SettingsProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
