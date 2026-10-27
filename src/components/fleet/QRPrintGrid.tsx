import React, { useState, useEffect, useMemo } from 'react';
import { Planter } from '../../types';
import { Printer, Sliders, CheckSquare, Square, CheckCircle2, X } from 'lucide-react';
import QRCode from 'qrcode';
import { paginateStickers, QR_A4_CSS } from '../../lib/qrPrintLayout';

interface QRPrintGridProps {
  planters: Planter[];
  onClose: () => void;
}

interface QRLabelData {
  machineId: string;
  category: string;
  dataUrl: string;
  targetUrl: string;
}

export const QRPrintGrid: React.FC<QRPrintGridProps> = ({ planters, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'maintenance' | 'idle' | 'operating'>('all');
  const [rangeMode, setRangeMode] = useState<'all' | 'index' | 'id'>('all');
  
  const [startIndex, setStartIndex] = useState<number>(1);
  const [endIndex, setEndIndex] = useState<number>(50);
  
  const [startMachineId, setStartMachineId] = useState<string>('');
  const [endMachineId, setEndMachineId] = useState<string>('');

  const [deselectedMachineIds, setDeselectedMachineIds] = useState<Set<string>>(new Set());

  const [labels, setLabels] = useState<QRLabelData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // List of distinct categories
  const categories = useMemo(() => {
    return Array.from(new Set(planters.map((p) => p.category).filter(Boolean))) as string[];
  }, [planters]);

  // Base list of planters filtered by Category & Status, sorted numerically by ID
  const baseFilteredPlanters = useMemo(() => {
    const filtered = planters.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      return matchCategory && matchStatus;
    });

    return [...filtered].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [planters, selectedCategory, statusFilter]);

  // Reset range defaults when base planters change
  useEffect(() => {
    setStartIndex(1);
    setEndIndex(Math.min(baseFilteredPlanters.length, 50) || 1);
    if (baseFilteredPlanters.length > 0) {
      setStartMachineId(baseFilteredPlanters[0].id);
      setEndMachineId(baseFilteredPlanters[baseFilteredPlanters.length - 1].id);
    } else {
      setStartMachineId('');
      setEndMachineId('');
    }
    setDeselectedMachineIds(new Set());
  }, [baseFilteredPlanters]);

  // Final list of planters based on Range Mode selection
  const rangeFilteredPlanters = useMemo(() => {
    if (baseFilteredPlanters.length === 0) return [];

    let result = [...baseFilteredPlanters];

    if (rangeMode === 'index') {
      const start = Math.max(1, startIndex) - 1;
      const end = Math.min(baseFilteredPlanters.length, Math.max(start + 1, endIndex));
      result = result.slice(start, end);
    } else if (rangeMode === 'id') {
      const startIdxInBase = baseFilteredPlanters.findIndex((p) => p.id === startMachineId);
      const endIdxInBase = baseFilteredPlanters.findIndex((p) => p.id === endMachineId);

      if (startIdxInBase !== -1 && endIdxInBase !== -1) {
        const min = Math.min(startIdxInBase, endIdxInBase);
        const max = Math.max(startIdxInBase, endIdxInBase);
        result = result.slice(min, max + 1);
      }
    }

    // Apply individual checkbox exclusions
    return result.filter((p) => !deselectedMachineIds.has(p.id));
  }, [baseFilteredPlanters, rangeMode, startIndex, endIndex, startMachineId, endMachineId, deselectedMachineIds]);

  // Generate QR codes for the current range filtered planters
  useEffect(() => {
    let isMounted = true;
    setIsGenerating(true);

    const generateBatchQR = async () => {
      const generated: QRLabelData[] = [];
      const origin = window.location.origin;

      // Process in chunks to maintain UI responsiveness while parallelizing
      const CHUNK_SIZE = 25;
      for (let i = 0; i < rangeFilteredPlanters.length; i += CHUNK_SIZE) {
        const chunk = rangeFilteredPlanters.slice(i, i + CHUNK_SIZE);
        const chunkPromises = chunk.map(async (planter) => {
          const targetUrl = `${origin}/scan/${planter.id}`;
          try {
            const dataUrl = await QRCode.toDataURL(targetUrl, {
              width: 200,
              margin: 1,
              color: { dark: '#0f172a', light: '#ffffff' }, // Slate-900
              errorCorrectionLevel: 'H',
            });

            return {
              machineId: planter.id,
              category: planter.category || 'Machine',
              dataUrl,
              targetUrl,
            };
          } catch (err) {
            console.error('Error rendering label QR', err);
            return null;
          }
        });
        
        const results = await Promise.all(chunkPromises);
        for (const res of results) {
          if (res) generated.push(res);
        }
      }

      if (isMounted) {
        setLabels(generated);
        setIsGenerating(false);
      }
    };

    generateBatchQR();

    return () => {
      isMounted = false;
    };
  }, [rangeFilteredPlanters]);

  const toggleSelection = (id: string) => {
    setDeselectedMachineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => setDeselectedMachineIds(new Set());
  const handleDeselectAll = () => {
    const allIds = new Set(baseFilteredPlanters.map((p) => p.id));
    setDeselectedMachineIds(allIds);
  };

  const applyPresetRange = (count: number) => {
    setRangeMode('index');
    setStartIndex(1);
    setEndIndex(Math.min(baseFilteredPlanters.length, count));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Please allow popups for this site to print QR labels.');
      return;
    }

    const categoryLabel = selectedCategory === 'All' ? 'All Machines' : selectedCategory;

    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const pages = paginateStickers<QRLabelData>(labels);
    const labelsHtml = pages.map((page, index) => `<section class="qr-a4-sheet"><header class="qr-a4-header"><div><strong>FarmMech · Machine QR stickers</strong><small>${escape(categoryLabel)}</small></div><span>A4 · 4 × 4</span></header><div class="qr-a4-grid">${Array.from({length:16},(_,slot) => page[slot] ? `<article class="qr-a4-sticker"><strong>FarmMech</strong><img src="${page[slot].dataUrl}" alt="QR ${escape(page[slot].machineId)}"/><span class="qr-a4-id">${escape(page[slot].machineId)}</span><small>Scan to onboard or record usage</small></article>` : '<div class="qr-a4-sticker qr-a4-empty"></div>').join('')}</div><footer class="qr-a4-footer"><span>Stickers ${index*16+1}–${index*16+page.length} of ${labels.length}</span><strong>Page ${index+1} of ${pages.length}</strong></footer></section>`).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8" />
        <title>Machine QR Labels — ${escape(categoryLabel)}</title>
        <style>
          * { box-sizing:border-box; margin:0; padding:0; }
          body { background:#edf0e9; padding:10mm; }
          ${QR_A4_CSS}
          @media print { body { background:white; padding:0; } }
        </style>
      </head>
      <body>
        <div class="qr-a4-pages">${labelsHtml}</div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-[9999] overflow-y-auto">
      {/* Non-print controls */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-[10000]">
        <div>
          <h2 className="text-xl font-bold text-slate-900">QR Generation Center</h2>
          <p className="text-sm text-slate-500">Filter and print QR labels.</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-slate-500" />
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 uppercase">
              <Printer className="w-6 h-6 text-blue-600" />
              Field QR Label Printing Center
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Filter, specify printing ranges, and print production-ready QR codes for machine field labels.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={isGenerating || labels.length === 0}
              className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 text-blue-400" /> Print {labels.length} Label{labels.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>

        {/* FILTER & RANGE SELECTION CONTROL PANEL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Print Range & Filter Settings</h2>
            </div>
            <div className="text-xs font-bold text-slate-500">
              Selected for print: <span className="text-blue-700 font-extrabold">{labels.length}</span> of {baseFilteredPlanters.length} available
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                1. Select Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-slate-300 bg-slate-50 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="All">All Categories ({planters.length} Total)</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c} ({planters.filter((p) => p.category === c).length} items)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                2. Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full border border-slate-300 bg-slate-50 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="operating">Operating Only</option>
                <option value="idle">Idle Only</option>
                <option value="maintenance">Maintenance Only</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                3. Range Selection Mode
              </label>
              <select
                value={rangeMode}
                onChange={(e) => setRangeMode(e.target.value as any)}
                className="w-full border border-slate-300 bg-slate-50 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Print All ({baseFilteredPlanters.length})</option>
                <option value="index">Index Range (e.g., #1 to #25)</option>
                <option value="id">Machine ID Range</option>
              </select>
            </div>
          </div>

          {rangeMode !== 'all' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              {rangeMode === 'index' && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                      Start Index (#)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={baseFilteredPlanters.length}
                      value={startIndex}
                      onChange={(e) => setStartIndex(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                      End Index (#)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={baseFilteredPlanters.length}
                      value={endIndex}
                      onChange={(e) => setEndIndex(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 self-end pt-1">
                    <span className="text-xs font-bold text-slate-500 uppercase mr-1">Presets:</span>
                    {[10, 25, 50].map(num => (
                      <button
                        key={num}
                        onClick={() => applyPresetRange(num)}
                        className="px-2.5 py-1.5 bg-white border border-slate-300 hover:bg-blue-50 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        First {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {rangeMode === 'id' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                      Start ID
                    </label>
                    <select
                      value={startMachineId}
                      onChange={(e) => setStartMachineId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {baseFilteredPlanters.map((p, idx) => (
                        <option key={p.id} value={p.id}>
                          #{idx + 1} — {p.id} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 uppercase mb-1">
                      End ID
                    </label>
                    <select
                      value={endMachineId}
                      onChange={(e) => setEndMachineId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {baseFilteredPlanters.map((p, idx) => (
                        <option key={p.id} value={p.id}>
                          #{idx + 1} — {p.id} ({p.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {isGenerating && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs flex items-center justify-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Rendering {rangeFilteredPlanters.length} QR code labels...</span>
          </div>
        )}

        {!isGenerating && labels.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Print Preview — {labels.length} Label{labels.length !== 1 ? 's' : ''} Selected</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                >
                  <Square className="w-3.5 h-3.5 text-slate-400" /> Deselect All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
              {baseFilteredPlanters.map((p) => {
                const isIncluded = rangeFilteredPlanters.some((rp) => rp.id === p.id);
                const labelItem = labels.find((l) => l.machineId === p.id);

                if (!isIncluded) return null;
                const isChecked = !deselectedMachineIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    onClick={() => toggleSelection(p.id)}
                    className={`relative border-2 rounded-2xl p-3 text-center space-y-2 transition cursor-pointer select-none ${
                      isChecked
                        ? 'bg-white border-slate-900 shadow-md ring-1 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 opacity-40 hover:opacity-75'
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 bg-white rounded" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 bg-white rounded" />
                      )}
                    </div>

                    <div className="border-b border-slate-100 pb-1">
                      <div className="text-[9px] font-black text-slate-800 uppercase tracking-widest truncate pr-4">
                        MACHINE TRACKER PRO
                      </div>
                      <div className="text-[8px] font-bold text-slate-500 flex items-center justify-between mt-0.5">
                        <span>ASSET</span>
                        <span className="text-blue-700 font-mono text-[8px]">{p.category}</span>
                      </div>
                    </div>

                    <div className="p-1 bg-white inline-block">
                      {labelItem?.dataUrl ? (
                        <img src={labelItem.dataUrl} alt={`QR ${p.id}`} className="w-24 h-24 mx-auto" />
                      ) : (
                        <div className="w-24 h-24 bg-slate-100 rounded-lg animate-pulse mx-auto" />
                      )}
                    </div>

                    <div className="bg-slate-900 text-white rounded-xl py-1.5 px-2">
                      <span className="font-mono font-black text-xs tracking-wider block">{p.id}</span>
                      <span className="text-[7px] font-extrabold text-blue-300 tracking-tight block uppercase">
                        SCAN TO UPDATE STATUS
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isGenerating && rangeFilteredPlanters.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-xs">
            No machines match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};
