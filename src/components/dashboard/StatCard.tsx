import React from 'react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: string; positive: boolean };
  colorClass?: string; // e.g. 'text-emerald-600'
  progress?: number;
  onClick?: () => void;
}

export const StatCard = ({ title, value, icon: Icon, trend, colorClass = 'text-emerald-600', progress, onClick }: StatCardProps) => {
  const bgClass = colorClass
    .replace('text-', 'bg-')
    .replace('-600', '-50')
    .replace('-500', '-50');

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5 relative overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-[0_8px_32px_rgba(0,0,0,0.10)] hover:-translate-y-0.5'
      )}
    >
      {/* Subtle glow blob */}
      <div className={cn('absolute -right-8 -top-8 w-24 h-24 rounded-full opacity-30 blur-2xl', bgClass)} />

      <div className="relative">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', bgClass)}>
          <Icon className={cn('w-5 h-5', colorClass)} />
        </div>
        <p className="text-2xl font-bold text-slate-900 tracking-tight leading-none mb-1 font-mono">
          {value}
        </p>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        {trend && (
          <p className={cn('text-xs font-semibold mt-1.5', trend.positive ? 'text-emerald-600' : 'text-rose-500')}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </p>
        )}
        {progress !== undefined && (
          <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', colorClass.replace('text-', 'bg-'))}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
