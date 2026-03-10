import { cn } from '../../lib/utils';

const COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

function pickColor(name) {
  if (!name) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function Avatar({ name, src, size = 'md', className, showTooltip = true }) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-7 w-7 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
    xl: 'h-12 w-12 text-lg',
  };

  const tooltipTitle = showTooltip ? name : undefined;

  if (src) {
    return (
      <img
        src={src}
        alt={name || ''}
        title={tooltipTitle}
        className={cn('rounded-full object-cover ring-2 ring-white', sizes[size], className)}
      />
    );
  }

  const initial = (name || '?')[0].toUpperCase();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white',
        sizes[size],
        pickColor(name),
        className
      )}
      title={tooltipTitle}
    >
      {initial}
    </div>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 'sm' }) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={u.id || i} name={u.name || u.user?.name} src={u.avatar || u.user?.avatar} size={size} />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-medium ring-2 ring-white',
            size === 'xs' ? 'h-6 w-6 text-[9px]' : size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-xs'
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
