import React, { useState } from 'react';
import { MapPin, User, Clock, Tractor, Image as ImageIcon, ChevronRight, Gauge, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Planter, UserProfile } from '../../types';
import { StatusBadge } from '../ui/Badge';

interface MachineCardProps {
  planter: Planter;
  holder?: UserProfile;
  calcArea: (revs: number) => number;
  isSelected?: boolean;
  onSelect?: () => void;
  onTransfer?: () => void;
  onUpdate?: () => void;
  selectable?: boolean;
  isChecked?: boolean;
  onCheck?: (checked: boolean) => void;
}

export const MachineCard = ({
  planter,
  holder,
  calcArea,
  isSelected,
  onSelect,
  onTransfer,
  onUpdate,
  selectable,
  isChecked,
  onCheck,
}: MachineCardProps) => {
  const [imgError, setImgError] = useState(false);
  const photo = !imgError && planter.gallery?.[0];
  const area = calcArea(planter.lastReading);

  return (
    <div
      className={cn(
        'group bg-white rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer',
        isSelected
          ? 'border-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.15),0_8px_24px_rgba(0,0,0,0.10)]'
          : 'border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5',
      )}
      onClick={onSelect}
    >
      {/* Photo / Placeholder */}
      <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={planter.id}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Tractor className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Status badge overlay */}
        <div className="absolute top-3 left-3">
          <StatusBadge status={planter.operatingStatus} size="sm" />
        </div>

        {/* Checkbox */}
        {selectable && (
          <label
            className="absolute top-3 right-3"
            onClick={e => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={e => onCheck?.(e.target.checked)}
              className="w-4 h-4 rounded border-white/50 bg-white/80 text-emerald-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
          </label>
        )}

        {/* Gallery count */}
        {(planter.gallery?.length ?? 0) > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold">
            <ImageIcon className="w-3 h-3" />
            {planter.gallery!.length}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {/* ID + Type */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900 font-mono text-sm leading-tight">{planter.id}</p>
            {planter.type && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{planter.type}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] truncate">{[planter.mandal, planter.district].filter(Boolean).join(', ') || planter.location || '—'}</span>
        </div>

        {/* Holder */}
        <div className="flex items-center gap-1.5 text-slate-500 mb-3">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] truncate">{holder?.displayName || 'Unassigned'}</span>
          {holder && (
            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide shrink-0">
              {holder.role.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Area</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{area.toFixed(1)}<span className="text-[10px] text-slate-400 font-normal ml-0.5">ac</span></p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Reading</p>
            <p className="text-sm font-bold text-slate-800 font-mono">{planter.lastReading.toLocaleString()}</p>
          </div>
          {planter.lastUpdated && (
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3" />
              <span className="text-[10px]">{format(new Date(planter.lastUpdated), 'MMM d')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
