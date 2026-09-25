import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Planter } from '../../types';

interface QRPrintGridProps {
  planters: Planter[];
  onClose: () => void;
}

export const QRPrintGrid: React.FC<QRPrintGridProps> = ({ planters, onClose }) => {
  return (
    <div className="fixed inset-0 bg-white z-[9999] overflow-y-auto print:bg-white print:static print:overflow-visible">
      
      {/* Non-print controls */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center print:hidden shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Print QR Codes</h2>
          <p className="text-sm text-slate-500">Use your browser's print function (Ctrl+P or Cmd+P).</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors"
          >
            Print Now
          </button>
        </div>
      </div>

      {/* Grid optimized for printing labels/stickers */}
      <div className="p-8 print:p-0">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 print:grid-cols-4 gap-4 print:gap-2">
          {planters.map((planter) => (
            <div 
              key={planter.id} 
              className="flex flex-col items-center justify-center p-4 print:p-2 border border-slate-200 rounded-xl print:rounded-none break-inside-avoid text-center"
            >
              <QRCodeSVG 
                value={`${window.location.origin}/scan/${planter.id}`} 
                size={120} 
                level="M" 
                includeMargin={true} 
              />
              <p className="mt-2 text-lg font-mono font-bold text-slate-900 leading-tight">
                {planter.id}
              </p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Machine Tracker Pro
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Scan to update status
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
