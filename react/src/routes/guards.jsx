import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/ui/Spinner';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={getDefaultRoute(user)} replace />;

  return children;
}

/**
 * Protège les routes par rôle.
 * roles = tableau de rôles autorisés, ex. ['admin'] ou ['admin','manager']
 */
export function RoleRoute({ roles, children, redirectTo = '/unauthorized' }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  const userRoles = (user.roles || []).map((r) => (typeof r === 'string' ? r : r.name));
  const hasRole = roles.some((role) => userRoles.includes(role));

  if (!hasRole) return <Navigate to={redirectTo} replace />;

  return children;
}

/**
 * Redirige vers l'espace approprié selon le rôle de l'utilisateur.
 */
export function RoleRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={getDefaultRoute(user)} replace />;
}

export function getDefaultRoute(user) {
  const roles = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.name));
  if (roles.includes('admin')) return '/admin/dashboard';
  if (roles.includes('manager')) return '/manager/dashboard';
  return '/app/dashboard';
}
