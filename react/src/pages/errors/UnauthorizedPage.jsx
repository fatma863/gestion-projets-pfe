import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function UnauthorizedPage() {
  const { user } = useAuth();

  const roles = (user?.roles || []).map((r) => (typeof r === 'string' ? r : r.name));
  let homeLink = '/app/dashboard';
  if (roles.includes('admin')) homeLink = '/admin/dashboard';
  else if (roles.includes('manager')) homeLink = '/manager/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <ShieldX className="mx-auto mb-6 h-16 w-16 text-destructive" />
        <h1 className="mb-2 text-3xl font-bold text-foreground">403 — Accès refusé</h1>
        <p className="mb-6 text-muted-foreground">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <Link to={homeLink}>
          <Button>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à l'accueil
          </Button>
        </Link>
      </div>
    </div>
  );
}
