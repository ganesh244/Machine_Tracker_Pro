import React, { useState } from 'react';
import { collection, writeBatch, doc } from '../../lib/data';
import { db } from '../../firebase';
import { QrCode, ShieldCheck, CheckCircle2, Sparkles, X, Printer, MapPin, Building2, Calendar, Tractor } from 'lucide-react';
import { Planter } from '../../types';

interface GenerateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchGenerated: (newMachines: Planter[], batchNo: string) => void;
}

const INDIAN_STATES = [
  { code: 'TS', name: 'Telangana (TS)' },
  { code: 'AP', name: 'Andhra Pradesh (AP)' },
  { code: 'KA', name: 'Karnataka (KA)' },
  { code: 'MH', name: 'Maharashtra (MH)' }
];

const DISTRICTS = {
  TS: [{ code: 'KRM', name: 'Karimnagar' }, { code: 'NZB', name: 'Nizamabad' }, { code: 'HYD', name: 'Hyderabad' }],
  AP: [{ code: 'GNT', name: 'Guntur' }, { code: 'VSP', name: 'Visakhapatnam' }],
  KA: [{ code: 'RAI', name: 'Raichur' }, { code: 'BLR', name: 'Bengaluru' }]
};

export const GenerateBatchModal: React.FC<GenerateBatchModalProps> = ({ isOpen, onClose, onBatchGenerated }) => {
  const [stateCode, setStateCode] = useState('TS');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [districtCode, setDistrictCode] = useState('KRM');
  const [machineType, setMachineType] = useState('Planter');
  const [count, setCount] = useState(10);
  const [startSequence, setStartSequence] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ batchNo: string, machines: Planter[] } | null>(null);

  if (!isOpen) return null;

  const batchNo = `BATCH-${stateCode}-${year}-${districtCode}`;
  
  const generateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    
    try {
      const batch = writeBatch(db);
      const newMachines: Planter[] = [];
      const timestamp = new Date().toISOString();
      
      for (let i = 0; i < count; i++) {
        const seq = ('0000' + (startSequence + i)).slice(-4);
        const prefix = machineType === 'Planter' ? 'PLN' : machineType === 'Harvester' ? 'HRV' : 'DRN';
        const id = `${prefix}-${stateCode}-${year}-${districtCode}-${seq}`;
        
        const machineData: Partial<Planter> = {
          id,
          machineType,
          status: 'registered_unused',
          state: stateCode,
          district: districtCode,
          registrationDate: timestamp,
          lastUpdated: timestamp,
          cfJf: 'Batch Generator', // or current user
        };
        
        const docRef = doc(collection(db, 'planters'), id);
        batch.set(docRef, machineData);
        newMachines.push(machineData as Planter);
      }
      
      await batch.commit();
      setResult({ batchNo, machines: newMachines });
      onBatchGenerated(newMachines, batchNo);
    } catch (err) {
      console.error(err);
      alert('Error generating batch');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-inner border border-emerald-500">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">Generate QR Batch</h2>
              <p className="text-emerald-100 text-xs">Create multiple machines with sequential IDs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {result ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-50">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">Successfully Generated {result.machines.length} Machines!</h3>
              <p className="text-sm text-slate-500 mt-2">Batch Tag: <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">{result.batchNo}</span></p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
              <div className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Sample IDs Created
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {result.machines.slice(0, 4).map(m => (
                  <div key={m.id} className="bg-white p-2 rounded border border-slate-200 text-slate-700 font-bold">
                    {m.id}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={generateBatch} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> State</label>
                <select value={stateCode} onChange={e => { setStateCode(e.target.value); setDistrictCode((DISTRICTS as any)[e.target.value]?.[0]?.code || 'OTH'); }} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Year</label>
                <select value={year} onChange={e => setYear(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/> District</label>
                <select value={districtCode} onChange={e => setDistrictCode(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  {((DISTRICTS as any)[stateCode] || []).map((d: any) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><Tractor className="w-3.5 h-3.5"/> Machine Type</label>
                <select value={machineType} onChange={e => setMachineType(e.target.value)} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="Planter">Planter</option>
                  <option value="Harvester">Harvester</option>
                  <option value="Drone">Drone</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Quantity to Generate</label>
                <input type="number" min="1" max="100" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Start Sequence (e.g. 1)</label>
                <input type="number" min="1" value={startSequence} onChange={e => setStartSequence(parseInt(e.target.value) || 1)} className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
            </div>

            <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl p-4 flex flex-col items-center justify-center text-center mt-2">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest mb-2">Format Preview</span>
              <div className="font-mono font-bold text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                {machineType === 'Planter' ? 'PLN' : machineType === 'Harvester' ? 'HRV' : 'DRN'}-{stateCode}-{year}-{districtCode}-{('0000' + startSequence).slice(-4)}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800">Cancel</button>
              <button type="submit" disabled={generating} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                {generating ? 'Generating...' : `Generate ${count} QRs`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
