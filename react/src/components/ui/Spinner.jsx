import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

function Spinner({ className, size = 'default' }) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />;
}

function LoadingScreen({ message = 'Chargement...' }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export { Spinner, LoadingScreen };
