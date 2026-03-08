import { useAuth } from '../contexts/AuthContext';

export function usePermission() {
  const { user } = useAuth();

  const roles = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.name));
  const permissions = (user?.permissions || []).map((p) => (typeof p === 'string' ? p : p.name));

  return {
    hasRole: (role) => roles.includes(role),
    hasPermission: (perm) => permissions.includes(perm),
    hasAnyRole: (...r) => r.some((role) => roles.includes(role)),
    isAdmin: roles.includes('admin'),
    isManager: roles.includes('manager'),
    isMember: roles.includes('member'),
    isViewer: roles.includes('viewer'),
    roles,
    permissions,
  };
}
