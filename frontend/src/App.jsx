import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuditLogs from './pages/AuditLogs';
import Layout from './components/Layout';

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  if (roles) {
    const userRole = (user.role || user.Role || '').toLowerCase();
    const hasRole = roles.some(r => r.toLowerCase() === userRole);
    if (!hasRole) return <Navigate to="/" replace />;
  }
  
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  const userKey = user?.studentId ?? user?.userId ?? user?.username ?? 'guest';

  const getDefaultRoute = () => {
    if (!user) return '/login';
    const role = (user.role || user.Role || '').toLowerCase();
    if (role === 'student') return '/student';
    if (role === 'staff') return '/staff';
    if (role === 'admin') return '/admin';
    return '/login'; // Safe fallback
  };



  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={getDefaultRoute()} replace /> : <Register />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />
        <Route path="student" element={
          <PrivateRoute roles={['Student']}>
            <StudentDashboard key={user?.studentId || user?.userId} />
          </PrivateRoute>
        } />
        <Route path="staff" element={
          <PrivateRoute roles={['Staff', 'Admin']}>
            <StaffDashboard />
          </PrivateRoute>
        } />
        <Route path="admin" element={
          <PrivateRoute roles={['Admin']}>
            <AdminDashboard />
          </PrivateRoute>
        } />
        <Route path="admin/audit" element={
          <PrivateRoute roles={['Admin']}>
            <AuditLogs />
          </PrivateRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
