export type UserRole = 'admin' | 'district_manager' | 'area_manager' | 'community_facilitator' | 'operator' | 'farm_mechanization';

export type Permission = 
  | 'assign_machines' 
  | 'view_reports' 
  | 'perform_maintenance' 
  | 'approve_maintenance' 
  | 'update_readings' 
  | 'manage_users'
  | 'initialize_fleet'
  | 'edit_machine_metadata';

export interface RolePermissions {
  role: UserRole;
  allowedActions: Permission[];
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  parentId?: string; // UID of the manager above this user
  assignedState?: string;
  assignedDistrict?: string;
  assignedMandal?: string;
  assignedArea?: string;
  permissions?: Permission[]; // Granular overrides if needed
}

export interface Planter {
  id: string;
  name?: string;
  type?: string;
  serialNumber?: string;
  operatingStatus: 'operating' | 'maintenance' | 'idle';
  currentHolderId: string;
  currentHolderRole: UserRole;
  location: string;
  mandal?: string;
  district?: string;
  state?: string;
  lat?: number;
  lng?: number;
  lastReading: number;
  lastUpdated: string;
  gallery?: string[];
  maintenanceNotes?: string;
  problemDescription?: string;
}

export interface Assignment {
  id?: string;
  machineId: string;
  fromUserId: string;
  fromRole: UserRole;
  toUserId: string;
  toRole: UserRole;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}


export interface ReadingUpdate {
  id?: string;
  planterId: string;
  previousReading: number;
  newReading: number;
  distanceKm: number;
  areaAcres: number;
  imageUrl: string;
  timestamp: string;
  updatedBy: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface MaintenanceLog {
  id?: string;
  planterId: string;
  requestId?: string;
  technicianName: string;
  partsUsed: string[];
  notes: string;
  timestamp: string;
  cost?: number;
  createdByUid?: string;
  createdByName?: string;
  approvalStatus: 'pending_area_manager' | 'pending_district_manager' | 'pending_farm_mech' | 'approved' | 'rejected';
  approvals?: {
    areaManager?: { approved: boolean; by: string; at: string };
    districtManager?: { approved: boolean; by: string; at: string };
    farmMechManager?: { approved: boolean; by: string; at: string };
  };
}

export interface MaintenanceRequest {
  id?: string;
  planterId: string;
  requestType: 'repair' | 'regular_service';
  severity: 'low' | 'medium' | 'high' | 'critical';
  partDamaged?: string;
  description: string;
  requestedBy: string;
  requestedByUid?: string;
  currentHolderUid?: string;
  currentHolderName?: string;
  timestamp: string;
  status:
    | 'pending_area_manager'
    | 'pending_district_manager'
    | 'pending_farm_mech'
    | 'pending_admin'
    | 'approved'
    | 'in_progress'
    | 'completed'
    | 'rejected'
    | 'cancelled';
  approvals?: {
    areaManager?: { approved: boolean; by: string; at: string };
    districtManager?: { approved: boolean; by: string; at: string };
    farmMechManager?: { approved: boolean; by: string; at: string };
    admin?: { approved: boolean; by: string; at: string };
  };
  resolutionSubmittedAt?: string;
  resolutionSubmittedByUid?: string;
  resolutionSubmittedByName?: string;
}

export interface AppNotification {
  id?: string;
  userId?: string;
  targetRole?: UserRole;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: string;
  link?: string;
}

export const CALCULATIONS = {
  WHEEL_CIRCUMFERENCE: 2, // meters
  DRIVE_SPROCKET: 19,
  SHAFT_SPROCKET: 14,
  WIDTH: 2.2, // meters
  ACRE_CONVERSION: 4046.86, // sq meters to acres
};

export const calculateDistance = (revs: number) => {
  // 1 rev of shaft = (14/19) * 2 meters
  const meters = revs * (CALCULATIONS.SHAFT_SPROCKET / CALCULATIONS.DRIVE_SPROCKET) * CALCULATIONS.WHEEL_CIRCUMFERENCE;
  return meters / 1000; // km
};

export const calculateArea = (revs: number) => {
  const meters = revs * (CALCULATIONS.SHAFT_SPROCKET / CALCULATIONS.DRIVE_SPROCKET) * CALCULATIONS.WHEEL_CIRCUMFERENCE;
  const sqMeters = meters * CALCULATIONS.WIDTH;
  return sqMeters / CALCULATIONS.ACRE_CONVERSION;
};
