import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { AppNotification, UserProfile, UserRole } from '../../types';

type TabId = 'dashboard' | 'fleet' | 'reports' | 'map' | 'assignments' | 'settings' | 'hierarchy' | 'messages' | 'updates' | 'analytics';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
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
  pendingAssignments: number;
  unreadMessages: number;
  canViewHierarchy: boolean;
  canAccessSettings: boolean;
  canViewReports: boolean;
  onMoreClick: () => void;
}

export const AppShell = ({
  children,
  activeTab,
  onTabChange,
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
  pendingAssignments,
  unreadMessages,
  canViewHierarchy,
  canAccessSettings,
  canViewReports,
  onMoreClick,
}: AppShellProps) => {
  const safeProfile = userProfile || {
    uid: 'current_user',
    email: 'user@example.com',
    role: (isAdmin ? 'admin' : 'operator') as UserRole,
    displayName: userDisplayName,
  };

  return (
    <div className="flex min-h-screen bg-[#f0f4f1]">
      {/* Desktop Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        userDisplayName={userDisplayName}
        userEmail={safeProfile.email}
        pendingAssignments={pendingAssignments}
        unreadMessages={unreadMessages}
        canViewHierarchy={canViewHierarchy}
        canAccessSettings={canAccessSettings}
        canViewReports={canViewReports}
        onLogout={onLogout}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <TopBar
          userProfile={safeProfile}
          userDisplayName={userDisplayName}
          notifications={notifications}
          showNotifications={showNotifications}
          onToggleNotifications={onToggleNotifications}
          onMarkAllRead={onMarkAllRead}
          onNotificationClick={onNotificationClick}
          onLogout={onLogout}
          onRoleChange={onRoleChange}
          isAdmin={isAdmin}
        />

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 py-6 pb-24 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={onTabChange}
        pendingAssignments={pendingAssignments}
        onMoreClick={onMoreClick}
      />
    </div>
  );
};
