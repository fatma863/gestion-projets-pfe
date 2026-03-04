import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary/20 text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-border text-foreground',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
