import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

export const ProtectedRoute = ({
  children,
  requiredMenu,
  requiredAction = 'View',
  superAdminOnly = false,
}) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const { hasPermission, isSuperAdmin } = usePermission();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // FR-1.4: User must change password on first login and after admin reset
  if (user?.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Strict SuperAdmin route protection
  if (superAdminOnly && !isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check action-level permission
  if (requiredMenu && !isSuperAdmin && !hasPermission(requiredMenu, requiredAction)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
