import { cn } from '../../lib/utils';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({ icon: Icon = Inbox, title, description, action, actionLabel, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted/50 mb-4">
        <Icon className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title || 'Rien ici'}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && actionLabel && (
        <Button onClick={action} size="sm">{actionLabel}</Button>
      )}
    </div>
  );
}
