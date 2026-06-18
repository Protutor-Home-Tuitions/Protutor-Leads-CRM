import { cn } from '../../lib/utils';

const VARIANTS = {
  default: 'bg-green-500 text-white hover:bg-green-600',
  secondary: 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200',
  destructive: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100',
  ghost: 'hover:bg-slate-100 text-slate-600',
  outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
};

const SIZES = {
  default: 'h-9 px-4 py-2 text-sm',
  sm: 'h-7 px-3 text-xs',
  lg: 'h-10 px-6 text-sm',
  icon: 'h-8 w-8 p-0',
};

export function Button({ className, variant = 'default', size = 'default', children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
