import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface MachineQRCodeProps {
  machineId: string;
  size?: number;
}

export const MachineQRCode: React.FC<MachineQRCodeProps> = ({ machineId, size = 128 }) => {
  const url = `${window.location.origin}/scan/${machineId}`;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-inner">
        <QRCodeSVG value={url} size={size} level="M" includeMargin={true} />
      </div>
      <p className="mt-3 text-sm font-mono font-bold text-slate-800">{machineId}</p>
      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider text-center">Scan to Register or Handover</p>
    </div>
  );
};
