import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/auth-context';
import type { Role } from '../types';

export function ProtectedRoute({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading)
    return (
      <div className="page-state" role="status">
        Restaurando sessão…
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
