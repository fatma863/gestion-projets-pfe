import { cn } from '../../lib/utils';

function Badge({ className, variant = 'default', dot = false, ...props }) {
  const variants = {
    default: 'bg-primary/10 text-primary border-primary/20',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    destructive: 'bg-red-50 text-red-700 border-red-200',
    outline: 'bg-transparent text-foreground border-border',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  const dotColors = {
    default: 'bg-primary',
    secondary: 'bg-slate-500',
    destructive: 'bg-red-500',
    outline: 'bg-foreground',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {props.children}
    </div>
  );
}

export { Badge };
