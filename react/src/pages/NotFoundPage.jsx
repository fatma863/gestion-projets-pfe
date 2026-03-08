import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-primary sm:text-9xl">404</p>
        <h1 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
          Page introuvable
        </h1>
        <p className="mt-3 text-muted-foreground">
          Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" /> Tableau de bord
            </Button>
          </Link>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour
          </Button>
        </div>
      </div>
    </div>
  );
}
