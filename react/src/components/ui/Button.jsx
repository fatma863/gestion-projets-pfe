import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

const Button = forwardRef(({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98]',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98]',
    outline: 'border border-border bg-white shadow-sm hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
    secondary: 'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200 active:scale-[0.98]',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline',
    success: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]',
  };

  const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-11 rounded-lg px-6',
    icon: 'h-9 w-9',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium',
        'transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});

Button.displayName = 'Button';
export { Button };
