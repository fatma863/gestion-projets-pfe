import { cn } from '../../lib/utils';

export function ProgressBar({ value = 0, max = 100, size = 'md', color, label, showValue, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const sizes = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' };

  const barColor = color
    ? color
    : pct >= 80
      ? 'bg-emerald-500'
      : pct >= 50
        ? 'bg-primary'
        : pct >= 25
          ? 'bg-amber-500'
          : 'bg-red-500';

  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
          {showValue && <span className="text-xs font-semibold text-foreground">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-muted/50', sizes[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
