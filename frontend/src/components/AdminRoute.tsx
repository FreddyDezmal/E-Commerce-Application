import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './LoadingState';

// The ASP.NET Core backend re-checks the Admin role on every request
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
