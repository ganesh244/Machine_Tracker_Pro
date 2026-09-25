import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Planter, ReadingUpdate, MaintenanceLog } from '../../types';

interface UtilizationDashboardProps {
  planters: Planter[];
  updates: ReadingUpdate[];
  maintenanceLogs: MaintenanceLog[];
  calcArea: (revs: number) => number;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

export const UtilizationDashboard: React.FC<UtilizationDashboardProps> = ({
  planters,
  updates,
  maintenanceLogs,
  calcArea
}) => {
  // 1. Fleet-wide summary
  const totalFleetAcres = useMemo(() => {
    return planters.reduce((sum, p) => sum + calcArea(p.lastReading), 0);
  }, [planters, calcArea]);

  // 2. Idle vs Active (Current Status)
  const statusData = useMemo(() => {
    const counts: Record<string, number> = { operating: 0, idle: 0, maintenance: 0 };
    planters.forEach(p => {
      counts[p.operatingStatus] = (counts[p.operatingStatus] || 0) + 1;
    });
    return [
      { name: 'Active', value: counts.operating, color: '#10b981' },
      { name: 'Idle', value: counts.idle, color: '#f59e0b' },
      { name: 'Maintenance', value: counts.maintenance, color: '#ef4444' }
    ];
  }, [planters]);

  // 3. Utilization Ranking (Acres per Machine)
  const rankingData = useMemo(() => {
    return planters
      .map(p => ({
        id: p.id,
        acres: parseFloat(calcArea(p.lastReading).toFixed(2)),
        type: p.type || 'Unknown'
      }))
      .sort((a, b) => b.acres - a.acres)
      .slice(0, 10); // Top 10
  }, [planters, calcArea]);

  // 4. Cost-per-Acre Analysis
  const costPerAcreData = useMemo(() => {
    return planters.map(p => {
      const machineAcres = calcArea(p.lastReading);
      const machineCost = maintenanceLogs
        .filter(l => l.planterId === p.id)
        .reduce((sum, l) => sum + (l.cost || 0), 0);
      
      const purchaseCost = p.purchaseCost || 0;
      const totalCost = purchaseCost + machineCost;
      
      const costPerAcre = machineAcres > 0 ? (totalCost / machineAcres) : 0;

      return {
        id: p.id,
        totalCost,
        acres: machineAcres,
        costPerAcre: parseFloat(costPerAcre.toFixed(2))
      };
    }).sort((a, b) => b.costPerAcre - a.costPerAcre).slice(0, 10);
  }, [planters, maintenanceLogs, calcArea]);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-900">Utilization Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Fleet performance and cost analysis metrics</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-800 text-sm font-bold flex items-center gap-2">
          <span>Total Fleet Area:</span>
          <span className="text-lg">{totalFleetAcres.toFixed(1)} acres</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Utilization Ranking */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
            <span>Top Performing Machines (Acres)</span>
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" />
                <YAxis dataKey="id" type="category" width={80} stroke="#64748b" tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="acres" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Acres" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-4">Current Fleet Status</h3>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost-per-Acre Ranking */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h3 className="font-bold text-slate-800 mb-4">Cost-Per-Acre Analysis</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerAcreData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="id" stroke="#64748b" tick={{fontSize: 12}} />
                <YAxis stroke="#64748b" tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  formatter={(value: number, name: string) => [name === 'costPerAcre' ? `$${value}` : value, name === 'costPerAcre' ? 'Cost/Acre' : name]}
                />
                <Bar dataKey="costPerAcre" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost/Acre" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
