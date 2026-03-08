import { usePermission } from '../hooks/usePermission';

/**
 * Masque son contenu pour les viewers.
 * Usage : <WriteGuard>contenu visible uniquement aux non-viewers</WriteGuard>
 * Optionnel : fallback — contenu affiché pour les viewers à la place.
 */
export function WriteGuard({ children, fallback = null }) {
  const { isViewer } = usePermission();
  if (isViewer) return fallback;
  return children;
}
