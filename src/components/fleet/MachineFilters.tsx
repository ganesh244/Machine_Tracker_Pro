import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface MachineFiltersProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  filterStatus?: string;
  onStatusChange?: (v: string) => void;
  filterDistrict: string;
  onDistrictChange: (v: string) => void;
  filterMandal: string;
  onMandalChange: (v: string) => void;
  filterFacilitator?: string;
  onFacilitatorChange?: (v: string) => void;
  districts: string[];
  mandals: string[];
  facilitators?: string[];
  resultCount: number;
  totalCount: number;
}

export const MachineFilters = ({
  searchTerm, onSearchChange,
  filterDistrict, onDistrictChange,
  filterMandal, onMandalChange,
  filterFacilitator, onFacilitatorChange,
  districts, mandals, facilitators = [],
  resultCount, totalCount,
}: MachineFiltersProps) => {
  const hasFilters = searchTerm || filterDistrict !== 'All' || filterMandal !== 'All' || (filterFacilitator && filterFacilitator !== 'All');

  const clearAll = () => {
    onSearchChange('');
    onDistrictChange('All');
    onMandalChange('All');
    onFacilitatorChange?.('All');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search machines, holders…"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
          />
        </div>

        {/* District */}
        <select
          value={filterDistrict}
          onChange={e => onDistrictChange(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer min-w-32"
        >
          {districts.map(d => <option key={d} value={d}>{d === 'All' ? 'All Districts' : d}</option>)}
        </select>

        {/* Mandal */}
        <select
          value={filterMandal}
          onChange={e => onMandalChange(e.target.value)}
          className="px-3 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer min-w-32"
        >
          {mandals.map(m => <option key={m} value={m}>{m === 'All' ? 'All Mandals' : m}</option>)}
        </select>

        {/* Facilitator */}
        {facilitators.length > 1 && onFacilitatorChange && (
          <select
            value={filterFacilitator}
            onChange={e => onFacilitatorChange(e.target.value)}
            className="px-3 py-2.5 bg-slate-50 rounded-xl text-sm border border-slate-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all cursor-pointer min-w-36"
          >
            {facilitators.map(f => <option key={f} value={f}>{f === 'All' ? 'All Holders' : f}</option>)}
          </select>
        )}

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-sm font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs text-slate-500">
          Showing <span className="font-semibold text-slate-700">{resultCount}</span> of <span className="font-semibold text-slate-700">{totalCount}</span> machines
        </p>
      </div>
    </div>
  );
};
