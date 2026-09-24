import React from 'react';
import { LayoutDashboard, Tractor, ArrowLeftRight, MapPin, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

type TabId = 'dashboard' | 'fleet' | 'reports' | 'map' | 'assignments' | 'settings' | 'hierarchy' | 'messages' | 'updates' | 'analytics';

interface MobileNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  pendingAssignments?: number;
  onMoreClick: () => void;
}

const MOBILE_TABS = [
  { id: 'dashboard' as TabId,   label: 'Home',   icon: LayoutDashboard },
  { id: 'fleet' as TabId,       label: 'Fleet',  icon: Tractor },
  { id: 'assignments' as TabId, label: 'Assign', icon: ArrowLeftRight },
  { id: 'map' as TabId,         label: 'Map',    icon: MapPin },
];

export const MobileNav = ({ activeTab, onTabChange, pendingAssignments = 0, onMoreClick }: MobileNavProps) => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-stretch safe-area-bottom">
    {MOBILE_TABS.map(tab => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      const badge = tab.id === 'assignments' ? pendingAssignments : 0;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors relative',
            isActive ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{tab.label}</span>
          {badge > 0 && (
            <span className="absolute top-2 right-1/4 translate-x-1/2 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
              {badge}
            </span>
          )}
          {isActive && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-emerald-600 rounded-full" />
          )}
        </button>
      );
    })}
    {/* More button */}
    <button
      onClick={onMoreClick}
      className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-slate-400 hover:text-slate-600 transition-colors"
    >
      <MoreHorizontal className="w-5 h-5" />
      <span className="text-[10px] font-semibold">More</span>
    </button>
  </nav>
);
