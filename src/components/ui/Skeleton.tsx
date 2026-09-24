import React from 'react';
import { cn } from '../../lib/utils';

// ── Skeleton Block ────────────────────────────────────────────
export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('skeleton', className)} />
);

// ── Machine Card Skeleton ─────────────────────────────────────
export const MachineCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-5 space-y-4">
    <Skeleton className="h-36 w-full rounded-xl" />
    <div className="space-y-2">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
    <Skeleton className="h-8 w-full rounded-xl" />
  </div>
);

// ── Table Row Skeleton ────────────────────────────────────────
export const TableRowSkeleton = ({ cols = 6 }: { cols?: number }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-4">
        <Skeleton className={cn('h-4', i === 0 ? 'w-24' : i === cols - 1 ? 'w-16' : 'w-full max-w-32')} />
      </td>
    ))}
  </tr>
);

// ── Stat Card Skeleton ────────────────────────────────────────
export const StatCardSkeleton = () => (
  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-3">
    <Skeleton className="h-10 w-10 rounded-xl" />
    <Skeleton className="h-8 w-1/2" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

// ── Dashboard Skeleton ────────────────────────────────────────
export const DashboardSkeleton = () => (
  <div className="space-y-8 page-enter">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6">
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);
