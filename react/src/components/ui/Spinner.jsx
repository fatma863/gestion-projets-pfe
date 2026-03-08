import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

function Spinner({ className, size = 'default' }) {
  const sizes = {
    sm: 'h-4 w-4',
    default: 'h-5 w-5',
    lg: 'h-8 w-8',
  };

  return <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />;
}

function LoadingScreen({ message = 'Chargement...' }) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-transparent border-t-primary animate-spin" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export { Spinner, LoadingScreen, Skeleton };
