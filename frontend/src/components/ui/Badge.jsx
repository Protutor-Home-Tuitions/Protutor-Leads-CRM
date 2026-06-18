import { cn } from '../../lib/utils';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700 border border-slate-200',
  open: 'bg-orange-50 text-orange-600 border border-orange-200',
  closed: 'bg-slate-100 text-slate-500 border border-slate-200',
  active: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border border-purple-200',
  callpill: 'bg-orange-50 text-amber-800 border border-orange-200',
};

export function Badge({ className, variant = 'default', children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
