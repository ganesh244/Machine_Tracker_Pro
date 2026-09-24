import React from 'react';
import {
  LayoutDashboard, Tractor, ArrowLeftRight, MapPin, BarChart3,
  Network, MessageSquare, Settings, ChevronRight, Leaf
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { UserRole } from '../../types';

type TabId = 'dashboard' | 'fleet' | 'reports' | 'map' | 'assignments' | 'settings' | 'hierarchy' | 'messages' | 'updates' | 'analytics';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ElementType;
  badge?: number | boolean;
  requiredPermission?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { id: 'fleet',       label: 'Fleet',       icon: Tractor },
  { id: 'assignments', label: 'Assignments', icon: ArrowLeftRight },
  { id: 'map',         label: 'Map',         icon: MapPin },
  { id: 'reports',     label: 'Reports',     icon: BarChart3 },
  { id: 'hierarchy',   label: 'Hierarchy',   icon: Network },
  { id: 'messages',    label: 'Messages',    icon: MessageSquare },
  { id: 'settings',    label: 'Settings',    icon: Settings },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  userRole?: UserRole;
  pendingAssignments?: number;
  unreadMessages?: number;
  canViewHierarchy?: boolean;
  canAccessSettings?: boolean;
  canViewReports?: boolean;
  userDisplayName?: string;
  userEmail?: string;
  onLogout: () => void;
}

export const Sidebar = ({
  activeTab,
  onTabChange,
  pendingAssignments = 0,
  unreadMessages = 0,
  canViewHierarchy = true,
  canAccessSettings = false,
  canViewReports = false,
  userDisplayName = 'User',
  userEmail = '',
  onLogout,
}: SidebarProps) => {
  const visible = NAV_ITEMS.filter(item => {
    if (item.id === 'hierarchy' && !canViewHierarchy) return false;
    if (item.id === 'settings' && !canAccessSettings) return false;
    if (item.id === 'reports' && !canViewReports) return false;
    return true;
  });

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-[#0f1a12] shrink-0 sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/6">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">Machine Tracker</p>
          <p className="text-white/30 text-[10px] font-medium tracking-wider uppercase">Pro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visible.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const badge = item.id === 'assignments' ? pendingAssignments
                       : item.id === 'messages'    ? unreadMessages
                       : 0;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn('sidebar-link w-full text-left', isActive && 'active')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {badge > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 border-t border-white/6 pt-4">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {(userDisplayName[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs font-semibold truncate">{userDisplayName}</p>
            <p className="text-white/30 text-[10px] truncate">{userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white/80 p-1"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
