import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './LoadingState';

/**
 * UX convenience only — hides admin screens from non-admin users.
 * The ASP.NET Core backend re-checks the Admin role on every request;
 * this route guard is not a security boundary (Milestone 3 §14, §42).
 */
export function AdminRoute() {
  const { isAdmin, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingState label="Checking your session…" />;
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
