import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  getDocs,
  getDoc,
  arrayUnion,
  deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { motion, AnimatePresence } from 'motion/react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import {
  Tractor,
  ArrowUpAZ,
  ArrowDownZA,
  History,
  MapPin,
  User as UserIcon,
  Camera,
  ChevronRight,
  Search,
  Filter,
  LogOut,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Gauge,
  ShieldCheck,
  UserCog,
  Image as ImageIcon,
  Plus,
  X,
  Settings,
  Wrench,
  Map as MapIcon,
  Crosshair,
  AlertTriangle,
  Bell,
  BellDot,
  TrendingUp,
  Activity,
  FileText,
  Users,
  LayoutDashboard,
  BarChart3,
  Check,
  Clock,
  MessageSquare,
  Network
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;
import { format } from 'date-fns';
import { db, storage } from './firebase';
import { Planter, ReadingUpdate, MaintenanceLog, MaintenanceRequest, AppNotification, calculateArea, UserProfile, UserRole, Assignment, Permission, Message } from './types';
import { cn } from './lib/utils';
import { deleteSheetDocument, getSheetInfo, syncSheetDocument, uploadDriveFile } from './lib/sheetsSync';

const DashboardStat = ({ title, value, color, icon: Icon, progress }: { title: string, value: string | number, color: string, icon: any, progress?: number }) => (
  <div className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 relative overflow-hidden group">
    <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-gradient-to-br from-white/0 to-slate-100 rounded-full blur-2xl opacity-50 group-hover:scale-150 transition-transform duration-700" />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={cn("p-2.5 rounded-2xl border border-current/10 shadow-sm", color.replace(/text-(\w+)-\d+/, 'bg-$1-50'))}>
        <Icon className={cn("w-5 h-5", color)} />
      </div>
    </div>
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 relative z-10">{title}</p>
    <p className="text-3xl font-serif text-slate-800 relative z-10">{value}</p>
    {progress !== undefined && (
      <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden relative z-10">
        <div className={cn("h-full transition-all duration-1000 ease-out", color.replace('text-', 'bg-'))} style={{ width: `${progress}%` }} />
      </div>
    )}
  </div>
);

const QuickAction = ({ title, desc, icon: Icon, onClick, color = "text-emerald-600" }: { title: string, desc?: string, icon: any, onClick: () => void, color?: string }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-6 bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 group text-center gap-3 w-full"
  >
    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-sm", color.replace(/text-(\w+)-\d+/, 'bg-$1-50'))}>
      <Icon className={cn("w-7 h-7", color)} />
    </div>
    <div className="flex flex-col gap-1 mt-1">
      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
      {desc && <span className="text-[10px] text-slate-400 font-medium">{desc}</span>}
    </div>
  </button>
);

const PageBanner = ({
  eyebrow,
  title,
  description,
  icon: Icon,
  badges = [],
  actions
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: any;
  badges?: string[];
  actions?: React.ReactNode;
}) => (
  <div className="relative overflow-hidden rounded-[36px] border border-slate-200/70 bg-white/85 backdrop-blur-2xl p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]" />
    <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-100/70 blur-3xl" />
    <div className="absolute -bottom-16 left-8 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
    <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-700">{eyebrow}</p>
            <h2 className="font-serif text-3xl text-slate-900 sm:text-4xl">{title}</h2>
          </div>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
        {badges.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2.5">
            {badges.map(badge => (
              <span
                key={badge}
                className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-slate-600 shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="relative z-10 flex flex-wrap gap-3">{actions}</div>}
    </div>
  </div>
);

const MachineHierarchyMap = ({ planter, assignments, allUsers }: { planter: Planter, assignments: Assignment[], allUsers: UserProfile[] }) => {
  const machineAssignments = assignments
    .filter(a => a.machineId === planter.id && a.status === 'accepted')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const holderUids = machineAssignments.length > 0 
    ? [machineAssignments[0].fromUserId, ...machineAssignments.map(a => a.toUserId)]
    : [planter.currentHolderId];

  // Remove contiguous duplicates if any
  const uniqueHolders = holderUids.filter((uid, idx, arr) => idx === 0 || uid !== arr[idx - 1]);

  return (
    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
      <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-indigo-500" /> Assignment Hierarchy & Location
      </h3>
      <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
        {uniqueHolders.map((uid, index) => {
          const u = allUsers.find(user => user.uid === uid);
          const isCurrent = index === uniqueHolders.length - 1;
          const roleLabel = u?.role?.replace('_', ' ') || (isCurrent && planter.currentHolderRole ? planter.currentHolderRole.replace('_', ' ') : 'Unknown Role');
          const displayName = u?.displayName || uid;
          
          return (
            <div key={`${uid}-${index}`} className="relative">
              <div className={cn(
                "absolute -left-[33px] w-4 h-4 rounded-full border-2 border-white",
                isCurrent ? "bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]" : "bg-indigo-300"
              )} />
              <div className={cn("p-4 rounded-2xl border", isCurrent ? "bg-indigo-50/50 border-indigo-100" : "bg-[#F5F5F0] border-black/5")}>
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-bold text-slate-800">{displayName}</p>
                  {isCurrent && (
                     <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded">Current Holder</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white border shadow-sm text-slate-600 px-2 py-0.5 rounded text-center">
                    {roleLabel}
                  </span>
                  
                  {(u?.assignedState || u?.assignedDistrict || u?.assignedMandal || u?.assignedArea) && (
                    <span className="text-[10px] text-indigo-700 font-medium flex items-center gap-1">
                      📍 {[u.assignedState, u.assignedDistrict, u.assignedMandal, u.assignedArea].filter(Boolean).join(' • ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const countMachines = (uid: string, users: UserProfile[], planters: Planter[]): number => {
  let count = planters.filter(p => p.currentHolderId === uid).length;
  users.filter(u => u.parentId === uid).forEach(child => {
    count += countMachines(child.uid, users, planters);
  });
  return count;
};

const getDescendantUserIds = (uid: string, users: UserProfile[]): string[] => {
  const directChildren = users.filter(u => u.parentId === uid);
  return directChildren.flatMap(child => [child.uid, ...getDescendantUserIds(child.uid, users)]);
};

const USER_ROLE_LEVEL: Record<UserRole, number> = {
  operator: 1,
  community_facilitator: 2,
  area_manager: 3,
  district_manager: 4,
  farm_mechanization: 5,
  admin: 6
};

const getManageableRoles = (managerRole?: UserRole): UserRole[] => {
  switch (managerRole) {
    case 'admin':
      return ['farm_mechanization', 'district_manager', 'area_manager', 'community_facilitator', 'operator'];
    case 'farm_mechanization':
      return ['district_manager', 'area_manager', 'community_facilitator', 'operator'];
    case 'district_manager':
      return ['area_manager', 'community_facilitator', 'operator'];
    case 'area_manager':
      return ['community_facilitator', 'operator'];
    case 'community_facilitator':
      return ['operator'];
    default:
      return [];
  }
};

const canRoleManageRole = (managerRole: UserRole, targetRole: UserRole) =>
  getManageableRoles(managerRole).includes(targetRole);

const canRoleBeParentOfRole = (managerRole: UserRole, childRole: UserRole) =>
  USER_ROLE_LEVEL[managerRole] > USER_ROLE_LEVEL[childRole];

const getInitialRequestStatus = (holderRole: UserRole): MaintenanceRequest['status'] => {
  if (holderRole === 'district_manager') return 'pending_farm_mech';
  if (holderRole === 'area_manager') return 'pending_district_manager';
  if (holderRole === 'farm_mechanization') return 'pending_admin';
  if (holderRole === 'admin') return 'approved';
  return 'pending_area_manager';
};

const getNextRequestStatus = (status: MaintenanceRequest['status']): MaintenanceRequest['status'] => {
  if (status === 'pending_area_manager') return 'pending_district_manager';
  if (status === 'pending_district_manager') return 'pending_farm_mech';
  if (status === 'pending_farm_mech') return 'pending_admin';
  if (status === 'pending_admin') return 'approved';
  return status;
};

const getNextRequestRole = (status: MaintenanceRequest['status']): UserRole | null => {
  if (status === 'pending_area_manager') return 'district_manager';
  if (status === 'pending_district_manager') return 'farm_mechanization';
  if (status === 'pending_farm_mech') return 'admin';
  return null;
};

const getRequestOwnerRole = (status: MaintenanceRequest['status']): UserRole | null => {
  if (status === 'pending_area_manager') return 'area_manager';
  if (status === 'pending_district_manager') return 'district_manager';
  if (status === 'pending_farm_mech') return 'farm_mechanization';
  if (status === 'pending_admin') return 'admin';
  return null;
};

const getRequestApprovalRoleKey = (status: MaintenanceRequest['status']) => {
  if (status === 'pending_area_manager') return 'areaManager' as const;
  if (status === 'pending_district_manager') return 'districtManager' as const;
  if (status === 'pending_farm_mech') return 'farmMechManager' as const;
  if (status === 'pending_admin') return 'admin' as const;
  return null;
};

const REQUEST_STAGES = [
  { key: 'pending_area_manager', label: 'Area Manager', roleKey: 'areaManager' as const },
  { key: 'pending_district_manager', label: 'District Manager', roleKey: 'districtManager' as const },
  { key: 'pending_farm_mech', label: 'Farm Mech', roleKey: 'farmMechManager' as const },
  { key: 'pending_admin', label: 'Admin', roleKey: 'admin' as const },
  { key: 'approved', label: 'Approved', roleKey: null },
  { key: 'in_progress', label: 'In Progress', roleKey: null },
  { key: 'completed', label: 'Completed', roleKey: null },
] as const;

const REQUEST_STATUS_LABELS: Record<MaintenanceRequest['status'], string> = {
  pending_area_manager: 'Waiting for Area Manager',
  pending_district_manager: 'Waiting for District Manager',
  pending_farm_mech: 'Waiting for Farm Mech',
  pending_admin: 'Waiting for Admin',
  approved: 'Approved',
  in_progress: 'In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

const normalizeMaintenanceRequest = (
  raw: any,
  planters: Planter[],
  allUsers: UserProfile[]
): MaintenanceRequest => {
  const planter = planters.find(p => p.id === raw.planterId);
  const holderUid = raw.currentHolderUid || planter?.currentHolderId || raw.requestedByUid;
  const holderProfile = holderUid ? allUsers.find(user => user.uid === holderUid) : undefined;
  const fallbackRole = planter?.currentHolderRole || holderProfile?.role || 'community_facilitator';
  const normalizedStatus = raw.status === 'open' || !raw.status
    ? getInitialRequestStatus(fallbackRole)
    : raw.status;

  return {
    ...raw,
    currentHolderUid: holderUid,
    currentHolderName: raw.currentHolderName || holderProfile?.displayName || raw.requestedBy || holderUid || 'Unknown',
    status: normalizedStatus,
    approvals: raw.approvals || {}
  } as MaintenanceRequest;
};

const syncFirestoreDocument = async (collectionName: string, documentId: string) => {
  try {
    const snapshot = await getDoc(doc(db, collectionName, documentId));
    if (!snapshot.exists()) return;
    await syncSheetDocument(collectionName, documentId, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    console.warn(`Failed to sync ${collectionName}/${documentId} to Google Sheets:`, error);
  }
};

const syncFirestoreDocumentData = async (collectionName: string, documentId: string, data: Record<string, unknown>) => {
  try {
    await syncSheetDocument(collectionName, documentId, data);
  } catch (error) {
    console.warn(`Failed to sync ${collectionName}/${documentId} to Google Sheets:`, error);
  }
};

const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
  ]);
};

const flattenExportValue = (value: unknown): string | number | boolean | '' => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.stringify(value);
};

const flattenExportRecord = (input: Record<string, unknown>, prefix = ''): Record<string, string | number | boolean | ''> => {
  const output: Record<string, string | number | boolean | ''> = {};

  Object.entries(input).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      Object.assign(output, flattenExportRecord(value as Record<string, unknown>, nextKey));
      return;
    }

    output[nextKey] = flattenExportValue(value);
  });

  return output;
};

const exportRecordsToCsv = (records: Record<string, unknown>[]) => {
  if (records.length === 0) {
    return 'No data available\n';
  }

  const flattened = records.map(record => flattenExportRecord(record));
  const headers = Array.from(new Set(flattened.flatMap(record => Object.keys(record))));
  const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [
    headers.map(header => escapeCsv(header)).join(','),
    ...flattened.map(record => headers.map(header => escapeCsv(record[header] ?? '')).join(','))
  ];

  return rows.join('\n');
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const detectPhotoSource = (imageUrl?: string | null) => {
  if (!imageUrl) return 'No proof photo found';
  if (/drive\.google\.com|googleusercontent\.com|docs\.google\.com/.test(imageUrl)) return 'Google Drive';
  if (/firebasestorage\.googleapis\.com/.test(imageUrl)) return 'Firebase Storage';
  return 'External URL';
};

type ManagedUserFormState = {
  displayName: string;
  email: string;
  role: UserRole;
  assignedState: string;
  assignedDistrict: string;
  assignedMandal: string;
  assignedArea: string;
  parentId: string;
};

const createEmptyUserForm = (role: UserRole = 'operator', parentId = ''): ManagedUserFormState => ({
  displayName: '',
  email: '',
  role,
  assignedState: '',
  assignedDistrict: '',
  assignedMandal: '',
  assignedArea: '',
  parentId
});

const OrgTreeNode = ({
  user,
  allUsers,
  planters,
  onEdit,
  onDelete,
  level,
  canManageUser
}: {
  key?: string | number;
  user: UserProfile;
  allUsers: UserProfile[];
  planters: Planter[];
  onEdit: (u: UserProfile) => void;
  onDelete: (u: UserProfile) => void;
  level: number;
  canManageUser: (u: UserProfile) => boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  const children = allUsers.filter(u => u.parentId === user.uid);
  const machineCount = countMachines(user.uid, allUsers, planters);
  
  return (
    <div className={cn("relative", level > 0 && "ml-8 mt-2")}>
      {level > 0 && (
         <div className="absolute -left-6 top-6 w-4 border-t-2 border-black/10" />
      )}
      {level > 0 && (
         <div className="absolute -left-6 top-0 bottom-0 w-0 border-l-2 border-black/10" />
      )}
      <div className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-colors",
        level === 0 ? "bg-[#F5F5F0] border-black/10" : "bg-white border-black/5 hover:border-black/10"
      )}>
        <div className="flex items-center gap-3">
          {children.length > 0 ? (
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1 hover:bg-black/5 rounded group z-10 transition-colors bg-white shadow-sm border border-black/10">
               <ChevronRight className={cn("w-4 h-4 text-[#5A5A40] transition-transform", isExpanded && "rotate-90")} />
            </button>
          ) : (
            <div className="w-6" /> // spacer
          )}
          <div>
            <p className="text-sm font-bold">{user.displayName}</p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white shadow-sm text-slate-600 px-2 py-0.5 rounded border border-black/5">
                {user.role.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-100">
                {machineCount} Machines
              </span>
              {(user.assignedState || user.assignedDistrict) && (
                 <span className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                   📍 {[user.assignedDistrict, user.assignedMandal, user.assignedArea].filter(Boolean).join(', ')}
                 </span>
              )}
            </div>
            <p className="text-[10px] text-[#5A5A40]/40 mt-1">{user.email}</p>
          </div>
        </div>
        
        {canManageUser(user) && (
          <div className="flex items-center gap-2 z-10">
            <button onClick={() => onEdit(user)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 bg-white shadow-sm">
              Edit
            </button>
            <button onClick={() => onDelete(user)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 bg-white shadow-sm">
              Remove
            </button>
          </div>
        )}
      </div>
      
      {isExpanded && children.length > 0 && (
         <div className="relative">
           {children.map(childUser => (
             <OrgTreeNode key={childUser.uid} user={childUser} allUsers={allUsers} planters={planters} onEdit={onEdit} onDelete={onDelete} level={level + 1} canManageUser={canManageUser} />
           ))}
         </div>
      )}
    </div>
  );
};

const OrganizationTree = ({
  allUsers,
  planters,
  onEdit,
  onDelete,
  canManageUser
}: {
  allUsers: UserProfile[];
  planters: Planter[];
  onEdit: (u: UserProfile) => void;
  onDelete: (u: UserProfile) => void;
  canManageUser: (u: UserProfile) => boolean;
}) => {
  const rootUsers = allUsers.filter(u => !u.parentId || !allUsers.some(parent => parent.uid === u.parentId));
  
  return (
    <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden p-8">
      <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
        <Users className="w-5 h-5 text-[#5A5A40]" /> Organization Roles & Assignments
      </h3>
      <div className="space-y-4">
        {rootUsers.map(user => (
          <OrgTreeNode key={user.uid} user={user} allUsers={allUsers} planters={planters} onEdit={onEdit} onDelete={onDelete} level={0} canManageUser={canManageUser} />
        ))}
        {rootUsers.length === 0 && (
           <p className="text-[#5A5A40]/40 text-sm text-center py-8">No users found in organization.</p>
        )}
      </div>
    </div>
  );
};

const APPROVAL_STAGES = [
  { key: 'pending_area_manager',     label: 'Area Manager',      roleKey: 'areaManager' as const },
  { key: 'pending_district_manager', label: 'District Manager',  roleKey: 'districtManager' as const },
  { key: 'pending_farm_mech',        label: 'Farm Mech',         roleKey: 'farmMechManager' as const },
  { key: 'approved',                 label: 'Final Approval',    roleKey: null },
];

const MaintenanceProgressBar = ({ log }: { log: MaintenanceLog }) => {
  const isRejected = log.approvalStatus === 'rejected';
  const currentStageIndex = isRejected ? -1 : APPROVAL_STAGES.findIndex(s => s.key === log.approvalStatus);
  const completedCount = log.approvalStatus === 'approved' ? 4 : currentStageIndex;

  return (
    <div className="mt-3">
      {isRejected ? (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-xl border border-red-100">
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-600">Request was rejected</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {APPROVAL_STAGES.map((stage, idx) => {
              const isComplete = idx < completedCount || log.approvalStatus === 'approved';
              const isCurrent = !isComplete && idx === currentStageIndex;
              const approvalData = stage.roleKey ? log.approvals?.[stage.roleKey] : null;
              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    {/* Circle indicator */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      isComplete ? "bg-emerald-500 shadow-emerald-200 shadow-md" :
                        isCurrent ? "bg-amber-400 animate-pulse shadow-amber-200 shadow-md" :
                          "bg-slate-200"
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : isCurrent ? (
                        <Clock className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                      )}
                    </div>
                    {/* Label */}
                    <p className={cn(
                      "text-[9px] font-bold mt-1 text-center leading-tight truncate w-full px-0.5",
                      isComplete ? "text-emerald-600" :
                        isCurrent ? "text-amber-600" :
                          "text-slate-400"
                    )}>{stage.label}</p>
                    {approvalData && (
                      <p className="text-[8px] text-emerald-500 text-center truncate w-full px-0.5">{approvalData.by?.split(' ')[0]}</p>
                    )}
                  </div>
                  {/* Connector line */}
                  {idx < APPROVAL_STAGES.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 rounded-full transition-all",
                      idx < completedCount ? "bg-emerald-400" : "bg-slate-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Status text */}
          <p className={cn(
            "text-[10px] font-semibold",
            log.approvalStatus === 'approved' ? "text-emerald-600" : "text-amber-600"
          )}>
            {log.approvalStatus === 'approved' ? '✓ Fully Approved' :
              `Waiting for ${APPROVAL_STAGES.find(s => s.key === log.approvalStatus)?.label} approval`}
          </p>
        </div>
      )}
    </div>
  );
};

const MaintenanceRequestProgressBar = ({ request }: { request: MaintenanceRequest }) => {
  const isStopped = request.status === 'rejected' || request.status === 'cancelled';
  const currentStageIndex = isStopped ? -1 : REQUEST_STAGES.findIndex(stage => stage.key === request.status);
  const completedCount = request.status === 'completed' ? REQUEST_STAGES.length : currentStageIndex;

  return (
    <div className="mt-3">
      {isStopped ? (
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-xl border border-red-100">
          <X className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs font-semibold text-red-600">
            {request.status === 'cancelled' ? 'Request was cancelled' : 'Request was rejected'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            {REQUEST_STAGES.map((stage, idx) => {
              const isComplete = idx < completedCount || request.status === 'completed';
              const isCurrent = !isComplete && idx === currentStageIndex;
              const approvalData = stage.roleKey ? request.approvals?.[stage.roleKey] : null;

              return (
                <div key={stage.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      isComplete ? "bg-emerald-500 shadow-emerald-200 shadow-md" :
                        isCurrent ? "bg-amber-400 animate-pulse shadow-amber-200 shadow-md" :
                          "bg-slate-200"
                    )}>
                      {isComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      ) : isCurrent ? (
                        <Clock className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                      )}
                    </div>
                    <p className={cn(
                      "text-[9px] font-bold mt-1 text-center leading-tight truncate w-full px-0.5",
                      isComplete ? "text-emerald-600" :
                        isCurrent ? "text-amber-600" :
                          "text-slate-400"
                    )}>
                      {stage.label}
                    </p>
                    {approvalData && (
                      <p className="text-[8px] text-emerald-500 text-center truncate w-full px-0.5">
                        {approvalData.by?.split(' ')[0]}
                      </p>
                    )}
                  </div>
                  {idx < REQUEST_STAGES.length - 1 && (
                    <div className={cn(
                      "h-0.5 flex-1 mx-1 rounded-full transition-all",
                      idx < completedCount ? "bg-emerald-400" : "bg-slate-200"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
          <p className={cn(
            "text-[10px] font-semibold",
            request.status === 'completed' ? "text-emerald-600" :
              request.status === 'in_progress' ? "text-blue-600" :
                "text-amber-600"
          )}>
            {REQUEST_STATUS_LABELS[request.status]}
          </p>
        </div>
      )}
    </div>
  );
};

const MaintenanceRequestCard = ({
  request,
  onApprove,
  onReject,
  onStart,
  onComplete,
  onCancel,
  compact = false
}: {
  request: MaintenanceRequest;
  onApprove?: (request: MaintenanceRequest) => void;
  onReject?: (request: MaintenanceRequest) => void;
  onStart?: (request: MaintenanceRequest) => void;
  onComplete?: (request: MaintenanceRequest) => void;
  onCancel?: (request: MaintenanceRequest) => void;
  compact?: boolean;
}) => (
  <div className={cn(
    "rounded-2xl border border-black/5 bg-[#F5F5F0]",
    compact ? "p-4" : "p-5"
  )}>
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-slate-800">{request.planterId}</p>
          <span className={cn(
            "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
            request.requestType === 'repair' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          )}>
            {request.requestType.replace('_', ' ')}
          </span>
          <span className={cn(
            "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
            request.severity === 'critical' ? "bg-red-600 text-white" :
              request.severity === 'high' ? "bg-orange-500 text-white" :
                request.severity === 'medium' ? "bg-yellow-500 text-black" : "bg-green-500 text-white"
          )}>
            {request.severity}
          </span>
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-1">
          Raised by {request.requestedBy} on {format(new Date(request.timestamp), compact ? 'MMM d' : 'MMM d, HH:mm')}
        </p>
      </div>
      <span className={cn(
        "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
        request.status === 'completed' ? "bg-green-100 text-green-700" :
          request.status === 'in_progress' ? "bg-blue-100 text-blue-700" :
            request.status === 'approved' ? "bg-emerald-100 text-emerald-700" :
              request.status === 'rejected' || request.status === 'cancelled' ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
      )}>
        {REQUEST_STATUS_LABELS[request.status]}
      </span>
    </div>

    <p className="text-xs text-slate-600 leading-relaxed mb-2">{request.description}</p>
    <div className="flex flex-wrap gap-3 text-[10px] text-slate-500 mb-3">
      <span>Holder: {request.currentHolderName || 'Unknown'}</span>
      <span>Part: {request.partDamaged || 'General'}</span>
      {request.resolutionSubmittedAt && (
        <span>Repair report added</span>
      )}
    </div>

    <MaintenanceRequestProgressBar request={request} />

    {(onApprove || onReject || onStart || onComplete || onCancel) && (
      <div className="pt-3 mt-3 border-t border-black/5 flex flex-wrap gap-2">
        {onApprove && (
          <button onClick={() => onApprove(request)} className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 transition-colors">
            Approve
          </button>
        )}
        {onReject && (
          <button onClick={() => onReject(request)} className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors">
            Reject
          </button>
        )}
        {onStart && (
          <button onClick={() => onStart(request)} className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors">
            Mark In Progress
          </button>
        )}
        {onComplete && (
          <button onClick={() => onComplete(request)} className="text-[10px] bg-emerald-600 text-white px-3 py-1 rounded-full hover:bg-emerald-700 transition-colors">
            Mark Done
          </button>
        )}
        {onCancel && (
          <button onClick={() => onCancel(request)} className="text-[10px] bg-red-50 text-red-600 px-3 py-1 rounded-full hover:bg-red-100 transition-colors">
            Cancel
          </button>
        )}
      </div>
    )}
  </div>
);

const ApprovalQueue = ({ logs, onApprove, onReject }: { logs: MaintenanceLog[], onApprove: (log: MaintenanceLog) => void, onReject: (log: MaintenanceLog) => void }) => (
  <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
    <h3 className="text-lg font-serif mb-6 flex items-center justify-between text-slate-800">
      <span>Pending Approvals</span>
      <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold border border-amber-100">{logs.length}</span>
    </h3>
    <div className="space-y-5">
      {logs.length === 0 ? (
        <p className="text-sm text-slate-400 italic text-center py-8">No approvals waiting for you.</p>
      ) : (
        logs.map(log => (
          <div key={log.id} className="p-5 bg-amber-50/60 rounded-2xl border border-amber-100 hover:border-amber-200 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{log.planterId}</p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{log.technicianName} • {format(new Date(log.timestamp), 'MMM d')}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onApprove(log)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={() => onReject(log)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-200 transition-colors">
                  <X className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{log.notes}</p>
            <MaintenanceProgressBar log={log} />
          </div>
        ))
      )}
    </div>
  </div>
);

const OperatorMachineCard = ({ planter, onUpdate, onReport, calcArea }: { planter: Planter, onUpdate: () => void, onReport: () => void, calcArea: (revs: number) => number }) => (
  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
    {/* Abstract Background Design */}
    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
    <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20" />
    
    <div className="absolute top-0 right-0 p-8 opacity-5 mix-blend-overlay">
      <Tractor className="w-64 h-64 -mr-16 -mt-16 text-white" />
    </div>
    
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h3 className="text-4xl font-serif mb-2 text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">{planter.id}</h3>
          <p className="text-slate-400 flex items-center gap-2 text-sm font-medium">
            <MapPin className="w-4 h-4 text-emerald-400" /> {planter.location}
          </p>
        </div>
        <span className={cn(
          "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border backdrop-blur-md shadow-sm",
          planter.operatingStatus === 'operating' ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-orange-500/20 text-orange-300 border-orange-500/30"
        )}>
          {planter.operatingStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Last Reading</p>
          <p className="text-2xl font-mono text-slate-100">{planter.lastReading.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Total Area</p>
          <p className="text-2xl font-mono animate-pulse text-emerald-400">{calcArea(planter.lastReading).toFixed(1)} <span className="text-sm text-slate-500">acres</span></p>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onUpdate}
          className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold text-sm hover:bg-emerald-400 hover:shadow-[0_0_20px_rgb(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
        >
          <Gauge className="w-5 h-5" /> Update Reading
        </button>
        <button
          onClick={onReport}
          className="flex-1 bg-slate-800 text-slate-200 py-4 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all border border-slate-600 flex items-center justify-center gap-2"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400" /> Report Issue
        </button>
      </div>
    </div>
  </div>
);

export default function App() {
  // Simple local user (replaces Firebase Auth User)
  interface SimpleUser { uid: string; email: string; displayName: string; }
  const [user, setUser] = useState<SimpleUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [planters, setPlanters] = useState<Planter[]>([]);
  const [selectedPlanter, setSelectedPlanter] = useState<Planter | null>(null);
  const [updates, setUpdates] = useState<ReadingUpdate[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [allMaintenanceRequests, setAllMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [allMaintenanceLogs, setAllMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatMessageText, setChatMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMandal, setFilterMandal] = useState('All');
  const [filterDistrict, setFilterDistrict] = useState('All');
  const [filterFacilitator, setFilterFacilitator] = useState('All');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'fleet' | 'reports' | 'map' | 'dashboard' | 'assignments' | 'settings' | 'hierarchy' | 'messages'>('dashboard');
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [addUserForm, setAddUserForm] = useState<ManagedUserFormState>(createEmptyUserForm());
  const [assignedPage, setAssignedPage] = useState(1);
  const [unassignedPage, setUnassignedPage] = useState(1);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [newMachineData, setNewMachineData] = useState({ id: '', type: 'Planter Pro', state: '', district: '', mandal: '', location: '', lat: '', lng: '' });
  const [addMachineLoading, setAddMachineLoading] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const fetchCurrentGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewMachineData(prev => ({
            ...prev,
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          }));
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert("Could not retrieve current location. Please check browser permissions.");
        }
      );
    }
  };

  const syncAddressFromCoords = async () => {
    const { lat, lng } = newMachineData;
    if (!lat || !lng) {
      return;
    }
    
    setGeocodingLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`);
      const data = await response.json();
      
      if (data && data.address) {
        const addr = data.address;
        setNewMachineData(prev => ({
          ...prev,
          state: addr.state || addr.region || prev.state,
          district: addr.state_district || addr.county || addr.district || prev.district,
          mandal: addr.subdistrict || addr.township || addr.suburb || addr.town || addr.city_district || addr.neighbourhood || prev.mandal,
          location: addr.village || addr.hamlet || addr.neighbourhood || addr.road || addr.suburb || prev.location
        }));
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Auto-fill address when lat/lng are updated (1s debounce)
  useEffect(() => {
    const l1 = parseFloat(newMachineData.lat);
    const l2 = parseFloat(newMachineData.lng);
    if (!isNaN(l1) && !isNaN(l2) && l1 !== 0 && l2 !== 0) {
      const timer = setTimeout(() => {
        syncAddressFromCoords();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newMachineData.lat, newMachineData.lng]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Machine calculation config (editable by admin)
  const [machineConfig, setMachineConfig] = useState({
    wheelCircumference: 2,   // meters — circumference of the drive wheel
    driveTeeth: 19,          // teeth on the drive wheel sprocket
    shaftTeeth: 14,          // teeth on the shaft sprocket (connected to rev counter)
    machineWidth: 2.2,       // meters — working width of the planter
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [sheetInfo, setSheetInfo] = useState<{ ok?: boolean; spreadsheetId?: string; spreadsheetUrl?: string } | null>(null);
  const [sheetInfoLoading, setSheetInfoLoading] = useState(false);
  const [sheetInfoError, setSheetInfoError] = useState<string | null>(null);
  const [latestProofSource, setLatestProofSource] = useState('No proof photo found');
  const [latestProofTimestamp, setLatestProofTimestamp] = useState<string | null>(null);
  const [isDownloadingData, setIsDownloadingData] = useState(false);

  const openPlanterDetails = (planter: Planter) => {
    setShowRequestForm(false);
    setSelectedPlanter(planter);
  };

  const closePlanterDetails = () => {
    setShowRequestForm(false);
    setSelectedPlanter(null);
  };

  // Fetch Role Permissions
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'role_permissions'), (snapshot) => {
      const perms: any = { ...rolePermissions };
      snapshot.docs.forEach(doc => {
        perms[doc.id] = doc.data().allowedActions;
      });
      setRolePermissions(perms);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setShowRequestForm(false);
  }, [selectedPlanter?.id]);

  useEffect(() => {
    if (!selectedPlanter) return;

    const updatedPlanter = planters.find(planter => planter.id === selectedPlanter.id);
    if (updatedPlanter && updatedPlanter !== selectedPlanter) {
      setSelectedPlanter(updatedPlanter);
    }
  }, [planters, selectedPlanter]);

  const refreshAdminStoragePanel = async () => {
    if (userProfile?.role !== 'admin') return;

    setSheetInfoLoading(true);
    setSheetInfoError(null);

    try {
      const [info, latestProofSnapshot] = await Promise.all([
        getSheetInfo(),
        getDocs(query(collection(db, 'updates'), orderBy('timestamp', 'desc'), limit(25)))
      ]);

      setSheetInfo(info);
      if (!info) {
        setSheetInfoError('Sheets sync server is unavailable, so photos will fall back to Firebase Storage.');
      }

      const latestProofDoc = latestProofSnapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as ReadingUpdate))
        .find(update => update.imageUrl);

      setLatestProofSource(detectPhotoSource(latestProofDoc?.imageUrl));
      setLatestProofTimestamp(latestProofDoc?.timestamp || null);
    } catch (error) {
      console.error('Failed to load admin storage panel info:', error);
      setSheetInfo(null);
      setSheetInfoError('Unable to check Google Drive and Sheets connection right now.');
      setLatestProofSource('Unknown');
      setLatestProofTimestamp(null);
    } finally {
      setSheetInfoLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'settings' && userProfile?.role === 'admin') {
      void refreshAdminStoragePanel();
    }
  }, [activeTab, userProfile?.role]);

  // Load machine calculation config from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'calculations'), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setMachineConfig({
          wheelCircumference: d.wheelCircumference ?? 2,
          driveTeeth: d.driveTeeth ?? 19,
          shaftTeeth: d.shaftTeeth ?? 14,
          machineWidth: d.machineWidth ?? 2.2,
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Dynamic calculation functions based on current config
  const calcDist = (revs: number) => {
    const meters = revs * (machineConfig.shaftTeeth / machineConfig.driveTeeth) * machineConfig.wheelCircumference;
    return meters / 1000; // km
  };
  const calcArea = (revs: number) => {
    const meters = revs * (machineConfig.shaftTeeth / machineConfig.driveTeeth) * machineConfig.wheelCircumference;
    const sqMeters = meters * machineConfig.machineWidth;
    return sqMeters / 4046.86; // acres
  };

  const saveConfig = async (cfg: typeof machineConfig) => {
    setConfigSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'calculations'), cfg);
      void syncFirestoreDocumentData('settings', 'calculations', cfg as unknown as Record<string, unknown>);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (e) {
      console.error('Failed to save config:', e);
    } finally {
      setConfigSaving(false);
    }
  };

  const downloadAdminData = async (format: 'json' | 'csv', scope: 'backup' | 'machines' | 'users' | 'updates' | 'maintenance') => {
    if (userProfile?.role !== 'admin') return;

    setIsDownloadingData(true);
    try {
      const [
        planterSnap,
        userSnap,
        updateSnap,
        maintenanceRequestSnap,
        maintenanceLogSnap,
        assignmentSnap,
        notificationSnap,
        messageSnap,
        rolePermissionSnap,
        settingsSnap
      ] = await Promise.all([
        getDocs(collection(db, 'planters')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'updates')),
        getDocs(collection(db, 'maintenance_requests')),
        getDocs(collection(db, 'maintenance_logs')),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'notifications')),
        getDocs(collection(db, 'messages')),
        getDocs(collection(db, 'role_permissions')),
        getDocs(collection(db, 'settings'))
      ]);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        planters: planterSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        users: userSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        updates: updateSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        maintenance_requests: maintenanceRequestSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        maintenance_logs: maintenanceLogSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        assignments: assignmentSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        notifications: notificationSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        messages: messageSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        role_permissions: rolePermissionSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
        settings: settingsSnap.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }))
      };

      const filenameStamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

      if (format === 'json') {
        downloadTextFile(
          `farmmech-${scope}-${filenameStamp}.json`,
          JSON.stringify(scope === 'backup' ? exportPayload : exportPayload[scope === 'machines' ? 'planters' : scope === 'users' ? 'users' : scope === 'updates' ? 'updates' : 'maintenance_requests'], null, 2),
          'application/json'
        );
        return;
      }

      const records =
        scope === 'machines' ? exportPayload.planters :
        scope === 'users' ? exportPayload.users :
        scope === 'updates' ? exportPayload.updates :
        scope === 'maintenance' ? [
          ...exportPayload.maintenance_requests.map(record => ({ recordType: 'maintenance_request', ...record })),
          ...exportPayload.maintenance_logs.map(record => ({ recordType: 'maintenance_log', ...record }))
        ] :
        [
          ...exportPayload.planters.map(record => ({ collection: 'planters', ...record })),
          ...exportPayload.users.map(record => ({ collection: 'users', ...record })),
          ...exportPayload.updates.map(record => ({ collection: 'updates', ...record })),
          ...exportPayload.maintenance_requests.map(record => ({ collection: 'maintenance_requests', ...record })),
          ...exportPayload.maintenance_logs.map(record => ({ collection: 'maintenance_logs', ...record })),
          ...exportPayload.assignments.map(record => ({ collection: 'assignments', ...record })),
          ...exportPayload.notifications.map(record => ({ collection: 'notifications', ...record })),
          ...exportPayload.messages.map(record => ({ collection: 'messages', ...record })),
          ...exportPayload.role_permissions.map(record => ({ collection: 'role_permissions', ...record })),
          ...exportPayload.settings.map(record => ({ collection: 'settings', ...record }))
        ];

      downloadTextFile(
        `farmmech-${scope}-${filenameStamp}.csv`,
        exportRecordsToCsv(records as Record<string, unknown>[]),
        'text/csv;charset=utf-8'
      );
    } catch (error) {
      console.error('Failed to download admin data:', error);
      alert('Failed to download data. Please try again.');
    } finally {
      setIsDownloadingData(false);
    }
  };

  const handleApproveLog = async (log: MaintenanceLog) => {
    if (!user || !userProfile) return;

    const nextStatusMap: Record<string, MaintenanceLog['approvalStatus']> = {
      'pending_area_manager': 'pending_district_manager',
      'pending_district_manager': 'pending_farm_mech',
      'pending_farm_mech': 'approved'
    };
    const nextStatus = nextStatusMap[log.approvalStatus];

    const nextRoleMap: Record<string, UserRole> = {
      'pending_area_manager': 'district_manager',
      'pending_district_manager': 'farm_mechanization',
      'pending_farm_mech': 'admin'
    };
    const nextRole = nextRoleMap[log.approvalStatus];

    const roleKeyMap: Record<string, keyof NonNullable<MaintenanceLog['approvals']>> = {
      'pending_area_manager': 'areaManager',
      'pending_district_manager': 'districtManager',
      'pending_farm_mech': 'farmMechManager'
    };
    const roleKey = roleKeyMap[log.approvalStatus];

    try {
      await updateDoc(doc(db, 'maintenance_logs', log.id!), {
        approvalStatus: nextStatus,
        [`approvals.${roleKey}`]: {
          approved: true,
          by: user.displayName || user.email,
          at: new Date().toISOString()
        }
      });

      if (nextStatus === 'approved') {
        await updateDoc(doc(db, 'planters', log.planterId), { operatingStatus: 'idle' });
        void syncFirestoreDocument('planters', log.planterId);
      }
      void syncFirestoreDocument('maintenance_logs', log.id!);

      await createNotification({
        targetRole: nextRole,
        title: nextStatus === 'approved' ? 'Maintenance Approved' : 'Approval Required',
        message: nextStatus === 'approved'
          ? `Maintenance for ${log.planterId} has been fully approved.`
          : `Maintenance for ${log.planterId} requires ${nextRole.replace(/_/g, ' ')} approval.`,
        type: nextStatus === 'approved' ? 'success' : 'info',
        link: log.planterId
      });
    } catch (err) {
      console.error('Failed to approve log:', err);
    }
  };

  const handleRejectLog = async (log: MaintenanceLog) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'maintenance_logs', log.id!), {
        approvalStatus: 'rejected'
      });
      void syncFirestoreDocument('maintenance_logs', log.id!);
      if (log.createdByUid) {
        await createNotification({
          userId: log.createdByUid,
          title: 'Maintenance Rejected',
          message: `Maintenance for ${log.planterId} was rejected by ${user.displayName || user.email}.`,
          type: 'error',
          link: log.planterId
        });
      }
    } catch (err) {
      console.error('Failed to reject log:', err);
    }
  };
  const [reportData, setReportData] = useState<{
    totalDistance: number;
    totalArea: number;
    updateCount: number;
    topPlanters: { id: string; area: number }[];
  }>({ totalDistance: 0, totalArea: 0, updateCount: 0, topPlanters: [] });
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<UserRole, Permission[]>>({
    admin: ['assign_machines', 'view_reports', 'perform_maintenance', 'approve_maintenance', 'update_readings', 'manage_users', 'initialize_fleet'],
    farm_mechanization: ['assign_machines', 'view_reports', 'perform_maintenance', 'approve_maintenance', 'update_readings', 'manage_users'],
    district_manager: ['assign_machines', 'view_reports', 'approve_maintenance', 'manage_users', 'edit_machine_metadata'],
    area_manager: ['assign_machines', 'view_reports', 'approve_maintenance', 'manage_users', 'edit_machine_metadata'],
    community_facilitator: ['assign_machines', 'view_reports', 'update_readings', 'edit_machine_metadata'],
    operator: ['update_readings', 'edit_machine_metadata']
  });

  const hasPermission = (permission: Permission) => {
    if (!userProfile) return false;
    // Admin always has all permissions
    if (userProfile.role === 'admin') return true;
    if (permission === 'manage_users' && (userProfile.role === 'district_manager' || userProfile.role === 'area_manager')) {
      return true;
    }

    // Check if user has specific permission overrides
    if (userProfile.permissions?.includes(permission)) return true;

    // Check role-based permissions
    return rolePermissions[userProfile.role]?.includes(permission) || false;
  };

  const isAdmin = userProfile?.role === 'admin';
  const isDistrictManager = userProfile?.role === 'district_manager';
  const isAreaManager = userProfile?.role === 'area_manager';
  const isFacilitator = userProfile?.role === 'community_facilitator';
  const isOperator = userProfile?.role === 'operator';
  const isFarmMech = userProfile?.role === 'farm_mechanization';
  const canManageUsers = hasPermission('manage_users');
  const canAccessSettingsTab = isAdmin || canManageUsers;

  const userRoleLabel = useMemo(() => {
    if (isAdmin) return 'Farm Mechanization Admin';
    if (isFarmMech) return 'Farm Mechanization Team';
    if (isDistrictManager) return 'District Manager';
    if (isAreaManager) return 'Area Manager';
    if (isFacilitator) return 'Community Facilitator';
    return 'Operator';
  }, [userProfile, isAdmin, isFarmMech, isDistrictManager, isAreaManager, isFacilitator]);

  // --- Simple Email Login (no Firebase Auth) ---
  const handleLogin = async () => {
    const email = loginEmail.trim().toLowerCase();
    if (!email) { setLoginError('Please enter your email.'); return; }
    setLoginLoading(true);
    setLoginError(null);
    try {
      // Look up user by email in local snapshot first for instant offline-friendly login
      let profile = allUsers.find(u => u.email.toLowerCase() === email) || null;

      if (!profile) {
        // Fallback to active query
        const q = query(collection(db, 'users'), where('email', '==', email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = snap.docs[0].data() as UserProfile;
        }
      }
      
      if (!profile && (email === 'ganeshkeesara123@gmail.com' || email === 'ganeskeesara123@gmail.com')) {
        // Auto-create admin profile
        const uid = `admin_${Date.now()}`;
        profile = { uid, email, role: 'admin', displayName: 'Admin' };
        await setDoc(doc(db, 'users', uid), profile);
        void syncFirestoreDocumentData('users', uid, profile as unknown as Record<string, unknown>);
      }

      if (!profile) {
        setLoginError('No account found for this email. Ask your admin to add you first.');
        setLoginLoading(false);
        return;
      }

      const simpleUser = { uid: profile.uid, email: profile.email, displayName: profile.displayName };
      localStorage.setItem('planter_session', JSON.stringify(simpleUser));
      setUser(simpleUser);
      setUserProfile(profile);
    } catch (err) {
      console.error('Login failed:', err);
      if (err instanceof Error) {
        setLoginError(`Login failed: ${err.message}`);
      } else {
        setLoginError(`Login failed: ${JSON.stringify(err)}`);
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('planter_session');
    setUser(null);
    setUserProfile(null);
  };

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('planter_session');
    if (stored) {
      try {
        const simpleUser = JSON.parse(stored) as { uid: string; email: string; displayName: string };
        setUser(simpleUser);
        // Fetch profile from Firestore
        (async () => {
          const q = query(collection(db, 'users'), where('email', '==', simpleUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setUserProfile(snap.docs[0].data() as UserProfile);
          } else {
            // Profile deleted, clear session
            localStorage.removeItem('planter_session');
            setUser(null);
          }
          setLoading(false);
        })();
      } catch {
        localStorage.removeItem('planter_session');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Planters Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'planters'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Planter);
      setPlanters(data.sort((a, b) => a.id.localeCompare(b.id)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || activeTab !== 'reports') return;

    const fetchReport = async () => {
      setIsReportLoading(true);
      const now = new Date();
      let startDate = new Date();

      if (reportPeriod === 'daily') startDate.setHours(0, 0, 0, 0);
      else if (reportPeriod === 'weekly') startDate.setDate(now.getDate() - 7);
      else if (reportPeriod === 'monthly') startDate.setMonth(now.getMonth() - 1);

      const q = query(
        collection(db, 'updates'),
        where('timestamp', '>=', startDate.toISOString()),
        orderBy('timestamp', 'desc')
      );

      try {
        const snapshot = await getDocs(q);
        const fetchedUpdates = snapshot.docs.map(doc => doc.data() as ReadingUpdate);

        const totals = fetchedUpdates.reduce((acc, curr) => ({
          distance: acc.distance + curr.distanceKm,
          area: acc.area + curr.areaAcres,
        }), { distance: 0, area: 0 });

        const planterStats: Record<string, number> = {};
        fetchedUpdates.forEach(u => {
          planterStats[u.planterId] = (planterStats[u.planterId] || 0) + u.areaAcres;
        });

        const top = Object.entries(planterStats)
          .map(([id, area]) => ({ id, area }))
          .sort((a, b) => b.area - a.area)
          .slice(0, 5);

        setReportData({
          totalDistance: totals.distance,
          totalArea: totals.area,
          updateCount: fetchedUpdates.length,
          topPlanters: top
        });
      } catch (err) {
        console.error('Report fetch failed:', err);
      } finally {
        setIsReportLoading(false);
      }
    };

    fetchReport();
  }, [user, activeTab, reportPeriod]);

  // Selected Planter Updates Listener
  useEffect(() => {
    if (!selectedPlanter) {
      setUpdates([]);
      return;
    }
    const q = query(
      collection(db, 'updates'),
      where('planterId', '==', selectedPlanter.id),
      orderBy('timestamp', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingUpdate)));
    });
    return () => unsubscribe();
  }, [selectedPlanter]);

  // Selected Planter Maintenance Logs Listener
  useEffect(() => {
    if (!selectedPlanter) {
      setMaintenanceLogs([]);
      return;
    }
    const q = query(
      collection(db, 'maintenance_logs'),
      where('planterId', '==', selectedPlanter.id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMaintenanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog)));
    });
    return () => unsubscribe();
  }, [selectedPlanter]);

  // Selected Planter Maintenance Requests Listener
  useEffect(() => {
    if (!selectedPlanter) {
      setMaintenanceRequests([]);
      return;
    }
    const q = query(
      collection(db, 'maintenance_requests'),
      where('planterId', '==', selectedPlanter.id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMaintenanceRequests(
        snapshot.docs.map(doc =>
          normalizeMaintenanceRequest({ id: doc.id, ...doc.data() }, planters, allUsers)
        )
      );
    });
    return () => unsubscribe();
  }, [selectedPlanter, planters, allUsers]);

  // Global Maintenance Listeners
  useEffect(() => {
    if (!user) return;
    const qReq = query(collection(db, 'maintenance_requests'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeReq = onSnapshot(qReq, (snapshot) => {
      setAllMaintenanceRequests(
        snapshot.docs.map(doc =>
          normalizeMaintenanceRequest({ id: doc.id, ...doc.data() }, planters, allUsers)
        )
      );
    });

    const qLog = query(collection(db, 'maintenance_logs'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeLog = onSnapshot(qLog, (snapshot) => {
      setAllMaintenanceLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceLog)));
    });

    return () => {
      unsubscribeReq();
      unsubscribeLog();
    };
  }, [user, planters, allUsers]);

  // Notifications Listener
  useEffect(() => {
    if (!user || !userProfile) return;
    const q = query(
      collection(db, 'notifications'),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      const filtered = allNotifs.filter(n =>
        (!n.userId || n.userId === user.uid) &&
        (!n.targetRole || n.targetRole === userProfile.role)
      );
      setNotifications(filtered);
    });
    return () => unsubscribe();
  }, [user, userProfile]);

  const createNotification = async (notif: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    try {
      const notificationRecord = {
        ...notif,
        read: false,
        timestamp: new Date().toISOString()
      };
      const created = await addDoc(collection(db, 'notifications'), notificationRecord);
      void syncSheetDocument('notifications', created.id, notificationRecord);
    } catch (err) {
      console.error('Failed to create notification:', err);
    }
  };

  const scopedUserIds = useMemo(() => {
    if (!user?.uid) return [];
    if (isAdmin || isFarmMech) return allUsers.map(u => u.uid);
    return [user.uid, ...getDescendantUserIds(user.uid, allUsers)];
  }, [allUsers, isAdmin, isFarmMech, user]);

  const scopedUserIdSet = useMemo(() => new Set(scopedUserIds), [scopedUserIds]);

  const scopedUsers = useMemo(() => {
    if (isAdmin || isFarmMech) return allUsers;
    return allUsers.filter(u => scopedUserIdSet.has(u.uid));
  }, [allUsers, isAdmin, isFarmMech, scopedUserIdSet]);

  const manageableRoleOptions = useMemo(
    () => (userProfile ? getManageableRoles(userProfile.role) : []),
    [userProfile]
  );

  const manageableUsers = useMemo(() => {
    if (!userProfile || !user) return [];
    if (isAdmin) return allUsers.filter(candidate => candidate.uid !== user.uid);
    if (isFarmMech) return allUsers.filter(candidate => candidate.uid !== user.uid && candidate.role !== 'admin');
    return scopedUsers.filter(candidate =>
      candidate.uid !== user.uid &&
      canRoleManageRole(userProfile.role, candidate.role)
    );
  }, [allUsers, isAdmin, isFarmMech, scopedUsers, user, userProfile]);

  const manageableUserIdSet = useMemo(
    () => new Set(manageableUsers.map(candidate => candidate.uid)),
    [manageableUsers]
  );

  const canManageUserRecord = (candidate?: UserProfile | null) => {
    if (!candidate || !canManageUsers) return false;
    return manageableUserIdSet.has(candidate.uid);
  };

  const managedTreeUsers = useMemo(() => {
    if (isAdmin) return allUsers;
    if (isFarmMech) return allUsers.filter(candidate => candidate.role !== 'admin');
    return scopedUsers;
  }, [allUsers, isAdmin, isFarmMech, scopedUsers]);

  const getAllowedManagerCandidates = (role: UserRole, excludeUid?: string | null) => {
    if (!userProfile || !user) return [];

    const currentUserProfile =
      allUsers.find(candidate => candidate.uid === user.uid) ||
      ({ ...userProfile, uid: user.uid, email: user.email, displayName: user.displayName } as UserProfile);

    const scopePool = isAdmin || isFarmMech
      ? allUsers
      : [currentUserProfile, ...manageableUsers];

    return scopePool.filter((candidate, index, pool) =>
      candidate.uid !== excludeUid &&
      pool.findIndex(entry => entry.uid === candidate.uid) === index &&
      canRoleBeParentOfRole(candidate.role, role)
    );
  };

  const getSuggestedParentId = (role: UserRole, excludeUid?: string | null, preferredParentId = '') => {
    const candidates = getAllowedManagerCandidates(role, excludeUid);
    if (preferredParentId && candidates.some(candidate => candidate.uid === preferredParentId)) {
      return preferredParentId;
    }
    if (user && candidates.some(candidate => candidate.uid === user.uid)) {
      return user.uid;
    }
    return candidates[0]?.uid || '';
  };

  const resetUserForm = (roleOverride?: UserRole) => {
    const nextRole = roleOverride || manageableRoleOptions[0] || 'operator';
    setAddUserForm(createEmptyUserForm(nextRole, getSuggestedParentId(nextRole)));
    setEditingUserId(null);
    setAddUserError(null);
  };

  const managerOptionsForForm = useMemo(
    () => getAllowedManagerCandidates(addUserForm.role, editingUserId),
    [addUserForm.role, allUsers, editingUserId, isAdmin, isFarmMech, manageableUsers, user, userProfile]
  );

  const transferRecipients = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return allUsers.filter(candidate => candidate.uid !== user.uid && candidate.role !== 'admin');
    if (isFarmMech) return allUsers.filter(candidate => candidate.uid !== user.uid && candidate.role !== 'admin' && candidate.role !== 'farm_mechanization');
    return manageableUsers;
  }, [allUsers, isAdmin, isFarmMech, manageableUsers, user]);

  const canViewHierarchyTab = !!userProfile && !isOperator;

  const canManagePlanterMetadata = (planter: Planter) => {
    if (!user?.uid) return false;
    if (isAdmin || isFarmMech) return true;
    if (planter.currentHolderId === user.uid) return true;
    return scopedUserIdSet.has(planter.currentHolderId);
  };

  const canUserSeeMaintenanceRequest = (request: MaintenanceRequest) => {
    const isPlanterInScope = isAdmin || isFarmMech || myPlanterIdSet.has(request.planterId);

    if (!isPlanterInScope) return false;
    if (isAdmin) return ['pending_admin', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'].includes(request.status);
    return true;
  };

  const canApproveMaintenanceRequest = (request: MaintenanceRequest) => {
    if (request.status === 'pending_area_manager') return isAreaManager;
    if (request.status === 'pending_district_manager') return isDistrictManager;
    if (request.status === 'pending_farm_mech') return isFarmMech;
    if (request.status === 'pending_admin') return isAdmin;
    return false;
  };

  const canOperateMaintenanceRequest = (request: MaintenanceRequest) => {
    return (isAdmin || isFarmMech) && (request.status === 'approved' || request.status === 'in_progress');
  };

  const handleApproveRequest = async (request: MaintenanceRequest) => {
    if (!user) return;

    const nextStatus = getNextRequestStatus(request.status);
    const nextRole = getNextRequestRole(request.status);
    const approvalKey = getRequestApprovalRoleKey(request.status);

    try {
      const updatePayload: Record<string, any> = { status: nextStatus };
      if (approvalKey) {
        updatePayload[`approvals.${approvalKey}`] = {
          approved: true,
          by: user.displayName || user.email,
          at: new Date().toISOString()
        };
      }

      await updateDoc(doc(db, 'maintenance_requests', request.id!), updatePayload);
      void syncFirestoreDocument('maintenance_requests', request.id!);

      if (nextStatus === 'approved') {
        await updateDoc(doc(db, 'planters', request.planterId), {
          operatingStatus: 'maintenance',
          lastUpdated: new Date().toISOString()
        });
        void syncFirestoreDocument('planters', request.planterId);
      }

      if (nextRole) {
        await createNotification({
          targetRole: nextRole,
          title: 'Maintenance Request Needs Review',
          message: `${request.planterId} is ready for ${nextRole.replace(/_/g, ' ')} review.`,
          type: 'warning',
          link: request.planterId
        });
      } else {
        await createNotification({
          userId: request.requestedByUid || request.currentHolderUid,
          title: 'Maintenance Request Approved',
          message: `${request.planterId} has completed the approval chain and is ready for work.`,
          type: 'success',
          link: request.planterId
        });
      }
    } catch (err) {
      console.error('Failed to approve maintenance request:', err);
    }
  };

  const handleRejectRequest = async (request: MaintenanceRequest) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'maintenance_requests', request.id!), {
        status: 'rejected'
      });
      void syncFirestoreDocument('maintenance_requests', request.id!);

      await createNotification({
        userId: request.requestedByUid || request.currentHolderUid,
        title: 'Maintenance Request Rejected',
        message: `${request.planterId} was rejected by ${user.displayName || user.email}.`,
        type: 'error',
        link: request.planterId
      });
    } catch (err) {
      console.error('Failed to reject maintenance request:', err);
    }
  };

  const handleStartRequestWork = async (request: MaintenanceRequest) => {
    try {
      await updateDoc(doc(db, 'maintenance_requests', request.id!), {
        status: 'in_progress'
      });
      void syncFirestoreDocument('maintenance_requests', request.id!);
      await updateDoc(doc(db, 'planters', request.planterId), {
        operatingStatus: 'maintenance',
        lastUpdated: new Date().toISOString()
      });
      void syncFirestoreDocument('planters', request.planterId);
      await createNotification({
        userId: request.requestedByUid || request.currentHolderUid,
        title: 'Maintenance In Progress',
        message: `Work has started on ${request.planterId}.`,
        type: 'info',
        link: request.planterId
      });
    } catch (err) {
      console.error('Failed to start maintenance work:', err);
    }
  };

  const handleCompleteRequestWork = async (request: MaintenanceRequest) => {
    try {
      await updateDoc(doc(db, 'maintenance_requests', request.id!), {
        status: 'completed'
      });
      void syncFirestoreDocument('maintenance_requests', request.id!);
      await createNotification({
        userId: request.currentHolderUid,
        title: 'Repair Details Needed',
        message: `${request.planterId} was marked done. Please add technician repair details.`,
        type: 'info',
        link: request.planterId
      });
    } catch (err) {
      console.error('Failed to complete maintenance work:', err);
    }
  };

  const handleCancelRequest = async (request: MaintenanceRequest) => {
    try {
      await updateDoc(doc(db, 'maintenance_requests', request.id!), {
        status: 'cancelled'
      });
      void syncFirestoreDocument('maintenance_requests', request.id!);
      if (request.status === 'approved' || request.status === 'in_progress') {
        await updateDoc(doc(db, 'planters', request.planterId), {
          operatingStatus: 'idle',
          lastUpdated: new Date().toISOString()
        });
        void syncFirestoreDocument('planters', request.planterId);
      }
      await createNotification({
        userId: request.requestedByUid || request.currentHolderUid,
        title: 'Maintenance Request Cancelled',
        message: `${request.planterId} maintenance request was cancelled.`,
        type: 'warning',
        link: request.planterId
      });
    } catch (err) {
      console.error('Failed to cancel maintenance request:', err);
    }
  };

  const initiateTransfer = async (machineIds: string | string[], toUser: UserProfile) => {
    if (!user || !userProfile) return;

    const ids = Array.isArray(machineIds) ? machineIds : [machineIds];

    try {
      const isDirect = isAdmin || isFarmMech;

      for (const machineId of ids) {
        const assignmentRef = await addDoc(collection(db, 'assignments'), {
          machineId,
          fromUserId: user.uid,
          fromRole: userProfile.role,
          toUserId: toUser.uid,
          toRole: toUser.role,
          timestamp: new Date().toISOString(),
          status: isDirect ? 'accepted' : 'pending'
        });
        void syncFirestoreDocument('assignments', assignmentRef.id);

        if (isDirect) {
          await updateDoc(doc(db, 'planters', machineId), {
            currentHolderId: toUser.uid,
            currentHolderRole: toUser.role,
            lastUpdated: new Date().toISOString()
          });
          void syncFirestoreDocument('planters', machineId);
        }

        await createNotification({
          userId: toUser.uid,
          title: isDirect ? 'Machine Assigned' : 'Machine Assignment Request',
          message: isDirect
            ? `${userProfile.displayName} has assigned machine ${machineId} to you.`
            : `${userProfile.displayName} has requested to transfer machine ${machineId} to you.`,
          type: 'info',
          link: machineId
        });
      }

      setShowTransferModal(false);
      setSelectedMachineIds([]);
    } catch (err) {
      console.error('Transfer failed:', err);
      setError('Failed to initiate transfer');
    }
  };

  const handleAcceptAssignment = async (assignment: Assignment) => {
    try {
      // 1. Update Machine Holder
      await updateDoc(doc(db, 'planters', assignment.machineId), {
        currentHolderId: assignment.toUserId,
        currentHolderRole: assignment.toRole,
        lastUpdated: new Date().toISOString()
      });
      void syncFirestoreDocument('planters', assignment.machineId);

      // 2. Update Assignment Status
      await updateDoc(doc(db, 'assignments', assignment.id!), {
        status: 'accepted'
      });
      void syncFirestoreDocument('assignments', assignment.id!);

      // 3. Notify Sender
      await createNotification({
        userId: assignment.fromUserId,
        title: 'Assignment Accepted',
        message: `${userProfile?.displayName} has accepted machine ${assignment.machineId}.`,
        type: 'success',
        link: assignment.machineId
      });
    } catch (err) {
      console.error('Accept failed:', err);
      setError('Failed to accept assignment');
    }
  };

  const handleRejectAssignment = async (assignment: Assignment) => {
    try {
      await updateDoc(doc(db, 'assignments', assignment.id!), {
        status: 'rejected'
      });
      void syncFirestoreDocument('assignments', assignment.id!);

      await createNotification({
        userId: assignment.fromUserId,
        title: 'Assignment Rejected',
        message: `${userProfile?.displayName} has rejected machine ${assignment.machineId}.`,
        type: 'error',
        link: assignment.machineId
      });
    } catch (err) {
      console.error('Reject failed:', err);
    }
  };

  // Initialize 200 machines if none exist
  // Assignments Listener
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'assignments'), (snapshot) => {
      setAssignments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment)));
    });
    return () => unsubscribe();
  }, [user]);

  // All Users Listener (for assignment) - always load when logged in, filter in UI
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });
    return () => unsubscribe();
  }, [user]);

  // Messages Listener
  useEffect(() => {
    if (!user) return;
    // We fetch all messages where the current user is sender OR receiver
    // Firestore OR queries for multiple fields require composite indexing which we might not have.
    // Assuming simple local application handling for now, we pull all messages and filter locally.
    const unsubscribe = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(allMsgs.filter(m => m.senderId === user.uid || m.receiverId === user.uid));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAddUser = async () => {
    if (!canManageUsers || !userProfile) {
      setAddUserError('You do not have permission to manage users.');
      return;
    }
    if (!addUserForm.displayName.trim() || !addUserForm.email.trim()) {
      setAddUserError('Name and email are required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(addUserForm.email.trim())) {
      setAddUserError('Please enter a valid email address.');
      return;
    }
    if (allUsers.some(u => u.email.toLowerCase() === addUserForm.email.trim().toLowerCase() && u.uid !== editingUserId)) {
      setAddUserError('A user with this email already exists.');
      return;
    }
    if (!manageableRoleOptions.includes(addUserForm.role)) {
      setAddUserError(`You can only manage ${manageableRoleOptions.map(role => role.replace(/_/g, ' ')).join(', ')} accounts.`);
      return;
    }

    const editingUser = editingUserId ? allUsers.find(candidate => candidate.uid === editingUserId) : null;
    if (editingUserId && !canManageUserRecord(editingUser)) {
      setAddUserError('You can only edit users inside your reporting branch.');
      return;
    }

    const resolvedParentId = getSuggestedParentId(addUserForm.role, editingUserId, addUserForm.parentId);
    if (!resolvedParentId && !isAdmin && !isFarmMech) {
      setAddUserError('Select a reporting manager for this user.');
      return;
    }

    setAddUserLoading(true);
    setAddUserError(null);
    try {
      const targetUid = editingUserId || `pending_${addUserForm.email.trim().replace(/[^a-z0-9]/gi, '_')}_${Date.now()}`;
      
      const newProfile: any = {
        email: addUserForm.email.trim().toLowerCase(),
        role: addUserForm.role,
        displayName: addUserForm.displayName.trim(),
        assignedState: addUserForm.assignedState.trim(),
        assignedDistrict: addUserForm.assignedDistrict.trim(),
        assignedMandal: addUserForm.assignedMandal.trim(),
        assignedArea: addUserForm.assignedArea.trim(),
        parentId: resolvedParentId || ''
      };
      
      if (!editingUserId) {
        newProfile.uid = targetUid;
      }

      await setDoc(doc(db, 'users', targetUid), newProfile, { merge: true });
      void syncFirestoreDocument('users', targetUid);
      resetUserForm();
      setShowAddUserForm(false);
    } catch (err) {
      console.error('Failed to add user:', err);
      setAddUserError('Failed to add user. Please try again.');
    } finally {
      setAddUserLoading(false);
    }
  };

  const initializeMachines = async () => {
    if (planters.length > 0) return;
    setLoading(true);
    const districts = ['Hyderabad', 'Rangareddy', 'Medchal', 'Sangareddy'];

    try {
      const batch = [];
      for (let i = 1; i <= 200; i++) {
        const id = `P-${String(i).padStart(3, '0')}`;
        const district = districts[Math.floor((i - 1) / 50)];

        const planter: Planter = {
          id,
          name: `Planter ${i}`,
          type: 'Multicrop',
          serialNumber: `SN-${1000 + i}`,
          operatingStatus: 'idle',
          currentHolderId: user?.uid || 'admin',
          currentHolderRole: 'admin',
          location: `Main Warehouse`,
          lastReading: 0,
          lastUpdated: new Date().toISOString()
        };
        batch.push(setDoc(doc(db, 'planters', id), planter));
      }
      await Promise.all(batch);
      await Promise.all(
        Array.from({ length: 200 }, (_unused, index) =>
          syncFirestoreDocument('planters', `P-${String(index + 1).padStart(3, '0')}`)
        )
      );
    } catch (err) {
      console.error(err);
      setError('Failed to initialize machines');
    } finally {
      setLoading(false);
    }
  };

  const [sortBy, setSortBy] = useState<keyof Planter>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // myPlanters: machines visible in the current user's hierarchy scope
  const myPlanters = useMemo(() => {
    if (isAdmin || isFarmMech) return planters; // admin/farm mech see all
    return planters.filter(p => scopedUserIdSet.has(p.currentHolderId));
  }, [planters, isAdmin, isFarmMech, scopedUserIdSet]);

  const myPlanterIdSet = useMemo(() => new Set(myPlanters.map(p => p.id)), [myPlanters]);

  const visibleMaintenanceRequests = useMemo(
    () => allMaintenanceRequests.filter(request => canUserSeeMaintenanceRequest(request)),
    [allMaintenanceRequests, userProfile, myPlanterIdSet, isAdmin, isFarmMech]
  );

  const pendingRequestApprovals = useMemo(
    () => visibleMaintenanceRequests.filter(request => canApproveMaintenanceRequest(request)),
    [visibleMaintenanceRequests, userProfile]
  );

  const actionableMaintenanceRequests = useMemo(
    () => visibleMaintenanceRequests.filter(request => canOperateMaintenanceRequest(request)),
    [visibleMaintenanceRequests, userProfile]
  );

  const pendingRepairCompletionRequests = useMemo(
    () => visibleMaintenanceRequests.filter(request =>
      request.currentHolderUid === user?.uid &&
      request.status === 'completed' &&
      !request.resolutionSubmittedAt
    ),
    [visibleMaintenanceRequests, user]
  );

  const selectedPlanterPendingRepairRequest = useMemo(() => {
    if (!selectedPlanter) return null;
    return maintenanceRequests.find(request =>
      request.planterId === selectedPlanter.id &&
      request.currentHolderUid === user?.uid &&
      request.status === 'completed' &&
      !request.resolutionSubmittedAt
    ) || null;
  }, [maintenanceRequests, selectedPlanter, user]);

  const filteredPlanters = useMemo(() => {
    return myPlanters.filter(p => {
      const holderName = allUsers.find(u => u.uid === p.currentHolderId)?.displayName || 'Unknown';
      
      const matchesSearch = p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        holderName.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesMandal = filterMandal === 'All' || p.mandal === filterMandal;
      const matchesDistrict = filterDistrict === 'All' || p.district === filterDistrict;
      const matchesFacilitator = filterFacilitator === 'All' || holderName === filterFacilitator;
      
      return matchesSearch && matchesMandal && matchesDistrict && matchesFacilitator;
    });
  }, [myPlanters, searchTerm, filterMandal, filterDistrict, filterFacilitator, allUsers]);

  const sortedPlanters = useMemo(() => {
    return [...filteredPlanters].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];

      if (aVal === undefined || bVal === undefined) return 0;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
  }, [filteredPlanters, sortBy, sortOrder]);

  const ITEMS_PER_PAGE = 12;

  const fleetMachineData = useMemo(() => {
    const adminUids = allUsers.filter(u => u.role === 'admin' || u.role === 'farm_mechanization').map(u => u.uid);
    const assignedPlanters = sortedPlanters.filter(p => p.currentHolderId && !adminUids.includes(p.currentHolderId));
    const unassignedPlanters = sortedPlanters.filter(p => !p.currentHolderId || adminUids.includes(p.currentHolderId));

    const totalAssignedPages = Math.ceil(assignedPlanters.length / ITEMS_PER_PAGE);
    const totalUnassignedPages = Math.ceil(unassignedPlanters.length / ITEMS_PER_PAGE);
    
    const paginatedAssigned = assignedPlanters.slice((assignedPage - 1) * ITEMS_PER_PAGE, assignedPage * ITEMS_PER_PAGE);
    const paginatedUnassigned = unassignedPlanters.slice((unassignedPage - 1) * ITEMS_PER_PAGE, unassignedPage * ITEMS_PER_PAGE);

    return {
      assignedPlanters,
      unassignedPlanters,
      totalAssignedPages,
      totalUnassignedPages,
      paginatedAssigned,
      paginatedUnassigned
    };
  }, [sortedPlanters, allUsers, assignedPage, unassignedPage]);

  const mandals = useMemo(() => {
    const set = new Set(myPlanters.map(p => p.mandal).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [myPlanters]);

  const districts = useMemo(() => {
    const set = new Set(myPlanters.map(p => p.district).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [myPlanters]);

  const facilitators = useMemo(() => {
    const set = new Set(myPlanters.map(p => allUsers.find(u => u.uid === p.currentHolderId)?.displayName || 'Unknown'));
    return ['All', ...Array.from(set).sort()];
  }, [myPlanters, allUsers]);

  const statusDistribution = useMemo(() => {
    const counts = { operating: 0, maintenance: 0, idle: 0 };
    myPlanters.forEach(p => {
      if (p.operatingStatus in counts) {
        counts[p.operatingStatus as keyof typeof counts]++;
      }
    });
    return [
      { name: 'Operating', value: counts.operating, color: '#22c55e' },
      { name: 'Maintenance', value: counts.maintenance, color: '#f97316' },
      { name: 'Idle', value: counts.idle, color: '#94a3b8' }
    ];
  }, [myPlanters]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 relative z-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f2_55%,#f8fafc_100%)] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.1),transparent_24%)]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl -mr-1/4 -mt-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl -ml-1/4 -mb-1/4" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-lg w-full bg-white/82 backdrop-blur-2xl rounded-[40px] p-12 shadow-[0_20px_80px_rgba(15,23,42,0.08)] border border-white/70 relative z-10 overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500" />
          <div className="absolute -right-10 top-8 h-32 w-32 rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/30 shadow-lg rounded-3xl flex items-center justify-center mx-auto mb-8 transform -rotate-6">
            <Tractor className="w-12 h-12 text-white transform rotate-6" />
          </div>
          <h1 className="font-serif text-4xl mb-2 text-slate-800 font-bold tracking-tight">Planter Tracker Pro</h1>
          <p className="text-slate-500 mb-10 leading-relaxed font-medium">
            Fleet management for multicrop planters.
          </p>
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {['Live hierarchy', 'Photo proof updates', 'Maintenance workflow'].map(item => (
              <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">
                {item}
              </span>
            ))}
          </div>

          <div className="space-y-4 text-left">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Your Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full px-5 py-4 bg-slate-100 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm outline-none"
                autoFocus
              />
            </div>
            {loginError && (
              <p className="text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {loginError}
              </p>
            )}
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-bold tracking-wide flex items-center justify-center gap-3 hover:bg-emerald-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 disabled:opacity-60 disabled:translate-y-0"
            >
              {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 text-left">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Access Note</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              No account yet? Ask your administrator or manager to add you from the user management screen.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f4f8f5_38%,#f8fafc_100%)] text-slate-800 selection:bg-emerald-100 selection:text-emerald-900 font-sans relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_22%),radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.08),transparent_20%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_22%)]" />
      <div className="pointer-events-none fixed -top-32 right-[-8rem] h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 left-[-6rem] h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/72 shadow-[0_10px_40px_rgba(15,23,42,0.05)] backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-emerald-500/20 shadow-lg shrink-0">
                <Tractor className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-slate-800 truncate">Planter Tracker</h1>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold truncate">Field Operations Command</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-11 h-11 bg-white/85 border border-slate-200/70 rounded-2xl flex items-center justify-center text-[#5A5A40]/60 hover:text-[#5A5A40] transition-colors relative shadow-sm"
                >
                  {notifications.some(n => !n.read) ? (
                    <BellDot className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Bell className="w-5 h-5" />
                  )}
                  {notifications.some(n => !n.read) && (
                    <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-orange-500 rounded-full border-2 border-white" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-black/5 flex items-center justify-between">
                        <h3 className="font-serif text-sm">Notifications</h3>
                        <button
                          onClick={async () => {
                            const batch = notifications.filter(n => !n.read);
                            for (const n of batch) {
                              await updateDoc(doc(db, 'notifications', n.id!), { read: true });
                            }
                          }}
                          className="text-[10px] text-blue-600 hover:underline"
                        >
                          Mark all as read
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center text-[#5A5A40]/40 text-xs italic">
                            No notifications
                          </div>
                        ) : (
                          notifications.map(n => (
                            <div
                              key={n.id}
                              className={cn(
                                "p-4 border-b border-black/5 last:border-0 hover:bg-[#F5F5F0] transition-colors cursor-pointer",
                                !n.read && "bg-blue-50/30"
                              )}
                              onClick={async () => {
                                if (!n.read) {
                                  await updateDoc(doc(db, 'notifications', n.id!), { read: true });
                                }
                                if (n.link) {
                                  const p = planters.find(pl => pl.id === n.link);
                                  if (p) {
                                    setSelectedPlanter(p);
                                    setActiveTab('fleet');
                                  }
                                }
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                                  n.type === 'success' ? "bg-green-100 text-green-600" :
                                    n.type === 'error' ? "bg-red-100 text-red-600" :
                                      n.type === 'warning' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  {n.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> :
                                    n.type === 'error' ? <AlertCircle className="w-4 h-4" /> :
                                      n.type === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold mb-0.5">{n.title}</p>
                                  <p className="text-[10px] text-[#5A5A40]/60 line-clamp-2">{n.message}</p>
                                  <p className="text-[9px] text-[#5A5A40]/30 mt-1">{format(new Date(n.timestamp), 'MMM d, HH:mm')}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Role Switcher for Demo */}
              <div className="hidden md:flex items-center gap-2 bg-white/85 p-1 rounded-2xl border border-slate-200/70 shadow-sm">
                <select
                  value={userProfile?.role || 'operator'}
                  onChange={async (e) => {
                    const newRole = e.target.value as UserRole;
                    if (user) {
                      const userDocRef = doc(db, 'users', user.uid);
                      const updates: any = { role: newRole };

                      if (newRole === 'area_manager' && !userProfile?.assignedMandal) {
                        updates.assignedMandal = 'Mandal 1';
                      }
                      if (newRole === 'district_manager' && !userProfile?.assignedDistrict) {
                        updates.assignedDistrict = 'Hyderabad';
                      }
                      if (newRole === 'operator' && !userProfile?.assignedMandal) {
                        updates.assignedMandal = 'Mandal 1';
                      }
                      if (newRole === 'community_facilitator' && !userProfile?.displayName) {
                        updates.displayName = 'A';
                      }

                      await updateDoc(userDocRef, updates);
                      void syncFirestoreDocument('users', user.uid);
                      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
                    }
                  }}
                  className="bg-transparent border-none text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]/60 focus:ring-0 cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="community_facilitator">Facilitator</option>
                  <option value="area_manager">Area Mgr</option>
                  <option value="district_manager">Dist Mgr</option>
                  <option value="farm_mechanization">Farm Mech</option>
                  <option value="operator">Operator</option>
                </select>
              </div>

              <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/78 px-4 py-2.5 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white font-bold">
                  {(user.displayName || 'U').slice(0, 1).toUpperCase()}
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <p className="text-sm font-medium">{user.displayName}</p>
                    {isAdmin ? (
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                    ) : (
                      <UserCog className="w-4 h-4 text-[#5A5A40]/60" />
                    )}
                  </div>
                  <p className="text-xs text-[#5A5A40]/60">{userRoleLabel}</p>
                </div>
              </div>
              <div className="hidden sm:block lg:hidden text-right mr-1">
                <p className="text-sm font-medium leading-tight">{user.displayName}</p>
                <p className="text-[11px] text-[#5A5A40]/60">{userRoleLabel}</p>
              </div>
              <button
                onClick={handleLogout}
                className="h-11 px-4 bg-slate-900 text-white rounded-2xl flex items-center gap-2 text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          <nav className="flex items-center gap-1.5 bg-white/82 p-1.5 rounded-[20px] backdrop-blur-sm border border-slate-200/70 shadow-sm overflow-x-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 relative whitespace-nowrap",
                  activeTab === 'dashboard' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('fleet')}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                  activeTab === 'fleet' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Fleet
              </button>
              {hasPermission('view_reports') && (
                <button
                  onClick={() => setActiveTab('reports')}
                  className={cn(
                    "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                    activeTab === 'reports' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  Reports
                </button>
              )}
              <button
                onClick={() => setActiveTab('assignments')}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'assignments' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Assignments
                {assignments.some(a => a.toUserId === user.uid && a.status === 'pending') && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                  activeTab === 'map' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Map
              </button>
              {canViewHierarchyTab && (
                <button
                  onClick={() => setActiveTab('hierarchy')}
                  className={cn(
                    "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                    activeTab === 'hierarchy' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  Hierarchy
                </button>
              )}
              <button
                onClick={() => setActiveTab('messages')}
                className={cn(
                  "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 whitespace-nowrap",
                  activeTab === 'messages' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                Messages
                {messages.some(m => !m.read && m.receiverId === user.uid) && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                )}
              </button>
              {canAccessSettingsTab && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={cn(
                    "px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap",
                    activeTab === 'settings' ? "bg-white shadow-[0_2px_10px_rgb(0,0,0,0.05)] text-emerald-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  Settings
                </button>
              )}
          </nav>
        </div>
      </header>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (selectedPlanter || selectedMachineIds.length > 0) && (
          <div
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif">Transfer Machine</h2>
                <button onClick={() => { setShowTransferModal(false); if (!selectedPlanter) setSelectedMachineIds([]); }} className="p-2 hover:bg-[#F5F5F0] rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-sm text-[#5A5A40]/60 mb-6">
                {selectedMachineIds.length > 0
                  ? `Assign ${selectedMachineIds.length} selected machines to the next level in the hierarchy.`
                  : selectedPlanter ? `Assign machine ${selectedPlanter.id} to the next level in the hierarchy.` : ''
                }
              </p>

              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[#5A5A40]/40">Select Recipient</p>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {transferRecipients
                    .map(u => (
                      <button
                        key={u.uid}
                        onClick={() => initiateTransfer(selectedMachineIds.length > 0 ? selectedMachineIds : (selectedPlanter?.id || ''), u)}
                        className="w-full p-4 bg-[#F5F5F0] hover:bg-[#5A5A40] hover:text-white rounded-2xl text-left transition-all group flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-sm">{u.displayName}</p>
                          <p className="text-[10px] opacity-60 uppercase">{u.role.replace(/_/g, ' ')}</p>
                          {(u.assignedDistrict || u.assignedMandal || u.assignedArea) && (
                            <p className="text-[10px] opacity-50 mt-1">
                              {[u.assignedDistrict, u.assignedMandal, u.assignedArea].filter(Boolean).join(' • ')}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  {transferRecipients.length === 0 && (
                      <p className="text-sm text-center py-8 text-[#5A5A40]/40 italic">No eligible users found in your hierarchy. Add your reporting-team users in Settings first.</p>
                    )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Machine Modal */}
      <AnimatePresence>
        {showAddMachineModal && (
          <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-3xl font-serif">Register Machine</h2>
                <button onClick={() => setShowAddMachineModal(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!newMachineData.id || !user) return;
                setAddMachineLoading(true);
                try {
                  const newPlanter: Planter = {
                    id: newMachineData.id,
                    type: newMachineData.type,
                    operatingStatus: 'idle',
                    currentHolderId: user.uid,
                    currentHolderRole: userProfile?.role || 'admin',
                    location: newMachineData.location,
                    mandal: newMachineData.mandal,
                    district: newMachineData.district,
                    state: newMachineData.state,
                    lat: parseFloat(newMachineData.lat) || undefined,
                    lng: parseFloat(newMachineData.lng) || undefined,
                    lastReading: 0,
                    lastUpdated: new Date().toISOString(),
                    gallery: []
                  };
                  await setDoc(doc(db, 'planters', newPlanter.id), newPlanter);
                  void syncFirestoreDocumentData('planters', newPlanter.id, newPlanter as any);
                  setShowAddMachineModal(false);
                  setNewMachineData({ id: '', type: 'Planter Pro', state: '', district: '', mandal: '', location: '', lat: '', lng: '' });
                  createNotification({ type: 'success', title: 'Machine Registered', message: `Machine ${newPlanter.id} successfully added.` });
                } catch (err) {
                  console.error(err);
                  alert('Failed to register machine');
                } finally {
                  setAddMachineLoading(false);
                }
              }} className="space-y-4 relative z-10">
                
                <div className="bg-[#F5F5F0]/50 p-4 rounded-2xl border border-black/5 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest">Coordinates (GPS)</p>
                    <div className="flex gap-2">
                       <button 
                        type="button"
                        onClick={fetchCurrentGPS}
                        className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5 font-bold text-slate-600 shadow-sm"
                       >
                         <MapPin className="w-3 h-3" /> Get Current
                       </button>
                       <button 
                        type="button"
                        disabled={geocodingLoading || !newMachineData.lat || !newMachineData.lng}
                        onClick={syncAddressFromCoords}
                        className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1.5 font-bold shadow-sm disabled:opacity-50"
                       >
                         {geocodingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Network className="w-3 h-3" />}
                         Sync Address
                       </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input 
                        type="text" 
                        placeholder="Latitude (e.g. 17.38)"
                        value={newMachineData.lat} 
                        onChange={e => setNewMachineData(prev => ({ ...prev, lat: e.target.value }))}
                        className="w-full bg-white p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <input 
                        type="text" 
                        placeholder="Longitude (e.g. 78.48)"
                        value={newMachineData.lng} 
                        onChange={e => setNewMachineData(prev => ({ ...prev, lng: e.target.value }))}
                        className="w-full bg-white p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">Machine ID</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. MACH-001"
                      value={newMachineData.id} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">Type/Model</label>
                    <input 
                      required 
                      type="text" 
                      value={newMachineData.type} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">State</label>
                    <input 
                      required 
                      type="text" 
                      value={newMachineData.state} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">District</label>
                    <input 
                      required 
                      type="text" 
                      value={newMachineData.district} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, district: e.target.value }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">Mandal</label>
                    <input 
                      required 
                      type="text" 
                      value={newMachineData.mandal} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, mandal: e.target.value }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#5A5A40]/60 uppercase tracking-widest mb-1 block">Village/Location</label>
                    <input 
                      required 
                      type="text" 
                      value={newMachineData.location} 
                      onChange={e => setNewMachineData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full bg-[#F5F5F0] p-3 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-black/5 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowAddMachineModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={addMachineLoading} className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-colors disabled:opacity-50">
                    {addMachineLoading ? 'Registering...' : 'Register Machine'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            <PageBanner
              eyebrow="Operations Dashboard"
              title={`Welcome, ${userProfile?.displayName || 'User'}`}
              description={
                isAdmin ? "Full system overview and administrative controls." :
                isDistrictManager ? `District overview for ${userProfile?.assignedDistrict || 'your assigned'} district, including downstream machine health and approvals.` :
                isAreaManager ? `Area overview for ${userProfile?.assignedArea || 'your assigned'} region with live hierarchy visibility and maintenance progress.` :
                isFacilitator ? "Manage field machines, capture updates quickly, and keep every issue moving through the workflow." :
                "Track your assigned machine, submit counter updates, and raise maintenance issues from one place."
              }
              icon={LayoutDashboard}
              badges={[
                `${myPlanters.length} machines in scope`,
                `${pendingRequestApprovals.length} approvals waiting`,
                `${pendingRepairCompletionRequests.length} repair reports pending`
              ]}
              actions={isAdmin && planters.length === 0 ? (
                <button
                  onClick={initializeMachines}
                  className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Initialize Inventory
                </button>
              ) : undefined}
            />

            {/* Assignments Summary */}
            {assignments.some(a => a.toUserId === user.uid && a.status === 'pending') && (
              <div className="bg-orange-50 border border-orange-200 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <ArrowUpAZ className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-orange-900">Pending Assignments</h3>
                    <p className="text-sm text-orange-700">You have new machines assigned to you waiting for acceptance.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('assignments')}
                  className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-orange-700 transition-colors"
                >
                  View Assignments
                </button>
              </div>
            )}

            {/* Role-Specific Stats — scoped to current user's machines only */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <DashboardStat
                title={isAdmin || isFarmMech ? "Total Machines" : "My Machines"}
                value={myPlanters.length}
                color="text-blue-600"
                icon={Tractor}
              />
              <DashboardStat
                title="Directly With Me"
                value={planters.filter(p => p.currentHolderId === user.uid).length}
                color="text-green-600"
                icon={UserIcon}
              />
              <DashboardStat
                title="In Maintenance"
                value={myPlanters.filter(p => p.operatingStatus === 'maintenance').length}
                color="text-orange-600"
                icon={Wrench}
              />
              <DashboardStat
                title="Total Area"
                value={`${myPlanters.reduce((acc, p) => acc + calcArea(p.lastReading), 0).toFixed(1)} acres`}
                color="text-purple-600"
                icon={Activity}
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <QuickAction
                title="Fleet Overview"
                desc="View and manage all machines."
                icon={Tractor}
                onClick={() => setActiveTab('fleet')}
              />
              {hasPermission('assign_machines') && (
                <QuickAction
                  title="Assignments"
                  desc="Manage machine transfers."
                  icon={ArrowRight}
                  onClick={() => setActiveTab('assignments')}
                />
              )}
              <QuickAction
                title="Live Map"
                desc="Track machine locations."
                icon={MapIcon}
                onClick={() => setActiveTab('map')}
              />
              {hasPermission('view_reports') && (
                <QuickAction
                  title="Reports"
                  desc="View performance analytics."
                  icon={BarChart3}
                  onClick={() => setActiveTab('reports')}
                />
              )}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left/Main Column */}
              <div className="lg:col-span-2 space-y-8">
                {isOperator && filteredPlanters[0] && (
                  <OperatorMachineCard
                    planter={filteredPlanters[0]}
                    calcArea={calcArea}
                    onUpdate={() => { setSelectedPlanter(filteredPlanters[0]); setActiveTab('fleet'); }}
                    onReport={() => { setSelectedPlanter(filteredPlanters[0]); setShowRequestForm(true); setActiveTab('fleet'); }}
                  />
                )}

                {pendingRepairCompletionRequests.length > 0 && (
                  <div className="bg-blue-50 rounded-[32px] p-8 border border-blue-100 shadow-sm">
                    <h3 className="text-lg font-serif mb-3 text-blue-900">Repair Details Pending From Machine Holder</h3>
                    <p className="text-sm text-blue-700 mb-4">
                      Completed maintenance work is waiting for technician details from the current holder.
                    </p>
                    <div className="space-y-3">
                      {pendingRepairCompletionRequests.slice(0, 3).map(request => (
                        <button
                          key={request.id}
                          onClick={() => {
                            const planter = myPlanters.find(p => p.id === request.planterId);
                            if (planter) {
                              openPlanterDetails(planter);
                              setActiveTab('fleet');
                            }
                          }}
                          className="w-full text-left p-4 bg-white rounded-2xl border border-blue-100 hover:border-blue-200 transition-colors"
                        >
                          <p className="font-bold text-slate-800">{request.planterId}</p>
                          <p className="text-xs text-slate-500 mt-1">Marked done. Add technician repair notes and parts replaced.</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {hasPermission('approve_maintenance') && (
                  <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6 flex items-center justify-between">
                      <span>Maintenance Requests Waiting For Me</span>
                      <span className="text-xs bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold border border-amber-100">{pendingRequestApprovals.length}</span>
                    </h3>
                    <div className="space-y-4">
                      {pendingRequestApprovals.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-8">No maintenance requests are waiting for your approval.</p>
                      ) : (
                        pendingRequestApprovals.map(request => (
                          <div key={request.id}>
                            <MaintenanceRequestCard
                              request={request}
                              onApprove={handleApproveRequest}
                              onReject={handleRejectRequest}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {(isAdmin || isFarmMech) && (
                  <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6 flex items-center justify-between">
                      <span>Maintenance Execution Board</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold border border-blue-100">{actionableMaintenanceRequests.length}</span>
                    </h3>
                    <div className="space-y-4">
                      {actionableMaintenanceRequests.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-8">No approved maintenance requests need execution updates right now.</p>
                      ) : (
                        actionableMaintenanceRequests.map(request => (
                          <div key={request.id}>
                            <MaintenanceRequestCard
                              request={request}
                              onStart={request.status === 'approved' ? handleStartRequestWork : undefined}
                              onComplete={request.status === 'in_progress' ? handleCompleteRequestWork : undefined}
                              onCancel={handleCancelRequest}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {hasPermission('approve_maintenance') && (
                  <ApprovalQueue
                    logs={allMaintenanceLogs.filter(l =>
                      (isAreaManager && l.approvalStatus === 'pending_area_manager') ||
                      (isDistrictManager && l.approvalStatus === 'pending_district_manager') ||
                      (isFarmMech && l.approvalStatus === 'pending_farm_mech')
                    )}
                    onApprove={handleApproveLog}
                    onReject={handleRejectLog}
                  />
                )}

                {isAdmin && (
                  <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6">Fleet Status Distribution</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Operating', value: planters.filter(p => p.operatingStatus === 'operating').length },
                              { name: 'Idle', value: planters.filter(p => p.operatingStatus === 'idle').length },
                              { name: 'Maintenance', value: planters.filter(p => p.operatingStatus === 'maintenance').length },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#10B981" />
                            <Cell fill="#6B7280" />
                            <Cell fill="#F59E0B" />
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {isFacilitator && (
                  <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6">My Assigned Machines</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {sortedPlanters.map(p => (
                        <div key={p.id} onClick={() => { setSelectedPlanter(p); setActiveTab('fleet'); }} className="p-4 bg-[#F5F5F0] rounded-2xl cursor-pointer hover:bg-black/5 transition-colors">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-bold">{p.id}</p>
                            <span className={cn(
                              "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                              p.operatingStatus === 'operating' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                            )}>{p.operatingStatus}</span>
                          </div>
                          <p className="text-xs text-[#5A5A40]/60">{p.location}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                  <h3 className="text-lg font-serif mb-6 flex items-center justify-between">
                    <span>{isOperator ? "My Recent Requests" : "Recent Maintenance Requests"}</span>
                    <button onClick={() => setActiveTab('fleet')} className="text-xs text-blue-600 hover:underline">View All</button>
                  </h3>
                  <div className="space-y-4">
                    {visibleMaintenanceRequests
                      .slice(0, 5)
                      .map(request => (
                        <div key={request.id}>
                          <MaintenanceRequestCard request={request} compact />
                        </div>
                      ))}
                    {visibleMaintenanceRequests.length === 0 && (
                      <div className="p-8 text-center text-[#5A5A40]/40 text-xs italic">
                        No recent requests
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Sidebar Column */}
              <div className="space-y-8">
                {/* Quick Actions */}
                <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                  <h3 className="text-sm font-bold text-[#5A5A40]/40 uppercase tracking-widest mb-6">Quick Actions</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <QuickAction title="Map View" icon={MapIcon} onClick={() => setActiveTab('map')} />
                    <QuickAction title="Fleet View" icon={Activity} onClick={() => setActiveTab('fleet')} />
                    {hasPermission('view_reports') && (
                      <QuickAction title="Reports" icon={FileText} onClick={() => setActiveTab('reports')} />
                    )}
                    {hasPermission('assign_machines') && (
                      <QuickAction title="Assignments" icon={ArrowRight} onClick={() => setActiveTab('assignments')} />
                    )}
                    {canViewHierarchyTab && (
                      <QuickAction title="Hierarchy" icon={Network} onClick={() => setActiveTab('hierarchy')} />
                    )}
                    <QuickAction title="Messages" icon={MessageSquare} onClick={() => setActiveTab('messages')} />
                    {isOperator && filteredPlanters[0] && (
                      <>
                        <QuickAction
                          title="Update Machine"
                          icon={Gauge}
                          onClick={() => {
                            setSelectedPlanter(filteredPlanters[0]);
                            setActiveTab('fleet');
                          }}
                        />
                        <QuickAction
                          title="Report Issue"
                          icon={AlertTriangle}
                          color="text-orange-600"
                          onClick={() => {
                            setSelectedPlanter(filteredPlanters[0]);
                            setShowRequestForm(true);
                            setActiveTab('fleet');
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Notifications Summary */}
                <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                  <h3 className="text-sm font-bold text-[#5A5A40]/40 uppercase tracking-widest mb-6">Recent Alerts</h3>
                  <div className="space-y-4">
                    {notifications.slice(0, 3).map(n => (
                      <div key={n.id} className="flex gap-3 items-start">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          n.type === 'error' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {n.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{n.title}</p>
                          <p className="text-[10px] text-[#5A5A40]/60 line-clamp-2">{n.message}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-xs text-[#5A5A40]/40 italic">No active alerts</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'assignments' ? (
          <div className="space-y-8">
            <h2 className="text-4xl font-serif">Machine Assignments</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Incoming Assignments */}
              <div className="bg-white rounded-[40px] p-8 border border-black/5 shadow-sm">
                <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
                  <ArrowUpAZ className="w-5 h-5 text-blue-600" /> Incoming Assignments
                </h3>
                <div className="space-y-4">
                  {assignments.filter(a => a.toUserId === user.uid && a.status === 'pending').length === 0 ? (
                    <p className="text-sm text-[#5A5A40]/40 italic text-center py-12">No pending assignments for you.</p>
                  ) : (
                    assignments.filter(a => a.toUserId === user.uid && a.status === 'pending').map(a => (
                      <div key={a.id} className="p-6 bg-[#F5F5F0] rounded-[32px] border border-[#5A5A40]/5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-lg font-bold">{a.machineId}</p>
                            <p className="text-xs text-[#5A5A40]/60">From: {allUsers.find(u => u.uid === a.fromUserId)?.displayName} ({a.fromRole.replace(/_/g, ' ')})</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptAssignment(a)}
                              className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRejectAssignment(a)}
                              className="px-4 py-2 bg-white text-red-600 border border-red-100 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-[#5A5A40]/40 uppercase font-bold">{format(new Date(a.timestamp), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Outgoing Assignments */}
              <div className="bg-white rounded-[40px] p-8 border border-black/5 shadow-sm">
                <h3 className="text-xl font-serif mb-6 flex items-center gap-2">
                  <ArrowDownZA className="w-5 h-5 text-purple-600" /> Outgoing Assignments
                </h3>
                <div className="space-y-4">
                  {assignments.filter(a => a.fromUserId === user.uid).length === 0 ? (
                    <p className="text-sm text-[#5A5A40]/40 italic text-center py-12">You haven't assigned any machines yet.</p>
                  ) : (
                    assignments.filter(a => a.fromUserId === user.uid).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(a => (
                      <div key={a.id} className="p-4 border-b border-black/5 last:border-0 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-sm">{a.machineId}</p>
                          <p className="text-[10px] text-[#5A5A40]/60">To: {allUsers.find(u => u.uid === a.toUserId)?.displayName} ({a.toRole.replace(/_/g, ' ')})</p>
                        </div>
                        <div className="text-right">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            a.status === 'accepted' ? "bg-green-100 text-green-600" :
                              a.status === 'rejected' ? "bg-red-100 text-red-600" :
                                "bg-orange-100 text-orange-600"
                          )}>
                            {a.status}
                          </span>
                          <p className="text-[9px] text-[#5A5A40]/40 mt-1">{format(new Date(a.timestamp), 'MMM d')}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'map' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif mb-2">Fleet Map</h2>
                <p className="text-[#5A5A40]/60">Real-time geographical distribution of all machines.</p>
              </div>
            </div>
            <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden h-[600px] relative">
              <MapView planters={filteredPlanters} onSelect={setSelectedPlanter} allUsers={allUsers} />
            </div>
          </div>
        ) : activeTab === 'reports' ? (
          <div className="space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-serif mb-2">Activity Reports</h2>
                <p className="text-[#5A5A40]/60">Performance summary across the fleet.</p>
              </div>
              <div className="flex bg-white p-1 rounded-xl border border-black/5">
                {(['daily', 'weekly', 'monthly'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={cn(
                      "px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all",
                      reportPeriod === p ? "bg-[#5A5A40] text-white" : "text-[#5A5A40]/60 hover:bg-black/5"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {isReportLoading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#5A5A40]" />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Total Area</p>
                    <p className="text-4xl font-serif text-[#5A5A40]">{reportData.totalArea.toFixed(1)}</p>
                    <p className="text-xs text-[#5A5A40]/60 mt-1">Acres worked</p>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Total Distance</p>
                    <p className="text-4xl font-serif text-[#5A5A40]">{reportData.totalDistance.toFixed(1)}</p>
                    <p className="text-xs text-[#5A5A40]/60 mt-1">Kilometers equivalent</p>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Updates</p>
                    <p className="text-4xl font-serif text-[#5A5A40]">{reportData.updateCount}</p>
                    <p className="text-xs text-[#5A5A40]/60 mt-1">Reading submissions</p>
                  </div>

                  <div className="md:col-span-3 bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6">Top Performing Machines</h3>
                    <div className="space-y-4">
                      {reportData.topPlanters.map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-[#F5F5F0] rounded-lg flex items-center justify-center text-xs font-bold text-[#5A5A40]">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium">{p.id}</span>
                              <span className="text-sm font-mono">{p.area.toFixed(1)} acres</span>
                            </div>
                            <div className="h-2 bg-[#F5F5F0] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#5A5A40]"
                                style={{ width: `${(p.area / (reportData.topPlanters[0]?.area || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-[#5A5A40] text-white p-8 rounded-[32px] shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-serif mb-4">Efficiency Insight</h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                      Based on the {reportPeriod} data, your fleet is averaging {(reportData.totalArea / (reportData.updateCount || 1)).toFixed(2)} acres per update.
                      {reportData.totalArea > 100 ? " High productivity detected in the field." : " Steady progress maintained."}
                    </p>
                  </div>
                  <div className="pt-8 border-t border-white/10 mt-8">
                    <p className="text-[10px] uppercase font-bold opacity-40 mb-2">Fleet Utilization</p>
                    <div className="flex items-end gap-1 h-20">
                      {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/20 rounded-t-sm" style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : planters.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[32px] border border-black/5">
            <AlertCircle className="w-12 h-12 text-[#5A5A40]/30 mx-auto mb-4" />
            <h2 className="text-xl font-serif mb-2">No machines found</h2>
            <p className="text-[#5A5A40]/60 mb-6">
              {hasPermission('initialize_fleet') ? "Initialize the fleet to get started." : "Waiting for administrator to initialize fleet."}
            </p>
            {hasPermission('initialize_fleet') && (
              <button
                onClick={initializeMachines}
                className="bg-[#5A5A40] text-white px-8 py-3 rounded-full hover:bg-[#4A4A30] transition-colors"
              >
                Initialize 200 Machines
              </button>
            )}
          </div>
        ) : activeTab === 'settings' && canAccessSettingsTab ? (
          <div className="space-y-12">
            <PageBanner
              eyebrow="Settings Workspace"
              title={isAdmin ? 'System Controls & Data Tools' : 'Hierarchy Management Controls'}
              description={
                isAdmin
                  ? 'Tune machine calculations, verify storage routing, export operational data, and configure how every role uses the platform.'
                  : 'Manage your reporting branch, refine user territory details, and keep the field hierarchy ready for transfers and approvals.'
              }
              icon={Settings}
              badges={[
                isAdmin ? 'Admin surface' : 'Manager surface',
                canManageUsers ? 'User management enabled' : 'Read only',
                sheetInfo?.spreadsheetUrl ? 'Sheets sync detected' : 'Sheets sync offline'
              ]}
            />

            {/* ── Calculation Settings ── */}
            {isAdmin && (
            <div>
              <div className="mb-6">
                <h2 className="text-3xl font-serif mb-2">Machine Calculation Settings</h2>
                <p className="text-[#5A5A40]/60">These values are used to calculate distance covered and area planted from the rev counter readings.</p>
              </div>

              <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                {/* Diagram / explanation */}
                <div className="mb-8 p-5 bg-amber-50 border border-amber-200/60 rounded-2xl">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">How It Works</p>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    The <strong>rev counter</strong> on the shaft counts revolutions. Each shaft revolution = <strong>(Shaft Teeth ÷ Drive Teeth) × Wheel Circumference</strong> meters of ground covered. Area = Distance × Machine Width.
                  </p>
                  <p className="text-xs text-amber-600 mt-2 font-mono">
                    1 shaft rev = ({machineConfig.shaftTeeth} ÷ {machineConfig.driveTeeth}) × {machineConfig.wheelCircumference}m = {((machineConfig.shaftTeeth / machineConfig.driveTeeth) * machineConfig.wheelCircumference).toFixed(4)}m per rev
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Wheel Circumference */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2 block">Drive Wheel Circumference (m)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={machineConfig.wheelCircumference}
                        onChange={e => setMachineConfig(c => ({ ...c, wheelCircumference: parseFloat(e.target.value) || c.wheelCircumference }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#5A5A40]/40 font-bold">m</span>
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/40 mt-1">π × wheel diameter</p>
                  </div>

                  {/* Drive Sprocket Teeth */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2 block">Drive Wheel Sprocket (teeth)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={machineConfig.driveTeeth}
                        onChange={e => setMachineConfig(c => ({ ...c, driveTeeth: parseInt(e.target.value) || c.driveTeeth }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#5A5A40]/40 font-bold">T</span>
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/40 mt-1">Gear on the drive wheel</p>
                  </div>

                  {/* Shaft Sprocket Teeth */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2 block">Shaft Sprocket (teeth)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={machineConfig.shaftTeeth}
                        onChange={e => setMachineConfig(c => ({ ...c, shaftTeeth: parseInt(e.target.value) || c.shaftTeeth }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#5A5A40]/40 font-bold">T</span>
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/40 mt-1">Gear on shaft → rev counter</p>
                  </div>

                  {/* Machine Width */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/50 mb-2 block">Machine Width (m)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        value={machineConfig.machineWidth}
                        onChange={e => setMachineConfig(c => ({ ...c, machineWidth: parseFloat(e.target.value) || c.machineWidth }))}
                        className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#5A5A40]/40 font-bold">m</span>
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/40 mt-1">Working width of the planter</p>
                  </div>
                </div>

                {/* Live preview */}
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200/60 rounded-2xl flex flex-wrap gap-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider mb-0.5">Distance per 1000 revs</p>
                    <p className="text-lg font-mono font-bold text-emerald-800">{calcDist(1000).toFixed(3)} km</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider mb-0.5">Area per 1000 revs</p>
                    <p className="text-lg font-mono font-bold text-emerald-800">{calcArea(1000).toFixed(3)} acres</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-emerald-700 tracking-wider mb-0.5">Gear Ratio</p>
                    <p className="text-lg font-mono font-bold text-emerald-800">{machineConfig.shaftTeeth}:{machineConfig.driveTeeth} = {(machineConfig.shaftTeeth / machineConfig.driveTeeth).toFixed(4)}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <button
                    onClick={() => saveConfig(machineConfig)}
                    disabled={configSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60"
                  >
                    {configSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {configSaving ? 'Saving...' : 'Save Settings'}
                  </button>
                  {configSaved && <p className="text-sm text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved successfully!</p>}
                  <button
                    onClick={() => setMachineConfig({ wheelCircumference: 2, driveTeeth: 19, shaftTeeth: 14, machineWidth: 2.2 })}
                    className="text-xs text-[#5A5A40]/50 hover:text-[#5A5A40] underline underline-offset-2 transition-colors"
                  >
                    Reset to defaults
                  </button>
                </div>
              </div>
            </div>
            )}

            {isAdmin && (
            <div>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-serif mb-2">Storage & Downloads</h2>
                  <p className="text-[#5A5A40]/60">Check where machine photos are being stored and export the operational data directly from the admin panel.</p>
                </div>
                <button
                  onClick={() => void refreshAdminStoragePanel()}
                  disabled={sheetInfoLoading}
                  className="px-4 py-2 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-xs font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                >
                  {sheetInfoLoading ? 'Checking...' : 'Refresh Status'}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif">Photo Storage Route</h3>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-3 py-1 rounded-full",
                      sheetInfo?.spreadsheetUrl ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    )}>
                      {sheetInfo?.spreadsheetUrl ? 'Drive Connected' : 'Fallback Mode'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-2">Configured Upload Path</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {sheetInfo?.spreadsheetUrl ? 'Google Drive first, Firebase Storage fallback' : 'Firebase Storage fallback only'}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F5F5F0] rounded-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-2">Latest Proof Photo Source</p>
                      <p className="text-sm font-semibold text-slate-800">{latestProofSource}</p>
                      {latestProofTimestamp && (
                        <p className="text-[10px] text-[#5A5A40]/40 mt-1">{format(new Date(latestProofTimestamp), 'MMM d, HH:mm')}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl border border-black/5 bg-slate-50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-2">Sheets Sync</p>
                    {sheetInfo?.spreadsheetUrl ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-700">Google Sheets sync is active. Reading updates, users, machines, maintenance records, and other synced collections are being mirrored there.</p>
                        <div className="flex flex-wrap gap-3">
                          <a
                            href={sheetInfo.spreadsheetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                          >
                            Open Google Sheet
                          </a>
                          <span className="text-[10px] text-[#5A5A40]/40 font-mono break-all">{sheetInfo.spreadsheetId}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-amber-700">{sheetInfoError || 'Sheets sync backend is not available yet.'}</p>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm space-y-5">
                  <div>
                    <h3 className="text-xl font-serif mb-2">Data Downloads</h3>
                    <p className="text-sm text-[#5A5A40]/60">Export the current database contents for reporting, backup, or offline review.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => void downloadAdminData('json', 'backup')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isDownloadingData ? 'Preparing...' : 'Download Full Backup JSON'}
                    </button>
                    <button
                      onClick={() => void downloadAdminData('csv', 'backup')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                    >
                      {isDownloadingData ? 'Preparing...' : 'Download Full Backup CSV'}
                    </button>
                    <button
                      onClick={() => void downloadAdminData('csv', 'machines')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                    >
                      Machines CSV
                    </button>
                    <button
                      onClick={() => void downloadAdminData('csv', 'users')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                    >
                      Users CSV
                    </button>
                    <button
                      onClick={() => void downloadAdminData('csv', 'updates')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                    >
                      Updates CSV
                    </button>
                    <button
                      onClick={() => void downloadAdminData('csv', 'maintenance')}
                      disabled={isDownloadingData}
                      className="px-4 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors disabled:opacity-50"
                    >
                      Maintenance CSV
                    </button>
                  </div>

                  <p className="text-[10px] text-[#5A5A40]/40">
                    Update photos are saved by URL in the data exports. The image binary stays in Google Drive or Firebase Storage depending on the active upload route.
                  </p>
                </div>
              </div>
            </div>
            )}

            {/* ── Role Permissions ── */}
            {isAdmin && (
            <div>
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-3xl font-serif mb-2">Role Permissions</h2>
                  <p className="text-[#5A5A40]/60">Define granular access for each user role.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(['district_manager', 'area_manager', 'community_facilitator', 'operator', 'farm_mechanization'] as UserRole[]).map(role => (
                <div key={role} className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                  <h3 className="text-xl font-serif mb-6 capitalize">{role.replace(/_/g, ' ')}</h3>
                  <div className="space-y-3">
                    {(['assign_machines', 'view_reports', 'perform_maintenance', 'approve_maintenance', 'update_readings', 'manage_users', 'initialize_fleet', 'edit_machine_metadata'] as Permission[]).map(perm => (
                      <label key={perm} className="flex items-center gap-3 p-3 bg-[#F5F5F0] rounded-xl cursor-pointer hover:bg-black/5 transition-colors">
                        <input
                          type="checkbox"
                          checked={rolePermissions[role]?.includes(perm)}
                          onChange={async (e) => {
                            const current = rolePermissions[role] || [];
                            const next = e.target.checked
                              ? [...current, perm]
                              : current.filter(p => p !== perm);

                            await setDoc(doc(db, 'role_permissions', role), {
                              allowedActions: next
                            });
                            void syncFirestoreDocument('role_permissions', role);
                          }}
                          className="w-4 h-4 rounded border-black/20 text-[#5A5A40] focus:ring-[#5A5A40]/20"
                        />
                        <span className="text-xs font-medium capitalize">{perm.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
            )}

            {canManageUsers && (
              <div className="mt-12 space-y-8">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-serif mb-2">User Management</h2>
                    <p className="text-[#5A5A40]/60">
                      {isAdmin || isFarmMech
                        ? 'Add users so they can receive machine transfers. They sign in with Google later.'
                        : 'Manage the users inside your reporting branch, update their territory details, and keep the hierarchy current.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowAddUserForm(v => {
                        const next = !v;
                        if (next) {
                          resetUserForm(manageableRoleOptions[0] || 'operator');
                        } else {
                          resetUserForm();
                        }
                        return next;
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>

                {showAddUserForm && (
                  <div className="bg-white rounded-[24px] p-8 border border-black/5 shadow-sm">
                    <h3 className="text-lg font-serif mb-6">{editingUserId ? 'Edit User Profile' : 'Add New User'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Full Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Ravi Kumar"
                          value={addUserForm.displayName}
                          onChange={e => setAddUserForm(f => ({ ...f, displayName: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Google Email *</label>
                        <input
                          type="email"
                          placeholder="user@gmail.com"
                          value={addUserForm.email}
                          onChange={e => setAddUserForm(f => ({ ...f, email: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Role *</label>
                        <select
                          value={addUserForm.role}
                          onChange={e => {
                            const nextRole = e.target.value as UserRole;
                            setAddUserForm(f => ({
                              ...f,
                              role: nextRole,
                              parentId: getSuggestedParentId(nextRole, editingUserId, f.parentId)
                            }));
                          }}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        >
                          {manageableRoleOptions.map(role => (
                            <option key={role} value={role}>
                              {role.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Reports To (Manager)</label>
                        <select
                          value={addUserForm.parentId}
                          onChange={e => setAddUserForm(f => ({ ...f, parentId: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        >
                          {(isAdmin || isFarmMech) && <option value="">None (Top Level)</option>}
                          {managerOptionsForForm.map(manager => (
                            <option key={manager.uid} value={manager.uid}>
                              {manager.displayName} ({manager.role.replace(/_/g, ' ')})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 pt-4 border-t border-black/5">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">State</label>
                        <input
                          type="text"
                          placeholder="e.g. Telangana"
                          value={addUserForm.assignedState}
                          onChange={e => setAddUserForm(f => ({ ...f, assignedState: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">District</label>
                        <input
                          type="text"
                          placeholder="e.g. Rangareddy"
                          value={addUserForm.assignedDistrict}
                          onChange={e => setAddUserForm(f => ({ ...f, assignedDistrict: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Mandal</label>
                        <input
                          type="text"
                          placeholder="e.g. Shamshabad"
                          value={addUserForm.assignedMandal}
                          onChange={e => setAddUserForm(f => ({ ...f, assignedMandal: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]/40 mb-1.5 block">Area / Village</label>
                        <input
                          type="text"
                          placeholder="e.g. Oachpally"
                          value={addUserForm.assignedArea}
                          onChange={e => setAddUserForm(f => ({ ...f, assignedArea: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#F5F5F0] rounded-xl border-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
                        />
                      </div>
                    </div>
                    {addUserError && (
                      <p className="text-sm text-red-600 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> {addUserError}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={handleAddUser}
                        disabled={addUserLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {addUserLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingUserId ? <UserIcon className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
                        {addUserLoading ? (editingUserId ? 'Updating...' : 'Adding...') : (editingUserId ? 'Save Changes' : 'Add User')}
                      </button>
                      <button
                        onClick={() => { setShowAddUserForm(false); resetUserForm(); }}
                        className="px-6 py-3 bg-[#F5F5F0] text-[#5A5A40] rounded-xl text-sm font-bold hover:bg-black/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-[10px] text-[#5A5A40]/40 mt-4">
                      💡 The user will appear immediately as a recipient for machine transfers. When they sign in with Google using this email, their profile will be linked automatically.
                    </p>
                  </div>
                )}

                <div className="mt-4">
                  <OrganizationTree 
                    allUsers={managedTreeUsers} 
                    planters={planters} 
                    canManageUser={canManageUserRecord}
                    onEdit={(u) => {
                       if (!canManageUserRecord(u)) return;
                       setAddUserForm({
                          displayName: u.displayName || '',
                          email: u.email || '',
                          role: u.role || 'operator',
                          assignedState: u.assignedState || '',
                          assignedDistrict: u.assignedDistrict || '',
                          assignedMandal: u.assignedMandal || '',
                          assignedArea: u.assignedArea || '',
                          parentId: getSuggestedParentId(u.role || 'operator', u.uid, u.parentId || '')
                       });
                       setEditingUserId(u.uid);
                       setAddUserError(null);
                       setShowAddUserForm(true);
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onDelete={async (u) => {
                       if (!canManageUserRecord(u)) return;
                       if (confirm(`Are you sure you want to remove ${u.displayName} from the organization?`)) {
                          await deleteDoc(doc(db, 'users', u.uid));
                          void deleteSheetDocument('users', u.uid);
                       }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'hierarchy' && canViewHierarchyTab ? (
          <div className="space-y-6">
            <PageBanner
              eyebrow="Hierarchy View"
              title={isAdmin || isFarmMech ? 'Global Machine Hierarchy' : 'My Machine Hierarchy'}
              description={
                isAdmin || isFarmMech
                  ? 'View the entire organization tree, machine ownership flow, and team-wide distribution from one structured map.'
                  : 'See your reporting hierarchy, machine counts, and the live status of every machine inside your operational scope.'
              }
              icon={Network}
              badges={[
                `${scopedUsers.length} users visible`,
                `${myPlanters.length} machines tracked`,
                canManageUsers ? 'Inline edits available' : 'View only'
              ]}
            />
            <OrganizationTree 
              allUsers={scopedUsers} 
              planters={myPlanters} 
              onEdit={(u) => {
                 if (!canManageUserRecord(u)) return;
                 setAddUserForm({
                    displayName: u.displayName || '',
                    email: u.email || '',
                    role: u.role || 'operator',
                    assignedState: u.assignedState || '',
                    assignedDistrict: u.assignedDistrict || '',
                    assignedMandal: u.assignedMandal || '',
                    assignedArea: u.assignedArea || '',
                    parentId: getSuggestedParentId(u.role || 'operator', u.uid, u.parentId || '')
                 });
                 setEditingUserId(u.uid);
                 setAddUserError(null);
                 setShowAddUserForm(true);
                 setActiveTab('settings');
                 window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onDelete={async (u) => {
                 if (!canManageUserRecord(u)) return;
                 if (confirm(`Are you sure you want to remove ${u.displayName} from the organization?`)) {
                    await deleteDoc(doc(db, 'users', u.uid));
                    void deleteSheetDocument('users', u.uid);
                 }
              }}
              canManageUser={canManageUsers ? canManageUserRecord : () => false}
            />
          </div>
        ) : activeTab === 'messages' ? (
          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden flex h-[700px]">
            <div className="w-1/3 border-r border-black/5 flex flex-col bg-[#F5F5F0]/50">
              <div className="p-6 border-b border-black/5 bg-white">
                <h3 className="text-lg font-serif">Internal Directory</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {allUsers.filter(u => u.uid !== user?.uid).map(u => {
                   const unread = messages.filter(m => m.senderId === u.uid && m.receiverId === user?.uid && !m.read).length;
                   return (
                     <button
                       key={u.uid}
                       onClick={() => setSelectedChatUserId(u.uid)}
                       className={cn("w-full text-left p-4 hover:bg-black/5 border-b border-black/5 transition-colors flex items-center justify-between", selectedChatUserId === u.uid && "bg-emerald-50 hover:bg-emerald-50")}
                     >
                       <div>
                         <p className="font-bold text-sm text-slate-800">{u.displayName}</p>
                         <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">{u.role.replace(/_/g, ' ')}</p>
                       </div>
                       {unread > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unread}</span>}
                     </button>
                   );
                })}
              </div>
            </div>
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {selectedChatUserId ? (
                <>
                  <div className="p-6 border-b border-black/5 shadow-sm z-10 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">{allUsers.find(u => u.uid === selectedChatUserId)?.displayName}</h3>
                      <p className="text-xs text-slate-500 uppercase font-bold mt-1">{allUsers.find(u => u.uid === selectedChatUserId)?.role.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col">
                    {messages
                      .filter(m => (m.senderId === user?.uid && m.receiverId === selectedChatUserId) || (m.senderId === selectedChatUserId && m.receiverId === user?.uid))
                      .sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                      .map(m => {
                        const isMine = m.senderId === user?.uid;
                        if (!isMine && !m.read) {
                           // Mark as read optionally using updateDoc here or externally
                           updateDoc(doc(db, 'messages', m.id), { read: true }).catch(()=>{});
                        }
                        return (
                          <div key={m.id} className={cn("max-w-[70%] p-4 rounded-2xl relative", isMine ? "self-end bg-emerald-600 text-white rounded-br-sm" : "self-start bg-[#F5F5F0] text-slate-800 rounded-bl-sm")}>
                            <p className="text-sm">{m.content}</p>
                            <p className={cn("text-[8px] mt-2 font-bold uppercase tracking-wider opacity-60", isMine ? "text-emerald-100 text-right" : "text-slate-400")}>
                               {new Date(m.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        )
                      })}
                  </div>
                  <div className="p-4 border-t border-black/5 bg-[#F5F5F0] flex gap-2">
                    <input 
                      type="text" 
                      value={chatMessageText}
                      onChange={e => setChatMessageText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && chatMessageText.trim() && user?.uid && selectedChatUserId) {
                           // Send message
                           addDoc(collection(db, 'messages'), {
                              senderId: user.uid,
                              receiverId: selectedChatUserId,
                              content: chatMessageText.trim(),
                              timestamp: new Date().toISOString(),
                              read: false
                           });
                           setChatMessageText('');
                        }
                      }}
                      placeholder="Type a message..."
                      className="flex-1 p-4 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 bg-white shadow-sm text-sm"
                    />
                    <button 
                      onClick={() => {
                        if (chatMessageText.trim() && user?.uid && selectedChatUserId) {
                           addDoc(collection(db, 'messages'), {
                              senderId: user.uid,
                              receiverId: selectedChatUserId,
                              content: chatMessageText.trim(),
                              timestamp: new Date().toISOString(),
                              read: false
                           });
                           setChatMessageText('');
                        }
                      }}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-emerald-700 transition"
                    >
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <MessageSquare className="w-16 h-16 opacity-20 mb-4" />
                  <p>Select a user from the directory to start messaging</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar / Filters */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5A5A40]/60 mb-4">Search</h3>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600/60 group-focus-within:text-emerald-600 transition-colors" />
                  <input
                    type="text"
                    placeholder="Machine ID or Incharge..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-5 py-3 bg-[#F5F5F0]/80 rounded-full border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 text-sm transition-all shadow-sm group-focus-within:shadow-md"
                  />
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5A5A40]/60 mb-4">Filters</h3>

                <div className="space-y-6">
                  <div>
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Mandal</p>
                    <select
                      value={filterMandal}
                      onChange={(e) => setFilterMandal(e.target.value)}
                      className="w-full bg-[#F5F5F0] hover:bg-[#EAEAEA] rounded-xl border border-transparent hover:border-slate-300 text-sm p-2.5 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      {mandals.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">District</p>
                    <select
                      value={filterDistrict}
                      onChange={(e) => setFilterDistrict(e.target.value)}
                      className="w-full bg-[#F5F5F0] hover:bg-[#EAEAEA] rounded-xl border border-transparent hover:border-slate-300 text-sm p-2.5 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      {districts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Facilitator</p>
                    <select
                      value={filterFacilitator}
                      onChange={(e) => setFilterFacilitator(e.target.value)}
                      className="w-full bg-[#F5F5F0] hover:bg-[#EAEAEA] rounded-xl border border-transparent hover:border-slate-300 text-sm p-2.5 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      {facilitators.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-2">Sort By</p>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="flex-1 bg-[#F5F5F0] hover:bg-[#EAEAEA] rounded-xl border border-transparent hover:border-slate-300 text-sm p-2.5 transition-all outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                      >
                        <option value="id">Machine ID</option>
                        <option value="location">Village</option>
                        <option value="mandal">Mandal</option>
                        <option value="district">District</option>
                        <option value="state">State</option>
                        <option value="operatingStatus">Status</option>
                        <option value="currentHolderId">Holder</option>
                        <option value="lastReading">Last Reading</option>
                      </select>
                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-3 bg-[#F5F5F0] hover:bg-[#EAEAEA] rounded-xl border border-transparent hover:border-slate-300 transition-all text-[#5A5A40] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 flex items-center justify-center cursor-pointer"
                        title={sortOrder === 'asc' ? "Sort Ascending" : "Sort Descending"}
                      >
                        {sortOrder === 'asc' ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowDownZA className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[24px] p-6 border border-black/5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#5A5A40]/60 mb-4">Fleet Status</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => <span className="text-[10px] uppercase font-bold text-[#5A5A40]/60">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-[24px] p-6 shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700" />
                <h3 className="text-sm font-medium opacity-80 mb-1 relative z-10">Total Area Covered</h3>
                <p className="text-4xl font-serif mb-4 relative z-10 flex items-baseline gap-2">
                  {myPlanters.reduce((acc, p) => acc + calcArea(p.lastReading), 0).toFixed(1)} <span className="text-sm font-sans font-medium opacity-80">acres</span>
                </p>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden relative z-10">
                  <div className="h-full bg-white w-2/3 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      const visibleIds = [...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].map(p => p.id);
                      if (visibleIds.every(id => selectedMachineIds.includes(id))) {
                        setSelectedMachineIds(prev => prev.filter(id => !visibleIds.includes(id)));
                      } else {
                        setSelectedMachineIds(prev => Array.from(new Set([...prev, ...visibleIds])));
                      }
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-2.5 transition-colors group"
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all",
                      [...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].length > 0 && [...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].every(p => selectedMachineIds.includes(p.id)) ? "bg-emerald-500 border-emerald-500 shadow-sm" : "border-slate-300 group-hover:border-emerald-500"
                    )}>
                      {[...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].length > 0 && [...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].every(p => selectedMachineIds.includes(p.id)) && <Check className="w-3 h-3 text-white" />}
                      {selectedMachineIds.length > 0 && !([...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].every(p => selectedMachineIds.includes(p.id))) && <div className="w-2 h-0.5 bg-emerald-500" />}
                    </div>
                    {[...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].length > 0 && [...fleetMachineData.paginatedAssigned, ...fleetMachineData.paginatedUnassigned].every(p => selectedMachineIds.includes(p.id)) ? 'Deselect Page' : 'Select Page'}
                  </button>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    {filteredPlanters.length} <span className="font-medium">Machines Total</span>
                  </span>
                </div>
                {hasPermission('initialize_fleet') && (
                  <button
                    onClick={() => setShowAddMachineModal(true)}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600/10 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-colors border border-emerald-500/20 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Register Machine
                  </button>
                )}
              </div>

              {selectedMachineIds.length > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-6 py-3.5 rounded-full shadow-2xl flex items-center gap-6 border border-slate-700/50 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2.5 border-r border-slate-700 pr-6">
                    <div className="w-7 h-7 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold text-sm">
                      {selectedMachineIds.length}
                    </div>
                    <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">Selected</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasPermission('assign_machines') && (
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex items-center gap-2 px-5 py-2 bg-emerald-500 text-white rounded-full text-xs font-bold hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        <ArrowRight className="w-4 h-4" /> Bulk Transfer
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedMachineIds([])}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}

              {(() => {
                const { assignedPlanters, unassignedPlanters, totalAssignedPages, totalUnassignedPages, paginatedAssigned, paginatedUnassigned } = fleetMachineData;

                const containerVariants = {
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                };

                const itemVariants = {
                  hidden: { opacity: 0, scale: 0.95, y: 20 },
                  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
                };

                const MachineCard = ({ planter }: { planter: typeof sortedPlanters[0]; key?: string }) => {
                  const isOperating = planter.operatingStatus === 'operating';
                  const isMaintenance = planter.operatingStatus === 'maintenance';
                  return (
                    <motion.div
                      variants={itemVariants}
                      key={planter.id}
                      className={cn(
                        "bg-white rounded-[24px] p-6 border transition-all text-left group relative hover:-translate-y-1 hover:shadow-xl duration-300",
                        selectedMachineIds.includes(planter.id) ? "border-emerald-500 ring-4 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-500/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-5">
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMachineIds(prev =>
                                prev.includes(planter.id)
                                  ? prev.filter(id => id !== planter.id)
                                  : [...prev, planter.id]
                              );
                            }}
                            className={cn(
                              "w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-colors shadow-sm",
                              selectedMachineIds.includes(planter.id) ? "bg-emerald-500 border-emerald-500" : "bg-[#F5F5F0] border-slate-300 hover:border-emerald-500 hover:bg-emerald-50"
                            )}
                          >
                            {selectedMachineIds.includes(planter.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div
                            onClick={() => openPlanterDetails(planter)}
                            className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors cursor-pointer shadow-sm relative overflow-hidden",
                              isOperating ? "bg-emerald-50 text-emerald-600" : isMaintenance ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-500"
                            )}
                          >
                            <Tractor className="w-6 h-6 relative z-10" />
                          </div>
                        </div>
                        <span className={cn(
                          "relative text-[9px] uppercase font-bold px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1.5",
                          isOperating ? "bg-emerald-100 text-emerald-800" :
                            isMaintenance ? "bg-orange-100 text-orange-800" :
                              "bg-gray-100 text-gray-800"
                        )}>
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isOperating ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
                            isMaintenance ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "bg-slate-400"
                          )}/>
                          {planter.operatingStatus}
                        </span>
                      </div>

                      <div onClick={() => openPlanterDetails(planter)} className="cursor-pointer">
                        <h3 className="text-2xl font-serif text-slate-800 mb-1.5 truncate group-hover:text-emerald-700 transition-colors">{planter.id}</h3>
                        <div className="space-y-1.5 mb-5">
                          <p className="text-xs text-slate-500 flex items-center gap-2 font-medium">
                            <UserIcon className="w-3.5 h-3.5 opacity-70" /> {allUsers.find(u => u.uid === planter.currentHolderId)?.displayName || 'Unassigned'}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                            <MapPin className="w-3.5 h-3.5 opacity-70" /> {[planter.mandal, planter.district].filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100/80">
                          <div>
                            <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest mb-1">Reading</p>
                            <p className="text-sm font-mono font-bold text-slate-700">{planter.lastReading.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase text-slate-400 font-bold tracking-widest mb-1">Area</p>
                            <p className="text-sm font-mono font-bold text-emerald-600">{calcArea(planter.lastReading).toFixed(1)} <span className="text-[10px] text-slate-400 font-sans tracking-normal">acres</span></p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                };

                return (
                  <div className="space-y-8">
                    {/* Assigned Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        <h3 className="text-base font-bold tracking-wide text-slate-800">Allocated Fleet</h3>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full shadow-sm">{assignedPlanters.length}</span>
                      </div>
                      {assignedPlanters.length === 0 ? (
                        <div className="bg-white rounded-[20px] border border-dashed border-black/10 p-8 text-center">
                          <p className="text-sm text-[#5A5A40]/40 italic">No machines assigned yet. Transfer machines to users to see them here.</p>
                        </div>
                      ) : (
                        <>
                          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {paginatedAssigned.map(planter => <MachineCard key={planter.id} planter={planter} />)}
                          </motion.div>
                          {totalAssignedPages > 1 && (
                            <div className="flex justify-between items-center mt-6 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm col-span-full">
                              <button disabled={assignedPage === 1} onClick={() => setAssignedPage(p => Math.max(1, p - 1))} className="px-4 py-2 font-bold text-sm text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-500 flex items-center gap-2 transition-colors">
                                <ChevronRight className="w-4 h-4 rotate-180" /> Prev
                              </button>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Page {assignedPage} of {totalAssignedPages}</span>
                              <button disabled={assignedPage === totalAssignedPages} onClick={() => setAssignedPage(p => Math.min(totalAssignedPages, p + 1))} className="px-4 py-2 font-bold text-sm text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-500 flex items-center gap-2 transition-colors">
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Unassigned Section */}
                    <div>
                      <div className="flex items-center gap-3 mb-6 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-slate-400" />
                        <h3 className="text-base font-bold tracking-wide text-slate-800">Available / Unassigned</h3>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full shadow-sm">{unassignedPlanters.length}</span>
                        {unassignedPlanters.length > 0 && hasPermission('assign_machines') && (
                          <button
                            onClick={() => {
                              const ids = paginatedUnassigned.map(p => p.id);
                              setSelectedMachineIds(prev => Array.from(new Set([...prev, ...ids])));
                            }}
                            className="ml-auto text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100"
                          >
                            Select Page
                          </button>
                        )}
                      </div>
                      {unassignedPlanters.length === 0 ? (
                        <div className="bg-white rounded-[20px] border border-dashed border-black/10 p-8 text-center">
                          <p className="text-sm text-[#5A5A40]/40 italic">All machines are assigned.</p>
                        </div>
                      ) : (
                        <>
                          <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {paginatedUnassigned.map(planter => <MachineCard key={planter.id} planter={planter} />)}
                          </motion.div>
                          {totalUnassignedPages > 1 && (
                            <div className="flex justify-between items-center mt-6 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm col-span-full">
                              <button disabled={unassignedPage === 1} onClick={() => setUnassignedPage(p => Math.max(1, p - 1))} className="px-4 py-2 font-bold text-sm text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-500 flex items-center gap-2 transition-colors">
                                <ChevronRight className="w-4 h-4 rotate-180" /> Prev
                              </button>
                              <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Page {unassignedPage} of {totalUnassignedPages}</span>
                              <button disabled={unassignedPage === totalUnassignedPages} onClick={() => setUnassignedPage(p => Math.min(totalUnassignedPages, p + 1))} className="px-4 py-2 font-bold text-sm text-slate-500 hover:text-emerald-600 disabled:opacity-30 disabled:hover:text-slate-500 flex items-center gap-2 transition-colors">
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </main>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedPlanter && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!showTransferModal) closePlanterDetails(); }}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              key={selectedPlanter.id}
              initial={{ opacity: 0, scale: 0.98, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 16 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl bg-[#F5F5F0] rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="bg-white p-8 border-b border-black/5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-serif">{selectedPlanter.id}</h2>
                    <span className="bg-[#5A5A40]/10 text-[#5A5A40] text-xs font-bold px-3 py-1 rounded-full uppercase">
                      {selectedPlanter.mandal} • {selectedPlanter.district}
                    </span>
                  </div>
                  <p className="text-[#5A5A40]/60 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> {selectedPlanter.location}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {(selectedPlanter.currentHolderId === user.uid || hasPermission('assign_machines')) && (
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <ArrowRight className="w-4 h-4" /> Transfer Machine
                    </button>
                  )}
                  <button
                    onClick={closePlanterDetails}
                    className="w-12 h-12 bg-[#F5F5F0] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6 rotate-180" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left: Update Form & Gallery */}
                  <div className="space-y-8">
                    {canManagePlanterMetadata(selectedPlanter) && (
                      <div id="machine-management-section" className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                        <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                          <Settings className="w-5 h-5" /> Machine Management
                        </h3>
                        <div key={`${selectedPlanter.id}-details`}>
                          <MachineDetailsForm
                            planter={selectedPlanter}
                            onSuccess={closePlanterDetails}
                            createNotification={createNotification}
                          />
                        </div>
                      </div>
                    )}

                    {(hasPermission('update_readings') || selectedPlanter.currentHolderId === user.uid) && (
                      <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                        <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                          <Gauge className="w-5 h-5" /> Update Reading
                        </h3>

                        <div key={`${selectedPlanter.id}-update`}>
                          <UpdateForm
                            planter={selectedPlanter}
                            user={user}
                            machineConfig={machineConfig}
                            onSuccess={closePlanterDetails}
                          />
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                      <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                        <ImageIcon className="w-5 h-5" /> Machine Gallery
                      </h3>
                      <GallerySection
                        planter={selectedPlanter}
                        onUpload={async (url) => {
                          await updateDoc(doc(db, 'planters', selectedPlanter.id), {
                            gallery: arrayUnion(url)
                          });
                          void syncFirestoreDocument('planters', selectedPlanter.id);
                        }}
                      />
                    </div>

                    {selectedPlanterPendingRepairRequest && selectedPlanter.currentHolderId === user?.uid && (
                      <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                        <h3 className="text-lg font-serif mb-2 flex items-center gap-2">
                          <Wrench className="w-5 h-5" /> Repair Completion Report
                        </h3>
                        <p className="text-sm text-[#5A5A40]/60 mb-6">
                          Admin and farm mechanization marked this request as done. Add the technician work carried out on this machine.
                        </p>
                        <RepairCompletionForm
                          planter={selectedPlanter}
                          request={selectedPlanterPendingRepairRequest}
                          user={user}
                          onSuccess={() => {}}
                          createNotification={createNotification}
                        />
                      </div>
                    )}

                    {hasPermission('perform_maintenance') && (
                      <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                        <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                          <Wrench className="w-5 h-5" /> Record Maintenance Work
                        </h3>
                        <MaintenanceLogForm
                          planter={selectedPlanter}
                          user={user}
                          onSuccess={() => { }}
                          createNotification={createNotification}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right: History */}
                  <div className="space-y-6">
                    <MachineHierarchyMap planter={selectedPlanter} assignments={assignments} allUsers={allUsers} />

                    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-serif flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-orange-500" /> Maintenance Requests
                        </h3>
                        <button
                          onClick={() => setShowRequestForm(!showRequestForm)}
                          className="text-[10px] font-bold uppercase tracking-wider bg-[#5A5A40]/5 hover:bg-[#5A5A40]/10 px-3 py-1.5 rounded-full transition-colors"
                        >
                          {showRequestForm ? 'Cancel' : 'Raise Request'}
                        </button>
                      </div>

                      {showRequestForm && (
                        <div className="mb-6 p-4 bg-[#F5F5F0] rounded-2xl border border-[#5A5A40]/10">
                          <MaintenanceRequestForm
                            planter={selectedPlanter}
                            user={user!}
                            holderName={allUsers.find(u => u.uid === selectedPlanter.currentHolderId)?.displayName || selectedPlanter.currentHolderId}
                            onSuccess={() => setShowRequestForm(false)}
                            createNotification={createNotification}
                          />
                        </div>
                      )}

                      <div className="space-y-4">
                        {maintenanceRequests.length === 0 ? (
                          <div className="text-center py-8 text-[#5A5A40]/40 italic text-sm">
                            No active requests
                          </div>
                        ) : (
                          maintenanceRequests.map(request => (
                            <div key={request.id}>
                              <MaintenanceRequestCard
                                request={request}
                                onApprove={canApproveMaintenanceRequest(request) ? handleApproveRequest : undefined}
                                onReject={canApproveMaintenanceRequest(request) ? handleRejectRequest : undefined}
                                onStart={request.status === 'approved' && canOperateMaintenanceRequest(request) ? handleStartRequestWork : undefined}
                                onComplete={request.status === 'in_progress' && canOperateMaintenanceRequest(request) ? handleCompleteRequestWork : undefined}
                                onCancel={canOperateMaintenanceRequest(request) ? handleCancelRequest : undefined}
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm h-full">
                      <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                        <History className="w-5 h-5" /> Recent History
                      </h3>

                      <div className="space-y-4">
                        {updates.length === 0 ? (
                          <div className="text-center py-12 text-[#5A5A40]/40">
                            No updates yet
                          </div>
                        ) : (
                          updates.map(update => (
                            <div key={update.id} className="flex gap-4 p-4 bg-[#F5F5F0] rounded-2xl">
                              <div className="w-16 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-black/5">
                                {update.imageUrl ? (
                                  <img src={update.imageUrl} alt="Proof" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Camera className="w-6 h-6 text-[#5A5A40]/20" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                  <p className="text-sm font-bold">{update.newReading.toLocaleString()}</p>
                                  <p className="text-[10px] text-[#5A5A40]/40">{format(new Date(update.timestamp), 'MMM d, HH:mm')}</p>
                                </div>
                                <p className="text-xs text-[#5A5A40]/60 mb-2">
                                  +{update.areaAcres.toFixed(2)} acres
                                </p>
                                <div className="flex items-center gap-1 text-[10px] text-[#5A5A40]/40">
                                  <UserIcon className="w-3 h-3" /> {update.updatedBy}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {selectedPlanter.operatingStatus === 'maintenance' && (
                        <div className="mt-8 p-6 bg-orange-50 rounded-2xl border border-orange-100">
                          <h4 className="text-sm font-bold text-orange-800 flex items-center gap-2 mb-3">
                            <Wrench className="w-4 h-4" /> Current Maintenance Info
                          </h4>
                          <div className="space-y-3">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-orange-700/60">Problem</p>
                              <p className="text-sm text-orange-900">{selectedPlanter.problemDescription || 'No description provided'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-orange-700/60">Action Taken</p>
                              <p className="text-sm text-orange-900">{selectedPlanter.maintenanceNotes || 'No notes provided'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-[32px] p-8 border border-black/5 shadow-sm">
                      <h3 className="text-lg font-serif mb-6 flex items-center gap-2">
                        <Wrench className="w-5 h-5" /> Maintenance History
                      </h3>

                      <div className="space-y-4">
                        {maintenanceLogs.length === 0 ? (
                          <div className="text-center py-12 text-[#5A5A40]/40">
                            No maintenance logs yet
                          </div>
                        ) : (
                          maintenanceLogs.map(log => (
                            <div key={log.id} className="p-4 bg-[#F5F5F0] rounded-2xl space-y-2">
                              <div className="flex justify-between items-start">
                                <p className="text-sm font-bold">{log.technicianName}</p>
                                <div className="text-right">
                                  <p className="text-[10px] text-[#5A5A40]/40">{format(new Date(log.timestamp), 'MMM d, yyyy')}</p>
                                  <span className={cn(
                                    "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                                    log.approvalStatus === 'approved' ? "bg-green-100 text-green-700" :
                                      log.approvalStatus === 'rejected' ? "bg-red-100 text-red-700" :
                                        "bg-blue-100 text-blue-700"
                                  )}>
                                    {log.approvalStatus?.replace(/_/g, ' ') || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-[#5A5A40]/80 leading-relaxed">{log.notes}</p>

                              {/* Approval Workflow UI */}
                              {((isAdmin) ||
                                (isAreaManager && log.approvalStatus === 'pending_area_manager') ||
                                (isDistrictManager && log.approvalStatus === 'pending_district_manager') ||
                                (isFarmMech && log.approvalStatus === 'pending_farm_mech')
                              ) && log.approvalStatus !== 'approved' && log.approvalStatus !== 'rejected' && (
                                  <div className="pt-2 flex gap-2">
                                    <button
                                      onClick={async () => {
                                        const nextStatusMap: Record<string, MaintenanceLog['approvalStatus']> = {
                                          'pending_area_manager': 'pending_district_manager',
                                          'pending_district_manager': 'pending_farm_mech',
                                          'pending_farm_mech': 'approved'
                                        };
                                        const nextStatus = nextStatusMap[log.approvalStatus];

                                        const nextRoleMap: Record<string, UserRole> = {
                                          'pending_area_manager': 'district_manager',
                                          'pending_district_manager': 'farm_mechanization',
                                          'pending_farm_mech': 'admin'
                                        };
                                        const nextRole = nextRoleMap[log.approvalStatus];

                                        const roleKeyMap: Record<string, keyof NonNullable<MaintenanceLog['approvals']>> = {
                                          'pending_area_manager': 'areaManager',
                                          'pending_district_manager': 'districtManager',
                                          'pending_farm_mech': 'farmMechManager'
                                        };
                                        const roleKey = roleKeyMap[log.approvalStatus];

                                        await updateDoc(doc(db, 'maintenance_logs', log.id!), {
                                          approvalStatus: nextStatus,
                                          [`approvals.${roleKey}`]: {
                                            approved: true,
                                            by: user.displayName || user.email,
                                            at: new Date().toISOString()
                                          }
                                        });
                                        void syncFirestoreDocument('maintenance_logs', log.id!);

                                        if (nextStatus === 'approved') {
                                          await updateDoc(doc(db, 'planters', log.planterId), { operatingStatus: 'idle' });
                                          void syncFirestoreDocument('planters', log.planterId);
                                        }

                                        await createNotification({
                                          targetRole: nextRole,
                                          title: nextStatus === 'approved' ? 'Maintenance Approved' : 'Approval Required',
                                          message: nextStatus === 'approved'
                                            ? `Maintenance for ${log.planterId} has been fully approved.`
                                            : `Maintenance for ${log.planterId} requires ${nextRole?.replace(/_/g, ' ') || 'higher'} approval.`,
                                          type: nextStatus === 'approved' ? 'success' : 'info',
                                          link: log.planterId
                                        });
                                      }}
                                      className="text-[10px] bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700 transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={async () => {
                                        await updateDoc(doc(db, 'maintenance_logs', log.id!), {
                                          approvalStatus: 'rejected'
                                        });
                                        void syncFirestoreDocument('maintenance_logs', log.id!);
                                        if (log.createdByUid) {
                                          await createNotification({
                                            userId: log.createdByUid,
                                            title: 'Maintenance Rejected',
                                            message: `Maintenance for ${log.planterId} was rejected by ${user.displayName || user.email}.`,
                                            type: 'error',
                                            link: log.planterId
                                          });
                                        }
                                      }}
                                      className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full hover:bg-red-700 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}

                              {/* Approval Progress Bar */}
                              <MaintenanceProgressBar log={log} />
                              {log.partsUsed && log.partsUsed.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {log.partsUsed.map((part, i) => (
                                    <span key={i} className="text-[9px] bg-white px-2 py-0.5 rounded-full border border-black/5 text-[#5A5A40]/60">
                                      {part}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {log.cost && (
                                <p className="text-[10px] font-mono text-[#5A5A40]/40 pt-1">Cost: ₹{log.cost.toLocaleString()}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MachineDetailsForm({ planter, onSuccess, createNotification }: { planter: Planter, onSuccess: () => void, createNotification: (n: any) => Promise<void> }) {
  const [location, setLocation] = useState(planter.location);
  const [mandal, setMandal] = useState(planter.mandal || '');
  const [district, setDistrict] = useState(planter.district || '');
  const [state, setState] = useState(planter.state || '');
  const [status, setStatus] = useState(planter.operatingStatus);
  const [problem, setProblem] = useState(planter.problemDescription || '');
  const [notes, setNotes] = useState(planter.maintenanceNotes || '');
  const [coords, setCoords] = useState({ lat: planter.lat, lng: planter.lng });
  const [latInput, setLatInput] = useState(planter.lat?.toString() || '');
  const [lngInput, setLngInput] = useState(planter.lng?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [geocodingLoading, setGeocodingLoading] = useState(false);

  const fetchAddressFromCoords = async (lat: string, lng: string) => {
    if (!lat || !lng) return;
    setGeocodingLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en`);
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        // Robust mapping for Indian regions
        const villageVal = addr.village || addr.hamlet || addr.neighbourhood || addr.suburb || addr.town || addr.city || '';
        const mandalVal = addr.subdistrict || addr.township || addr.suburb || addr.town || addr.city_district || addr.neighbourhood || '';
        const districtVal = addr.state_district || addr.county || addr.district || addr.city_district || addr.city || '';
        const stateVal = addr.state || addr.region || '';

        if (villageVal) setLocation(villageVal);
        if (mandalVal) setMandal(mandalVal);
        if (districtVal) setDistrict(districtVal);
        if (stateVal) setState(stateVal);
      }
    } catch (err) {
      console.error('Failed to fetch address details:', err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Auto-fill address when lat/lng inputs are updated (1s debounce)
  useEffect(() => {
    const l1 = parseFloat(latInput);
    const l2 = parseFloat(lngInput);
    if (!isNaN(l1) && !isNaN(l2) && l1 !== 0 && l2 !== 0) {
      const timer = setTimeout(() => {
        fetchAddressFromCoords(latInput, lngInput);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [latInput, lngInput]);

  useEffect(() => {
    setLocation(planter.location);
    setMandal(planter.mandal || '');
    setDistrict(planter.district || '');
    setState(planter.state || '');
    setStatus(planter.operatingStatus);
    setProblem(planter.problemDescription || '');
    setNotes(planter.maintenanceNotes || '');
    setCoords({ lat: planter.lat, lng: planter.lng });
    setLatInput(planter.lat?.toString() || '');
    setLngInput(planter.lng?.toString() || '');
  }, [planter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedLat = latInput.trim() === '' ? null : Number(latInput);
      const parsedLng = lngInput.trim() === '' ? null : Number(lngInput);

      if ((parsedLat !== null && Number.isNaN(parsedLat)) || (parsedLng !== null && Number.isNaN(parsedLng))) {
        throw new Error('Invalid coordinates');
      }

      if ((parsedLat === null) !== (parsedLng === null)) {
        throw new Error('Both latitude and longitude are required');
      }

      if (parsedLat !== null && (parsedLat < -90 || parsedLat > 90)) {
        throw new Error('Latitude out of range');
      }

      if (parsedLng !== null && (parsedLng < -180 || parsedLng > 180)) {
        throw new Error('Longitude out of range');
      }

      await updateDoc(doc(db, 'planters', planter.id), {
        location,
        mandal,
        district,
        state,
        operatingStatus: status,
        problemDescription: status === 'maintenance' ? problem : '',
        maintenanceNotes: status === 'maintenance' ? notes : '',
        lat: parsedLat,
        lng: parsedLng,
        lastUpdated: new Date().toISOString()
      });
      void syncFirestoreDocument('planters', planter.id);

      setCoords({
        lat: parsedLat ?? undefined,
        lng: parsedLng ?? undefined
      });

      onSuccess();
    } catch (err) {
      console.error('Failed to update details:', err);
      alert(err instanceof Error ? err.message : 'Failed to update machine details. Please check the coordinates and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const captureLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const latStr = latitude.toFixed(6);
        const lngStr = longitude.toFixed(6);
        setCoords({ lat: latitude, lng: longitude });
        setLatInput(latStr);
        setLngInput(lngStr);
        await fetchAddressFromCoords(latStr, lngStr);
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        alert("Could not get location. Please ensure GPS is enabled.");
      }
    );
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          >
            <option value="operating">Operating</option>
            <option value="idle">Idle</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 bg-white/50 p-4 rounded-2xl border border-black/5">
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-3 block">Location Details (GPS Or Manual)</label>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={captureLocation}
                disabled={isLocating}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-emerald-700 flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isLocating ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                {isLocating ? 'Locating...' : 'Capture Details'}
              </button>
              <button
                type="button"
                onClick={() => fetchAddressFromCoords(latInput, lngInput)}
                disabled={geocodingLoading || !latInput || !lngInput}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase transition-all hover:bg-slate-50 flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {geocodingLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Network className="w-3 h-3" />}
                Sync From Coords
              </button>
            </div>
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Village / Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="Village / Location..."
            />
          </div>
          <div>
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Mandal</label>
            <input
              type="text"
              value={mandal}
              onChange={(e) => setMandal(e.target.value)}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="Mandal name..."
            />
          </div>
          <div>
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">District</label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="District name..."
            />
          </div>
          <div className="col-span-2">
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">State</label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="State name..."
            />
          </div>
          <div>
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={latInput}
              onChange={(e) => {
                setLatInput(e.target.value);
                setCoords(prev => ({
                  ...prev,
                  lat: e.target.value.trim() === '' ? undefined : Number(e.target.value)
                }));
              }}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="e.g. 17.385044"
            />
          </div>
          <div>
            <label className="text-[8px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={lngInput}
              onChange={(e) => {
                setLngInput(e.target.value);
                setCoords(prev => ({
                  ...prev,
                  lng: e.target.value.trim() === '' ? undefined : Number(e.target.value)
                }));
              }}
              className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
              placeholder="e.g. 78.486671"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          {coords.lat !== undefined && coords.lng !== undefined ? (
          <p className="text-[10px] text-[#5A5A40]/40 font-mono mt-2">
            Coordinates: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
          ) : (
            <p className="text-[10px] text-[#5A5A40]/40 font-mono mt-2">
              Enter latitude and longitude manually, or use Capture GPS.
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              setCoords({ lat: undefined, lng: undefined });
              setLatInput('');
              setLngInput('');
            }}
            className="text-[10px] font-bold uppercase tracking-wider text-[#5A5A40]/50 hover:text-[#5A5A40] transition-colors"
          >
            Clear Coords
          </button>
        </div>
      </div>

      {status === 'maintenance' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100"
        >
          <div>
            <label className="text-[10px] font-bold text-orange-700/60 uppercase mb-1 block">Problem Occurred</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              className="w-full bg-white rounded-xl border-none text-sm p-2 h-20"
              placeholder="Describe the issue..."
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-orange-700/60 uppercase mb-1 block">Action Taken / Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white rounded-xl border-none text-sm p-2 h-20"
              placeholder="What was done to fix it?"
            />
          </div>
        </motion.div>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="w-full bg-[#5A5A40] text-white rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Machine Details'}
      </button>
    </form>
  );
}

function MaintenanceLogForm({ planter, user, onSuccess, createNotification }: { planter: Planter, user: { uid: string; email: string; displayName: string }, onSuccess: () => void, createNotification: (n: any) => Promise<void> }) {
  const [technicianName, setTechnicianName] = useState(user.displayName || '');
  const [notes, setNotes] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [cost, setCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes || !technicianName) return;

    setIsSubmitting(true);
    try {
      const log: MaintenanceLog = {
        planterId: planter.id,
        technicianName,
        notes,
        partsUsed: partsUsed.split(',').map(p => p.trim()).filter(p => p !== ''),
        timestamp: new Date().toISOString(),
        cost: cost ? Number(cost) : undefined,
        createdByUid: user.uid,
        approvalStatus: 'pending_area_manager',
        approvals: {}
      };

      const logRef = await addDoc(collection(db, 'maintenance_logs'), log);
      void syncFirestoreDocument('maintenance_logs', logRef.id);

      await createNotification({
        targetRole: 'area_manager',
        title: 'New Maintenance Log',
        message: `New maintenance log submitted for ${planter.id} by ${technicianName}. Requires approval.`,
        type: 'info',
        link: planter.id
      });

      setNotes('');
      setPartsUsed('');
      setCost('');
      onSuccess();
    } catch (err) {
      console.error('Failed to save maintenance log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Technician</label>
          <input
            type="text"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
            placeholder="Name..."
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Cost (Optional)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
            placeholder="Amount..."
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Parts Used (Comma separated)</label>
        <input
          type="text"
          value={partsUsed}
          onChange={(e) => setPartsUsed(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          placeholder="e.g. Sprocket, Chain, Bolts..."
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Technician Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2 h-24"
          placeholder="Detailed work description..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#5A5A40] text-white rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Record Maintenance Log'}
      </button>
    </form>
  );
}

function MaintenanceRequestForm({ planter, user, holderName, onSuccess, createNotification }: { planter: Planter, user: { uid: string; email: string; displayName: string }, holderName: string, onSuccess: () => void, createNotification: (n: any) => Promise<void> }) {
  const [requestType, setRequestType] = useState<'repair' | 'regular_service'>('repair');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [partDamaged, setPartDamaged] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) return;

    setIsSubmitting(true);
    try {
      const initialStatus = getInitialRequestStatus(planter.currentHolderRole);
      const initialOwnerRole = getRequestOwnerRole(initialStatus);

      const request: MaintenanceRequest = {
        planterId: planter.id,
        requestType,
        severity,
        partDamaged: partDamaged || undefined,
        description,
        requestedBy: user.displayName || user.email || 'Unknown',
        requestedByUid: user.uid,
        currentHolderUid: planter.currentHolderId,
        currentHolderName: holderName,
        timestamp: new Date().toISOString(),
        status: initialStatus,
        approvals: {}
      };

      const requestRef = await addDoc(collection(db, 'maintenance_requests'), request);
      void syncFirestoreDocument('maintenance_requests', requestRef.id);

      if (initialOwnerRole) {
        await createNotification({
          targetRole: initialOwnerRole,
          title: 'New Maintenance Request',
          message: `${severity.toUpperCase()} severity ${requestType} request for ${planter.id} is waiting for your review.`,
          type: severity === 'high' || severity === 'critical' ? 'error' : 'warning',
          link: planter.id
        });
      }

      setDescription('');
      setPartDamaged('');
      onSuccess();
    } catch (err) {
      console.error('Failed to raise maintenance request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Request Type</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as any)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          >
            <option value="repair">Repair</option>
            <option value="regular_service">Regular Service</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Part Damaged (Optional)</label>
        <input
          type="text"
          value={partDamaged}
          onChange={(e) => setPartDamaged(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          placeholder="e.g. Seed Plate, Chain..."
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Issue Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2 h-24"
          placeholder="Describe the problem in detail..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#5A5A40] text-white rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Raise Maintenance Request'}
      </button>
    </form>
  );
}

function RepairCompletionForm({
  planter,
  request,
  user,
  onSuccess,
  createNotification
}: {
  planter: Planter;
  request: MaintenanceRequest;
  user: { uid: string; email: string; displayName: string };
  onSuccess: () => void;
  createNotification: (n: any) => Promise<void>;
}) {
  const [technicianName, setTechnicianName] = useState('');
  const [partsUsed, setPartsUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!technicianName.trim() || !notes.trim()) return;

    setIsSubmitting(true);
    try {
      const log: MaintenanceLog = {
        planterId: planter.id,
        requestId: request.id,
        technicianName: technicianName.trim(),
        partsUsed: partsUsed.split(',').map(part => part.trim()).filter(Boolean),
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
        cost: cost ? Number(cost) : undefined,
        createdByUid: user.uid,
        createdByName: user.displayName || user.email,
        approvalStatus: 'approved',
        approvals: {
          areaManager: request.approvals?.areaManager,
          districtManager: request.approvals?.districtManager,
          farmMechManager: request.approvals?.farmMechManager
        }
      };

      const logRef = await addDoc(collection(db, 'maintenance_logs'), log);
      void syncFirestoreDocument('maintenance_logs', logRef.id);

      await updateDoc(doc(db, 'maintenance_requests', request.id!), {
        resolutionSubmittedAt: new Date().toISOString(),
        resolutionSubmittedByUid: user.uid,
        resolutionSubmittedByName: user.displayName || user.email
      });
      void syncFirestoreDocument('maintenance_requests', request.id!);

      await updateDoc(doc(db, 'planters', planter.id), {
        operatingStatus: 'idle',
        maintenanceNotes: notes.trim(),
        problemDescription: request.description,
        lastUpdated: new Date().toISOString()
      });
      void syncFirestoreDocument('planters', planter.id);

      await createNotification({
        targetRole: 'farm_mechanization',
        title: 'Repair Details Submitted',
        message: `${planter.id} repair completion details were submitted by ${user.displayName || user.email}.`,
        type: 'success',
        link: planter.id
      });

      await createNotification({
        targetRole: 'admin',
        title: 'Repair Details Submitted',
        message: `${planter.id} repair completion details were submitted by ${user.displayName || user.email}.`,
        type: 'success',
        link: planter.id
      });

      setTechnicianName('');
      setPartsUsed('');
      setNotes('');
      setCost('');
      onSuccess();
    } catch (err) {
      console.error('Failed to submit repair completion details:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Technician Name</label>
          <input
            type="text"
            value={technicianName}
            onChange={(e) => setTechnicianName(e.target.value)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
            placeholder="Who repaired this machine?"
            required
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Cost (Optional)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
            placeholder="Repair cost"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Parts Replaced</label>
        <input
          type="text"
          value={partsUsed}
          onChange={(e) => setPartsUsed(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2"
          placeholder="Comma separated parts list"
        />
      </div>

      <div>
        <label className="text-[10px] font-bold text-[#5A5A40]/40 uppercase mb-1 block">Repair Work Done</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full bg-[#F5F5F0] rounded-xl border-none text-sm p-2 h-24"
          placeholder="Describe what the technician repaired or replaced..."
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#5A5A40] text-white rounded-full py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Repair Details'}
      </button>
    </form>
  );
}

function GallerySection({ planter, onUpload }: { planter: Planter, onUpload: (url: string) => Promise<void> }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const driveUpload = await withTimeout(uploadDriveFile({
        file,
        machineId: planter.id,
        bucket: 'gallery'
      }), 15000);

      let url = driveUpload?.url;
      if (!url) {
        const storageRef = ref(storage, `gallery/${planter.id}/${Date.now()}_${file.name}`);
        const uploadResult = await withTimeout(uploadBytes(storageRef, file), 15000);
        if (!uploadResult) {
          throw new Error('Gallery upload timed out.');
        }

        const downloadUrl = await withTimeout(getDownloadURL(uploadResult.ref), 10000);
        if (!downloadUrl) {
          throw new Error('Gallery download URL request timed out.');
        }

        url = downloadUrl;
      }

      await onUpload(url);
    } catch (err) {
      console.error('Gallery upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {planter.gallery?.map((url, idx) => (
          <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-black/5 group relative">
            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={() => window.open(url, '_blank')}
                className="text-white text-[10px] font-bold uppercase tracking-wider"
              >
                View Full
              </button>
            </div>
          </div>
        ))}
        <label className="aspect-square rounded-2xl border-2 border-dashed border-[#5A5A40]/20 flex flex-col items-center justify-center cursor-pointer hover:border-[#5A5A40]/40 transition-colors bg-[#F5F5F0]/50">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-[#5A5A40]/40" />
          ) : (
            <>
              <Plus className="w-6 h-6 text-[#5A5A40]/40 mb-1" />
              <span className="text-[10px] font-bold text-[#5A5A40]/40 uppercase">Add Photo</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={isUploading} />
        </label>
      </div>
    </div>
  );
}

function UpdateForm({ planter, user, machineConfig, onSuccess }: {
  planter: Planter,
  user: { uid: string; email: string; displayName: string },
  machineConfig?: { wheelCircumference: number; driveTeeth: number; shaftTeeth: number; machineWidth: number };
  onSuccess: () => void
}) {
  const [newReading, setNewReading] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = machineConfig ?? { wheelCircumference: 2, driveTeeth: 19, shaftTeeth: 14, machineWidth: 2.2 };
  const calcDistLocal = (revs: number) => revs * (cfg.shaftTeeth / cfg.driveTeeth) * cfg.wheelCircumference / 1000;
  const calcAreaLocal = (revs: number) => { const m = revs * (cfg.shaftTeeth / cfg.driveTeeth) * cfg.wheelCircumference; return (m * cfg.machineWidth) / 4046.86; };

  const diff = Number(newReading) - planter.lastReading;
  const distance = diff > 0 ? calcDistLocal(diff) : 0;
  const area = diff > 0 ? calcAreaLocal(diff) : 0;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReading || Number(newReading) <= planter.lastReading) {
      setError('New reading must be greater than previous reading');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload Image (optional)
      let imageUrl: string | undefined;
      let imageUploadSkipped = false;
      if (image) {
        try {
          const driveUpload = await withTimeout(uploadDriveFile({
            file: image,
            machineId: planter.id,
            bucket: 'proofs'
          }), 15000);

          if (driveUpload?.url) {
            imageUrl = driveUpload.url;
          } else {
            const storageRef = ref(storage, `proofs/${planter.id}/${Date.now()}_${image.name}`);
            const uploadResult = await withTimeout(uploadBytes(storageRef, image), 15000);
            if (uploadResult) {
              const downloadUrl = await withTimeout(getDownloadURL(uploadResult.ref), 10000);
              imageUrl = downloadUrl || undefined;
            }
          }
        } catch (uploadErr) {
          console.warn('Image upload failed, saving without image:', uploadErr);
          imageUploadSkipped = true;
        }

        if (!imageUrl) {
          imageUploadSkipped = true;
        }
      }

      // 2. Create Update Record
      const updateData: ReadingUpdate = {
        planterId: planter.id,
        previousReading: Number(planter.lastReading) || 0,
        newReading: Number(newReading) || 0,
        distanceKm: Number(distance) || 0,
        areaAcres: Number(area) || 0,
        imageUrl: imageUrl || '',
        timestamp: new Date().toISOString(),
        updatedBy: user.displayName || user.email || 'Unknown'
      };

      const updateRef = await addDoc(collection(db, 'updates'), updateData);
      void syncFirestoreDocument('updates', updateRef.id);

      // 3. Update Planter
      await updateDoc(doc(db, 'planters', planter.id), {
        lastReading: Number(newReading) || 0,
        lastUpdated: new Date().toISOString()
      });
      void syncFirestoreDocument('planters', planter.id);

      if (imageUploadSkipped) {
        console.warn('Reading saved without image proof because upload did not complete in time.');
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Failed to save update. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-[#F5F5F0] rounded-2xl">
          <p className="text-[10px] uppercase text-[#5A5A40]/40 font-bold mb-1">Previous</p>
          <p className="text-xl font-mono font-bold">{planter.lastReading.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-[#5A5A40]/5 rounded-2xl border border-[#5A5A40]/10">
          <p className="text-[10px] uppercase text-[#5A5A40]/40 font-bold mb-1">New Reading</p>
          <input
            type="number"
            value={newReading}
            onChange={(e) => setNewReading(e.target.value)}
            placeholder="Enter value"
            className="w-full bg-transparent border-none p-0 text-xl font-mono font-bold focus:ring-0 placeholder:text-[#5A5A40]/20"
          />
        </div>
      </div>

      {diff > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-green-800">Calculated Work</p>
              <p className="text-[10px] text-green-600">Based on sprocket ratios</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-800">+{area.toFixed(2)} acres</p>
            <p className="text-xs text-green-600">{distance.toFixed(2)} km equivalent</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] uppercase text-[#5A5A40]/40 font-bold">Image Proof <span className="normal-case font-normal text-[#5A5A40]/30">(optional)</span></p>
        <label className="block">
          <div className={cn(
            "relative aspect-video rounded-[24px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all",
            preview ? "border-[#5A5A40] bg-white" : "border-[#5A5A40]/20 hover:border-[#5A5A40]/40 bg-white"
          )}>
            {preview ? (
              <>
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-medium">Change Image</p>
                </div>
              </>
            ) : (
              <>
                <Camera className="w-8 h-8 text-[#5A5A40]/20 mb-2" />
                <p className="text-sm text-[#5A5A40]/40">Click to take or upload photo</p>
              </>
            )}
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
          </div>
        </label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#5A5A40] text-white rounded-full py-4 font-medium flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-colors disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Save Update
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}

function MapView({ planters, onSelect, allUsers }: { planters: Planter[], onSelect: (p: Planter) => void, allUsers: UserProfile[] }) {
  const center: [number, number] = [20.5937, 78.9629]; // Center of India

  return (
    <MapContainer
      center={center}
      zoom={5}
      className="w-full h-full z-0"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {planters.filter(planter => planter.lat !== undefined && planter.lat !== null && planter.lng !== undefined && planter.lng !== null).map(planter => (
        <Marker
          key={planter.id}
          position={[planter.lat!, planter.lng!]}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-serif text-lg m-0">{planter.id}</h3>
                <span className={cn(
                  "text-[8px] uppercase font-bold px-1.5 py-0.5 rounded",
                  planter.operatingStatus === 'operating' ? "bg-green-100 text-green-700" :
                    planter.operatingStatus === 'maintenance' ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                )}>
                  {planter.operatingStatus}
                </span>
              </div>
              <div className="space-y-1 text-xs text-[#5A5A40]/60 mb-3">
                <p className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {allUsers.find(u => u.uid === planter.currentHolderId)?.displayName || 'Unknown'}</p>
                <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {planter.location}</p>
                <p className="font-mono">{calculateArea(planter.lastReading).toFixed(1)} acres covered</p>
              </div>
              <button
                onClick={() => onSelect(planter)}
                className="w-full bg-[#5A5A40] text-white py-1.5 rounded-lg text-xs font-medium hover:bg-[#4A4A30] transition-colors"
              >
                View Details
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
