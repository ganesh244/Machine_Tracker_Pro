import React from 'react';
import { Bell, BellDot, LogOut, ShieldCheck, UserCog, Leaf, X, CheckCircle2, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { AppNotification, UserProfile, UserRole } from '../../types';
import { RoleBadge } from '../ui/Badge';

const ROLE_LABEL: Record<UserRole, string> = {
  admin:                 'Admin',
  farm_mechanization:    'Farm Mech',
  district_manager:      'District Manager',
  area_manager:          'Area Manager',
  community_facilitator: 'Facilitator',
  operator:              'Operator',
};

interface TopBarProps {
  userProfile?: UserProfile | null;
  userDisplayName: string;
  notifications: AppNotification[];
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (n: AppNotification) => void;
  onLogout: () => void;
  onRoleChange?: (role: UserRole) => void;
  isAdmin: boolean;
}

export const TopBar = ({
  userProfile,
  userDisplayName,
  notifications,
  showNotifications,
  onToggleNotifications,
  onMarkAllRead,
  onNotificationClick,
  onLogout,
  onRoleChange,
  isAdmin,
}: TopBarProps) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16 gap-4">
        {/* Mobile Logo */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">Machine Tracker</span>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Role switcher — dev only */}
          {onRoleChange && (
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-1.5 gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Role:</span>
              <select
                value={userProfile?.role || 'admin'}
                onChange={e => onRoleChange(e.target.value as UserRole)}
                className="bg-transparent border-none text-[11px] font-bold text-slate-600 focus:ring-0 cursor-pointer py-0"
              >
                {(['admin','farm_mechanization','district_manager','area_manager','community_facilitator','operator'] as UserRole[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              id="notifications-btn"
              onClick={onToggleNotifications}
              className={cn(
                'relative w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
                showNotifications ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              )}
            >
              {unreadCount > 0 ? <BellDot className="w-5 h-5 text-emerald-600" /> : <Bell className="w-5 h-5" />}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-slate-200/80 overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-slate-600" />
                      <span className="font-semibold text-sm text-slate-800">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button onClick={onMarkAllRead} className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold">
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-400">All caught up!</p>
                      </div>
                    ) : notifications.map(n => {
                      const Icon = n.type === 'success' ? CheckCircle2 : n.type === 'error' ? AlertCircle : n.type === 'warning' ? AlertTriangle : Bell;
                      const iconColor = n.type === 'success' ? 'text-emerald-500' : n.type === 'error' ? 'text-rose-500' : n.type === 'warning' ? 'text-amber-500' : 'text-blue-500';
                      return (
                        <button
                          key={n.id}
                          onClick={() => onNotificationClick(n)}
                          className={cn(
                            'w-full flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors text-left',
                            !n.read && 'bg-emerald-50/40'
                          )}
                        >
                          <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={cn('text-xs font-semibold text-slate-800 truncate', !n.read && 'text-emerald-900')}>{n.title}</p>
                              {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{format(new Date(n.timestamp), 'MMM d, HH:mm')}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User chip */}
          <div className="hidden sm:flex items-center gap-2.5 bg-slate-100 rounded-xl px-3 py-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {(userDisplayName[0] || 'U').toUpperCase()}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-800 leading-tight max-w-28 truncate">{userDisplayName}</p>
              <RoleBadge role={userProfile?.role || 'admin'} />
            </div>
            {isAdmin && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            title="Sign out"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
