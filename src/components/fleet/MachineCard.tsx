import React, { useState } from 'react';
import { MapPin, User, Clock, Tractor, Image as ImageIcon, ChevronRight, Gauge, Wrench, QrCode, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Planter, UserProfile } from '../../types';
import { StatusBadge } from '../ui/Badge';
import { MachineQRCode } from './MachineQRCode';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [showQR, setShowQR] = useState(false);
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
          <StatusBadge status={planter.status || planter.operatingStatus} size="sm" />
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

        {/* View QR Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowQR(true);
          }}
          className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 hover:bg-black/70 text-white px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors"
        >
          <QrCode className="w-3 h-3" />
          QR
        </button>
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

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { e.stopPropagation(); setShowQR(false); }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white p-8 rounded-3xl shadow-2xl relative max-w-sm w-full flex flex-col items-center z-10"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); setShowQR(false); }}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-900 mb-6">Machine QR Code</h3>
              <MachineQRCode machineId={planter.id} size={200} />
              <p className="text-sm text-slate-500 mt-6 text-center leading-relaxed">
                Print or show this code to allow operators to quickly update the machine's status.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
