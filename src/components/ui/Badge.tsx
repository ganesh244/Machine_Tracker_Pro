import React from 'react';
import { cn } from '../../lib/utils';

// ── Status Badge ─────────────────────────────────────────────
type OperatingStatus = 'operating' | 'maintenance' | 'idle' | 'registered_unused' | 'in_use';
type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
type UserRoleType = 'admin' | 'district_manager' | 'area_manager' | 'community_facilitator' | 'operator' | 'farm_mechanization';
type RequestStatus = 'pending_area_manager' | 'pending_district_manager' | 'pending_farm_mech' | 'pending_admin' | 'approved' | 'in_progress' | 'completed' | 'rejected' | 'cancelled';

const STATUS_CONFIG: Record<OperatingStatus, { label: string; dot: string; classes: string }> = {
  operating:         { label: 'Operating',   dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100' },
  in_use:            { label: 'In Use',      dot: 'bg-emerald-500', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100' },
  maintenance:       { label: 'Maintenance', dot: 'bg-rose-500',    classes: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-100' },
  idle:              { label: 'Idle',        dot: 'bg-slate-400',   classes: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-100' },
  registered_unused: { label: 'New / Unused',dot: 'bg-sky-400',     classes: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-100' },
};

export const StatusBadge = ({ status, size = 'md' }: { status: OperatingStatus | undefined; size?: 'sm' | 'md' }) => {
  const config = (status && STATUS_CONFIG[status]) ? STATUS_CONFIG[status] : STATUS_CONFIG.idle;
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold tracking-wide',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      config.classes
    )}>
      <span className={cn('rounded-full flex-shrink-0', size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2', config.dot)} />
      {config.label}
    </span>
  );
};

const SEVERITY_CONFIG: Record<SeverityLevel, string> = {
  low:      'bg-green-100 text-green-700 border-green-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export const SeverityBadge = ({ severity }: { severity: SeverityLevel }) => (
  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide', SEVERITY_CONFIG[severity])}>
    {severity}
  </span>
);

const ROLE_CONFIG: Record<UserRoleType, { label: string; classes: string }> = {
  admin:                  { label: 'Admin',          classes: 'bg-violet-100 text-violet-700 border-violet-200' },
  farm_mechanization:     { label: 'Farm Mech',      classes: 'bg-blue-100 text-blue-700 border-blue-200' },
  district_manager:       { label: 'District Mgr',   classes: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  area_manager:           { label: 'Area Mgr',       classes: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  community_facilitator:  { label: 'Facilitator',    classes: 'bg-teal-100 text-teal-700 border-teal-200' },
  operator:               { label: 'Operator',       classes: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export const RoleBadge = ({ role }: { role: UserRoleType }) => {
  const config = ROLE_CONFIG[role] || { label: role, classes: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold', config.classes)}>
      {config.label}
    </span>
  );
};

const REQUEST_STATUS_CONFIG: Record<RequestStatus, { label: string; classes: string }> = {
  pending_area_manager:     { label: 'Waiting: Area Mgr',    classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_district_manager: { label: 'Waiting: Dist Mgr',    classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_farm_mech:        { label: 'Waiting: Farm Mech',   classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending_admin:            { label: 'Waiting: Admin',       classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved:                 { label: 'Approved',             classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  in_progress:              { label: 'In Progress',          classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed:                { label: 'Completed',            classes: 'bg-green-50 text-green-700 border-green-200' },
  rejected:                 { label: 'Rejected',             classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled:                { label: 'Cancelled',            classes: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => {
  const config = REQUEST_STATUS_CONFIG[status] || REQUEST_STATUS_CONFIG.pending_area_manager;
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide', config.classes)}>
      {config.label}
    </span>
  );
};
