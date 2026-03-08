import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export function MetricCard({ icon: Icon, label, value, sub, trend, trendValue, color, className }) {
  const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const TrendIcon = trendIcon;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-white p-5 transition-all duration-200 hover:shadow-md hover:border-border/60',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          {trendValue && (
            <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110',
            color || 'bg-primary/10 text-primary'
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {/* Decorative gradient */}
      <div className="absolute -bottom-1 -right-1 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}
