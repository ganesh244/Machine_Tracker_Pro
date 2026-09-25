import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MapPin,
  User as UserIcon,
  Calendar,
  Clock,
  Gauge,
  Tractor,
  Wrench,
  AlertTriangle,
  Image as ImageIcon,
  ArrowRight,
  TrendingUp,
  FileText,
  History,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Maximize2,
  Users,
  QrCode
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Planter, UserProfile, Assignment, ReadingUpdate, MaintenanceRequest, MaintenanceLog, PreventiveMaintenanceSchedule } from '../../types';
import { StatusBadge, RoleBadge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';
import { MachineQRCode } from './MachineQRCode';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface MachineDetailProps {
  planter: Planter | null;
  isOpen: boolean;
  onClose: () => void;
  calcArea: (revs: number) => number;
  holder?: UserProfile;
  allUsers: UserProfile[];
  assignments?: Assignment[];
  updates?: ReadingUpdate[];
  maintenanceRequests?: MaintenanceRequest[];
  maintenanceSchedules?: PreventiveMaintenanceSchedule[];
  maintenanceLogs?: MaintenanceLog[];
  canTransfer?: boolean;
  onTransferClick?: () => void;
  onUpdateReadingClick?: () => void;
  onRaiseMaintenanceClick?: () => void;
  onManageDetailsClick?: () => void;
}

type TabType = 'overview' | 'activity' | 'maintenance' | 'gallery';

export const MachineDetail = ({
  planter,
  isOpen,
  onClose,
  calcArea,
  holder,
  allUsers,
  assignments = [],
  updates = [],
  maintenanceRequests = [],
  maintenanceSchedules = [],
  maintenanceLogs = [],
  canTransfer = false,
  onTransferClick,
  onUpdateReadingClick,
  onRaiseMaintenanceClick,
  onManageDetailsClick,
}: MachineDetailProps) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);
  const [loadingUsageLogs, setLoadingUsageLogs] = useState(false);

  // Reset tab and image error when a new machine opens
  useEffect(() => {
    if (planter?.id) {
      setActiveTab('overview');
      setHeroImgError(false);
      setLightboxImage(null);
      
      const fetchUsageLogs = async () => {
        setLoadingUsageLogs(true);
        try {
          const logsSnap = await getDocs(query(collection(db, 'planters', planter.id, 'usageLogs'), orderBy('timestamp', 'desc')));
          setUsageLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Failed to fetch usage logs", e);
        } finally {
          setLoadingUsageLogs(false);
        }
      };
      fetchUsageLogs();
    }
  }, [planter?.id]);

  // Esc key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxImage, onClose]);

  // Activity timeline: merge updates and assignments sorted by date descending
  const activityTimeline = useMemo(() => {
    if (!planter) return [];

    const machineUpdates = updates
      .filter(u => u.planterId === planter.id)
      .map(u => ({
        type: 'reading' as const,
        id: u.id || `upd_${u.timestamp}`,
        timestamp: u.timestamp,
        reading: u.newReading,
        previousReading: u.previousReading,
        areaAcres: u.areaAcres,
        updatedBy: u.updatedBy,
        imageUrl: u.imageUrl,
      }));

    const machineAssignments = assignments
      .filter(a => a.machineId === planter.id)
      .map(a => {
        const fromUser = allUsers.find(u => u.uid === a.fromUserId);
        const toUser = allUsers.find(u => u.uid === a.toUserId);
        return {
          type: 'assignment' as const,
          id: a.id || `asn_${a.timestamp}`,
          timestamp: a.timestamp,
          fromName: fromUser?.displayName || a.fromUserId || 'System',
          toName: toUser?.displayName || a.toUserId || 'Unassigned',
          fromRole: a.fromRole,
          toRole: a.toRole,
          status: a.status,
        };
      });

    const machineUsageLogs = usageLogs.map(log => {
      if (log.type === 'onboarding') {
        return {
          type: 'onboarding' as const,
          id: log.id,
          timestamp: log.timestamp,
          initialOperator: log.initialOperator,
          cfJf: allUsers.find(u => u.uid === log.cfJf)?.displayName || log.cfJf
        };
      } else {
        return {
          type: 'handover' as const,
          id: log.id,
          timestamp: log.timestamp,
          farmerName: log.farmerName,
          cfJf: allUsers.find(u => u.uid === log.cfJf)?.displayName || log.cfJf,
          acresCovered: log.acresCovered,
          fuelConsumed: log.fuelConsumed,
          cropType: log.cropType
        };
      }
    });

    return [...machineUpdates, ...machineAssignments, ...machineUsageLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [planter, updates, assignments, allUsers, usageLogs]);

  // Machine gallery images
  const allGalleryPhotos = useMemo(() => {
    if (!planter) return [];
    const fromPlanter = planter.gallery || [];
    const fromUpdates = updates
      .filter(u => u.planterId === planter.id && u.imageUrl)
      .map(u => u.imageUrl);
    return Array.from(new Set([...fromPlanter, ...fromUpdates]));
  }, [planter, updates]);

  // Filter maintenance requests for this machine
  const machineRequests = useMemo(() => {
    if (!planter) return [];
    return maintenanceRequests.filter(r => r.planterId === planter.id);
  }, [planter, maintenanceRequests]);

  const machineSchedules = useMemo(() => {
    if (!planter) return [];
    return maintenanceSchedules.filter(s => s.planterId === planter.id);
  }, [planter, maintenanceSchedules]);

  const uniqueFarmers = useMemo(() => {
    if (!planter || !updates) return [];
    const farmers = new Set<string>();
    updates.forEach(u => {
      if (u.planterId === planter.id && u.operatorName) {
        farmers.add(u.operatorName);
      }
    });
    return Array.from(farmers);
  }, [planter, updates]);

  if (!planter) return null;

  const totalArea = calcArea(planter.lastReading);
  const heroPhoto = !heroImgError && planter.gallery?.[0];

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={e => e.stopPropagation()}
            className={cn(
              "relative w-full lg:w-[620px] xl:w-[680px] bg-slate-50 shadow-2xl flex flex-col h-full z-10 overflow-hidden border-l border-slate-200/80"
            )}
          >
            {/* Top Navigation & Close Header */}
            <div className="bg-white px-6 py-4 border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono font-bold text-lg text-slate-900 tracking-tight truncate">
                  {planter.id}
                </span>
                <StatusBadge status={planter.status || planter.operatingStatus} size="sm" />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowQR(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>View QR</span>
                </button>
                {canTransfer && onTransferClick && (
                  <button
                    onClick={onTransferClick}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Transfer</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6">
              {/* Hero Photo & Machine Identity */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
                <div className="relative h-52 sm:h-60 bg-gradient-to-br from-slate-100 via-slate-200/60 to-emerald-50 overflow-hidden">
                  {heroPhoto ? (
                    <img
                      src={heroPhoto}
                      alt={planter.id}
                      className="w-full h-full object-cover"
                      onError={() => setHeroImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                      <Tractor className="w-16 h-16 text-slate-300 stroke-[1.5]" />
                      <span className="text-xs uppercase tracking-widest font-semibold text-slate-400">
                        {planter.type || 'Agricultural Machine'}
                      </span>
                    </div>
                  )}

                  {/* Top-left Status Badge */}
                  <div className="absolute top-4 left-4">
                    <StatusBadge status={planter.status || planter.operatingStatus} size="md" />
                  </div>

                  {/* Photo count indicator */}
                  {allGalleryPhotos.length > 0 && (
                    <button
                      onClick={() => setActiveTab('gallery')}
                      className="absolute bottom-4 right-4 bg-slate-900/75 hover:bg-slate-900 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>{allGalleryPhotos.length} Photos</span>
                    </button>
                  )}
                </div>

                {/* Hero Body Info */}
                <div className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h2 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
                      {planter.id}
                    </h2>
                    {planter.type && (
                      <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">
                        {planter.type}
                      </span>
                    )}
                  </div>

                  {/* Metadata Chips: Location + Holder */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-medium text-slate-700">
                        {[planter.mandal, planter.district, planter.state].filter(Boolean).join(', ') || planter.location || 'Location unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <UserIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Incharge:</span>
                      <span className="font-semibold text-slate-800">
                        {holder?.displayName || 'Unassigned'}
                      </span>
                      {holder?.role && <RoleBadge role={holder.role} />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Stats Strip (StatCard Style) */}
              <div className="grid grid-cols-3 gap-3">
                {/* Last Reading */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold font-mono text-slate-900 leading-tight">
                    {planter.lastReading.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Reading (Revs)
                  </p>
                </div>

                {/* Total Area */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold font-mono text-emerald-600 leading-tight">
                    {totalArea.toFixed(1)} <span className="text-xs font-sans font-medium text-slate-400">ac</span>
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Coverage Area
                  </p>
                </div>

                {/* Last Updated */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-4 relative overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-tight truncate">
                    {planter.lastUpdated ? format(new Date(planter.lastUpdated), 'MMM d, yyyy') : '—'}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                    Last Updated
                  </p>
                </div>
              </div>

              {/* Maintenance Alert Callout (If currently in maintenance) */}
              {planter.operatingStatus === 'maintenance' && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-orange-900 uppercase tracking-wide">
                      Active Maintenance Alert
                    </h4>
                    <p className="text-sm text-orange-800 mt-1">
                      {planter.problemDescription || 'Machine is flagged for maintenance inspection.'}
                    </p>
                    {planter.maintenanceNotes && (
                      <p className="text-xs text-orange-700/80 mt-1 italic">
                        Notes: {planter.maintenanceNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab Navigation Strip */}
              <div className="flex items-center gap-1 bg-slate-200/70 p-1.5 rounded-2xl">
                {[
                  { key: 'overview', label: 'Overview', icon: FileText },
                  { key: 'activity', label: 'Activity Log', icon: History, count: activityTimeline.length },
                  { key: 'maintenance', label: 'Maintenance', icon: Wrench, count: machineRequests.length },
                  { key: 'gallery', label: 'Gallery', icon: ImageIcon, count: allGalleryPhotos.length },
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as TabType)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 relative whitespace-nowrap",
                        isActive
                          ? "bg-white text-emerald-800 shadow-sm font-bold"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{tab.label}</span>
                      {tab.count !== undefined && tab.count > 0 && (
                        <span
                          className={cn(
                            "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                            isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-300 text-slate-700"
                          )}
                        >
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Areas */}
              <div className="space-y-4">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Machine Specifications */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Machine Specifications
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Machine Identifier</p>
                          <p className="font-mono font-bold text-slate-800 mt-0.5">{planter.id}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Type / Category</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.type || 'Multicrop Planter'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Brand</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.brand || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Model</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.model || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Serial Number</p>
                          <p className="font-mono text-slate-800 mt-0.5">{planter.serialNumber || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Operating Status</p>
                          <div className="mt-1">
                            <StatusBadge status={planter.status || planter.operatingStatus} size="sm" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Purchase & Support Details */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Purchase & Support Details
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Purchase Date</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.purchaseDate || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Purchase Cost</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.purchaseCost ? `$${planter.purchaseCost.toLocaleString()}` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Warranty</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.warranty || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Maint. Schedule Policy</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.maintenanceSchedule || '—'}</p>
                        </div>
                        {planter.manualLink && (
                            <div className="col-span-2 mt-2">
                              <a href={planter.manualLink} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline">
                                <ExternalLink className="w-4 h-4" /> View User Manual
                              </a>
                            </div>
                        )}
                      </div>
                    </div>

                    {/* Beneficiaries / Unique Farmers */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        Beneficiaries ({uniqueFarmers.length})
                      </h3>
                      {uniqueFarmers.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No farmers/operators recorded yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {uniqueFarmers.map((farmer, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-sm font-medium">
                              {farmer}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Custodian & Hierarchy */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-emerald-600" />
                        Current Custodian & Assignment
                      </h3>
                      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {(holder?.displayName?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-sm truncate">
                            {holder?.displayName || 'Unassigned Machine'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{holder?.email || 'No email associated'}</p>
                        </div>
                        {holder?.role && <RoleBadge role={holder.role} />}
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
                        <span>Holder Role Level:</span>
                        <span className="font-semibold text-slate-700 capitalize">
                          {planter.currentHolderRole ? planter.currentHolderRole.replace(/_/g, ' ') : 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Location Details */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] p-5">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        Geographic Location
                      </h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400">Village / Location</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.location || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Mandal</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.mandal || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">District</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.district || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">State</p>
                          <p className="font-medium text-slate-800 mt-0.5">{planter.state || '—'}</p>
                        </div>
                      </div>

                      {planter.lat && planter.lng && (
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-mono">
                            {planter.lat.toFixed(4)}, {planter.lng.toFixed(4)}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${planter.lat},${planter.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-bold inline-flex items-center gap-1 hover:underline"
                          >
                            Open in Google Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {onUpdateReadingClick && (
                        <button
                          onClick={onUpdateReadingClick}
                          className="flex-1 min-w-36 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                        >
                          <Gauge className="w-4 h-4" />
                          <span>Update Reading</span>
                        </button>
                      )}
                      {onRaiseMaintenanceClick && (
                        <button
                          onClick={onRaiseMaintenanceClick}
                          className="flex-1 min-w-36 py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <Wrench className="w-4 h-4" />
                          <span>Raise Maintenance</span>
                        </button>
                      )}
                      {onManageDetailsClick && (
                        <button
                          onClick={onManageDetailsClick}
                          className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                          <span>Edit Specs</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ACTIVITY LOG TAB */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {activityTimeline.length === 0 ? (
                      <EmptyState
                        icon={History}
                        title="No activity recorded"
                        description="Counter reading updates and custodian transfers for this machine will appear here in chronological order."
                      />
                    ) : (
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                        {activityTimeline.map((item, idx) => {
                          if (item.type === 'reading') {
                            return (
                              <div key={item.id} className="relative group">
                                {/* Dot indicator */}
                                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm ring-4 ring-slate-50">
                                  <Gauge className="w-3 h-3" />
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:border-emerald-300 transition-all">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <p className="font-mono font-bold text-slate-900 text-base">
                                        {item.reading.toLocaleString()}{' '}
                                        <span className="text-xs font-normal text-slate-400">revs</span>
                                      </p>
                                      <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                                        +{item.areaAcres.toFixed(2)} acres coverage
                                      </p>
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {format(new Date(item.timestamp), 'MMM d, HH:mm')}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                                    <span className="flex items-center gap-1.5">
                                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                                      {item.updatedBy || 'Operator'}
                                    </span>

                                    {item.imageUrl && (
                                      <button
                                        onClick={() => setLightboxImage(item.imageUrl)}
                                        className="text-emerald-600 hover:text-emerald-700 font-semibold inline-flex items-center gap-1 text-[11px]"
                                      >
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        View Proof
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (item.type === 'assignment') {
                            // Custodian assignment transfer
                            return (
                              <div key={item.id} className="relative group">
                                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm ring-4 ring-slate-50">
                                  <ArrowRight className="w-3 h-3" />
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:border-blue-300 transition-all">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                                      Custodian Transfer
                                    </span>
                                    <span className="text-[11px] text-slate-400 font-medium">
                                      {format(new Date(item.timestamp), 'MMM d, yyyy')}
                                    </span>
                                  </div>

                                  <p className="text-sm font-medium text-slate-800 mt-1">
                                    <span className="font-semibold text-slate-900">{item.fromName}</span>
                                    {' → '}
                                    <span className="font-semibold text-slate-900">{item.toName}</span>
                                  </p>

                                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                                    <span className="capitalize">{item.toRole.replace(/_/g, ' ')}</span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full font-bold uppercase text-[9px]",
                                        item.status === 'accepted' ? "bg-emerald-100 text-emerald-700" :
                                        item.status === 'rejected' ? "bg-rose-100 text-rose-700" :
                                        "bg-amber-100 text-amber-700"
                                      )}
                                    >
                                      {item.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          } else if (item.type === 'onboarding') {
                            return (
                              <div key={item.id} className="relative group">
                                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-sm ring-4 ring-slate-50">
                                  <CheckCircle2 className="w-3 h-3" />
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:border-indigo-300 transition-all">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Machine Onboarded</span>
                                    <span className="text-[11px] text-slate-400 font-medium">{format(new Date(item.timestamp), 'MMM d, HH:mm')}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1">
                                    <span className="font-semibold text-slate-900">{item.cfJf}</span> assigned to operator <span className="font-semibold text-slate-900">{item.initialOperator}</span>.
                                  </p>
                                </div>
                              </div>
                            );
                          } else if (item.type === 'handover') {
                            return (
                              <div key={item.id} className="relative group">
                                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-sm ring-4 ring-slate-50">
                                  <FileText className="w-3 h-3" />
                                </div>
                                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 hover:border-purple-300 transition-all">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Handover / Usage</span>
                                    <span className="text-[11px] text-slate-400 font-medium">{format(new Date(item.timestamp), 'MMM d, HH:mm')}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 mt-1">
                                    Operator handover to <span className="font-semibold text-slate-900">{item.farmerName}</span>.
                                    Covered <span className="font-semibold text-slate-900">{item.acresCovered} acres</span> of {item.cropType}.
                                  </p>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. MAINTENANCE TAB */}
                {activeTab === 'maintenance' && (
                  <div className="space-y-6">
                    {/* Preventive Maintenance Section */}
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Preventive Maintenance Schedule
                      </h3>
                      {machineSchedules.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-500 text-center">
                          No preventive maintenance schedules defined.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {machineSchedules.map(schedule => {
                            const isOverdue = schedule.status === 'overdue';
                            return (
                              <div key={schedule.id} className={cn(
                                "rounded-2xl border p-4 shadow-sm",
                                isOverdue ? "bg-rose-50 border-rose-200" : "bg-white border-slate-200/80"
                              )}>
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className={cn("font-bold", isOverdue ? "text-rose-900" : "text-slate-800")}>{schedule.taskName}</h4>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                    isOverdue ? "bg-rose-200 text-rose-800" : "bg-emerald-100 text-emerald-800"
                                  )}>
                                    {schedule.status}
                                  </span>
                                </div>
                                <div className="flex gap-4 text-xs">
                                  {schedule.frequencyHours && (
                                    <span className="text-slate-500">Every: <strong className="text-slate-700">{schedule.frequencyHours} hrs</strong></span>
                                  )}
                                  {schedule.nextDueDate && (
                                    <span className="text-slate-500">Due: <strong className={cn(isOverdue ? "text-rose-600" : "text-slate-700")}>{format(new Date(schedule.nextDueDate), 'MMM d, yyyy')}</strong></span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Repair Requests Section */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-emerald-600" />
                          Repair & Service Requests
                        </h3>
                        {onRaiseMaintenanceClick && (
                          <button
                            onClick={onRaiseMaintenanceClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>New Request</span>
                          </button>
                        )}
                      </div>

                      {machineRequests.length === 0 ? (
                        <EmptyState
                          icon={Wrench}
                          title="No maintenance requests"
                          description="This machine is currently running smoothly with no active or pending maintenance issues."
                        />
                      ) : (
                      <div className="space-y-3">
                        {machineRequests.map(req => (
                          <div
                            key={req.id}
                            className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                      req.severity === 'critical' ? "bg-rose-100 text-rose-700" :
                                      req.severity === 'high' ? "bg-orange-100 text-orange-700" :
                                      req.severity === 'medium' ? "bg-amber-100 text-amber-700" :
                                      "bg-slate-100 text-slate-700"
                                    )}
                                  >
                                    {req.severity} severity
                                  </span>
                                  <span className="text-xs font-mono font-bold text-slate-700">
                                    {req.requestType === 'regular_service' ? 'Regular Service' : 'Repair Request'}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-800 mt-2">
                                  {req.description}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide shrink-0",
                                  req.status === 'completed' ? "bg-emerald-100 text-emerald-800" :
                                  req.status === 'in_progress' ? "bg-blue-100 text-blue-800" :
                                  req.status === 'approved' ? "bg-purple-100 text-purple-800" :
                                  req.status === 'rejected' ? "bg-rose-100 text-rose-800" :
                                  "bg-amber-100 text-amber-800"
                                )}
                              >
                                {req.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                              <span>Reported by: <strong className="text-slate-600">{req.requestedBy || 'Operator'}</strong></span>
                              <span>{format(new Date(req.timestamp), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                  </div>
                )}

                {/* 4. GALLERY TAB */}
                {activeTab === 'gallery' && (
                  <div className="space-y-4">
                    {allGalleryPhotos.length === 0 ? (
                      <EmptyState
                        icon={ImageIcon}
                        title="No photos in gallery"
                        description="Condition photos and reading proof snapshots uploaded for this machine will appear here."
                      />
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {allGalleryPhotos.map((url, i) => (
                          <div
                            key={i}
                            onClick={() => setLightboxImage(url)}
                            className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 cursor-pointer shadow-sm hover:shadow-md transition-all"
                          >
                            <img
                              src={url}
                              alt={`Machine ${planter.id} photo ${i + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/30 transition-colors flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Fullscreen Lightbox Modal */}
          <AnimatePresence>
            {lightboxImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLightboxImage(null)}
                className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
              >
                <button
                  onClick={() => setLightboxImage(null)}
                  className="absolute top-6 right-6 w-11 h-11 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                <motion.img
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  src={lightboxImage}
                  alt="Enlarged machine inspection"
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                  onClick={e => e.stopPropagation()}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
    
    {/* QR Code Modal */}
    <AnimatePresence>
      {showQR && planter && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowQR(false)}
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-8 rounded-3xl shadow-2xl relative max-w-sm w-full flex flex-col items-center"
          >
            <button 
              onClick={() => setShowQR(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-900 mb-6">Machine QR Code</h3>
            <MachineQRCode machineId={planter.id} size={200} />
            <p className="text-sm text-slate-500 mt-6 text-center leading-relaxed">
              Print or show this code to allow operators to quickly update the machine's status.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};
