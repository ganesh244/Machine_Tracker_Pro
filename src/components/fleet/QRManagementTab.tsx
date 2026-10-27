import React from 'react';
import { Planter } from '../../types';
import { Printer, Sparkles, QrCode } from 'lucide-react';

interface QRManagementTabProps {
  planters: Planter[];
  onGenerateBatch: () => void;
  onPrintQRs: () => void;
  hasPermission: boolean;
}

export const QRManagementTab: React.FC<QRManagementTabProps> = ({ planters, onGenerateBatch, onPrintQRs, hasPermission }) => {
  return (
    <div className="space-y-6 page-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-slate-800 tracking-tight">QR Management</h2>
          <p className="text-sm text-slate-500 mt-1">Generate, print, and manage QR codes for machines.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Batch Generation</h3>
          <p className="text-sm text-slate-500 mb-6 line-clamp-2">Automatically generate bulk QR codes for new unassigned machines with sequential IDs.</p>
          <button 
            onClick={onGenerateBatch}
            disabled={!hasPermission}
            className="w-full bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl py-3 font-bold transition-colors disabled:opacity-50"
          >
            Generate Batch
          </button>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <Printer className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Print Labels</h3>
          <p className="text-sm text-slate-500 mb-6 line-clamp-2">Print standardized high-quality labels for machines in inventory or deployed.</p>
          <button 
            onClick={onPrintQRs}
            className="w-full bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl py-3 font-bold transition-colors"
          >
            Print QR Codes
          </button>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <QrCode className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Scan & Register</h3>
          <p className="text-sm text-slate-500 mb-6 line-clamp-2">Mobile-friendly scanner app to instantly register a machine to a farmer on the field.</p>
          <button 
            onClick={() => window.open('/scan/sample', '_blank')}
            className="w-full bg-amber-600/10 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl py-3 font-bold transition-colors"
          >
            Open Scanner App
          </button>
        </div>
      </div>
    </div>
  );
};
