import React, { useMemo } from 'react';
import { Bell, AlertCircle, Clock, Wrench, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Planter, PreventiveMaintenanceSchedule, MaintenanceRequest, AppNotification } from '../../types';
import { cn } from '../../lib/utils';
import { differenceInDays } from 'date-fns';

interface AlertsPanelProps {
  planters: Planter[];
  maintenanceSchedules: PreventiveMaintenanceSchedule[];
  maintenanceRequests: MaintenanceRequest[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  planters,
  maintenanceSchedules,
  maintenanceRequests
}) => {
  const dynamicAlerts = useMemo(() => {
    const alerts: AppNotification[] = [];

    // 1. Idle Machine Alerts (>7 days idle)
    planters.forEach(p => {
      if (p.operatingStatus === 'idle' && p.lastUpdated) {
        const daysIdle = differenceInDays(new Date(), new Date(p.lastUpdated));
        if (daysIdle > 7) {
          alerts.push({
            id: `idle-${p.id}`,
            title: 'Machine Idle',
            message: `${p.id} has been idle for ${daysIdle} days.`,
            type: 'warning',
            read: false,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // 2. Overdue Maintenance Alerts
    maintenanceSchedules.forEach(schedule => {
      if (schedule.status === 'overdue') {
        alerts.push({
          id: `overdue-${schedule.id}`,
          title: 'Maintenance Overdue',
          message: `${schedule.taskName} is overdue for machine ${schedule.planterId}.`,
          type: 'error',
          read: false,
          timestamp: schedule.nextDueDate || new Date().toISOString()
        });
      }
    });

    // 3. Pending Approval Notifications (for managers/admins)
    const pendingRequests = maintenanceRequests.filter(r => r.status.startsWith('pending'));
    pendingRequests.forEach(req => {
      alerts.push({
        id: `pending-${req.id}`,
        title: 'Approval Required',
        message: `Maintenance request for ${req.planterId} requires approval.`,
        type: 'info',
        read: false,
        timestamp: req.timestamp
      });
    });

    // Sort by type (error > warning > info) then timestamp
    const typeWeight = { error: 3, warning: 2, info: 1, success: 0 };
    return alerts.sort((a, b) => {
      if (typeWeight[a.type] !== typeWeight[b.type]) {
        return typeWeight[b.type] - typeWeight[a.type];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [planters, maintenanceSchedules, maintenanceRequests]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <ShieldAlert className="w-4 h-4" />;
      case 'warning': return <Clock className="w-4 h-4" />;
      case 'info': return <Wrench className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'error': return 'bg-rose-100 text-rose-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      case 'info': return 'bg-blue-100 text-blue-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
      <h3 className="text-sm font-bold text-[#5A5A40]/40 uppercase tracking-widest mb-6 flex items-center justify-between">
        <span>System Alerts</span>
        {dynamicAlerts.length > 0 && (
          <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">
            {dynamicAlerts.length}
          </span>
        )}
      </h3>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {dynamicAlerts.map(alert => (
          <div key={alert.id} className="flex gap-3 items-start p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-200">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", getColorClass(alert.type))}>
              {getIcon(alert.type)}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">{alert.title}</p>
              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{alert.message}</p>
            </div>
          </div>
        ))}
        {dynamicAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400">
            <CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs italic">No active alerts</p>
          </div>
        )}
      </div>
    </div>
  );
};
