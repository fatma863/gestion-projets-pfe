import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

export function PageHeader({ title, description, actions, back, className }) {
  const navigate = useNavigate();

  return (
    <div className={cn('flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-6', className)}>
      <div className="flex items-start gap-3">
        {back && (
          <button onClick={() => navigate(-1)} className="mt-1 rounded-md p-1 hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 mt-3 sm:mt-0">{actions}</div>
      )}
    </div>
  );
}
