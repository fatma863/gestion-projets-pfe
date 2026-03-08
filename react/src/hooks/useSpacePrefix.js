import { useLocation } from 'react-router-dom';

/**
 * Retourne le préfixe de l'espace courant (/admin, /manager, ou /app).
 */
export function useSpacePrefix() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/manager')) return '/manager';
  return '/app';
}
