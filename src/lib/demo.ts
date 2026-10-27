import type { UserProfile } from '../types.js';

const env = (import.meta as any).env || {};
export const isLocalDemo = env.VITE_LOCAL_DEMO === 'true' || (env.VITE_LOCAL_DEMO !== 'false' && env.DEV && env.VITE_SKIP_LOCAL_LOGIN === 'true');
export const DEMO_STORE_KEY = 'machine-tracker-demo-v1';
export const DEMO_SESSION_KEY = 'machine-tracker-demo-user';
export const demoUsers: UserProfile[] = [
  { uid: 'demo-admin', email: 'admin@demo.local', displayName: 'Asha · Admin', role: 'admin', parentId: 'demo-farm-mech' },
  { uid: 'demo-state', email: 'state@demo.local', displayName: 'Srinivas · State Manager', role: 'state_manager', parentId: 'demo-admin' },
  { uid: 'demo-district', email: 'district@demo.local', displayName: 'Divya · District Manager', role: 'district_manager', parentId: 'demo-state' },
  { uid: 'demo-area', email: 'area@demo.local', displayName: 'Arun · Area Manager', role: 'area_manager', parentId: 'demo-district' },
  { uid: 'demo-cf', email: 'cf@demo.local', displayName: 'Chandra · Community Facilitator', role: 'cf', parentId: 'demo-area' },
  { uid: 'demo-jcf', email: 'operator@demo.local', displayName: 'Ravi · Operator', role: 'jcf', parentId: 'demo-cf' },
  { uid: 'demo-farm-mech', email: 'farm-mech@demo.local', displayName: 'Farm Mechanization Team', role: 'farm_mechanization' },
].map(user => ({ ...user, assignedState: 'Telangana', assignedDistrict: 'Nizamabad', assignedMandal: 'Armoor', assignedArea: 'Armoor' })) as UserProfile[];

export function seedDemo(): Record<string, any> {
  const records: Record<string, any> = {};
  const now = new Date().toISOString();
  demoUsers.forEach(user => {
    records[`users/${user.uid}`] = user;
    records[`publicProfiles/${user.uid}`] = user;
  });
  for (let index = 1; index <= 18; index++) {
    const id = `DEMO-${String(index).padStart(3, '0')}`;
    const holder = demoUsers[(index - 1) % 6];
    const lastReading = index * 450;
    records[`planters/${id}`] = {
      id, type: 'Multicrop Planter', machineType: 'Planter', name: `Field Planter ${index}`,
      brand: 'FieldWorks', model: 'MP-2026', serialNumber: `SN-${index + 1000}`,
      currentHolderId: holder.uid, currentHolderRole: holder.role, currentCustodian: holder.displayName,
      operatingStatus: index === 6 ? 'maintenance' : index % 3 === 0 ? 'idle' : 'operating',
      status: index === 6 ? 'maintenance' : index % 3 === 0 ? 'idle' : 'in_use',
      location: `Demo Village ${index}`, mandal: 'Armoor', district: 'Nizamabad', state: 'Telangana',
      lat: 18.79 + index * 0.004, lng: 78.27 + index * 0.003,
      lastReading, lastUpdated: now, gallery: [], purchaseDate: '2026-01-10', purchaseCost: 125000,
      warranty: '2 years', maintenanceSchedule: 'Every 90 days',
    };
    records[`updates/seed-${index}`] = {
      planterId: id, type: 'reading', previousReading: lastReading - 450, newReading: lastReading,
      distanceKm: 0.663, areaAcres: 0.36, fuelConsumed: 2, jcfName: 'Demo Farmer',
      farmerName: 'Demo Farmer', imageUrl: '', timestamp: now, updatedBy: holder.displayName,
    };
  }
  const stages = ['pending_area_manager', 'pending_district_manager', 'pending_farm_mech', 'pending_admin', 'approved', 'in_progress'];
  stages.forEach((status, index) => {
    records[`maintenance_requests/seed-${index}`] = {
      planterId: 'DEMO-006', requestType: 'regular_service', severity: 'medium',
      description: `Demo service request · ${status.replaceAll('_', ' ')}`,
      requestedBy: demoUsers[5].displayName, requestedByUid: 'demo-jcf',
      currentHolderUid: 'demo-jcf', currentHolderName: demoUsers[5].displayName,
      timestamp: now, status, approvals: {},
    };
  });
  records['assignments/demo-transfer'] = {
    machineId: 'DEMO-005', fromUserId: 'demo-cf', fromRole: 'cf', toUserId: 'demo-jcf',
    toRole: 'jcf', timestamp: now, status: 'pending',
  };
  records['messages/welcome'] = { id: 'welcome', senderId: 'demo-admin', receiverId: 'demo-cf', content: 'Welcome! The local fleet is ready for field updates.', timestamp: now, read: false };
  demoUsers.forEach(user => {
    records[`notifications/welcome-${user.uid}`] = { userId: user.uid, title: 'Welcome to the demo', message: 'Changes are saved in this browser. Switch roles to follow approvals and transfers.', type: 'info', read: false, timestamp: now };
  });
  return records;
}

export function readLocalFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose an image file.'));
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('Choose an image smaller than 2 MB for the local demo.'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

// Add the oversight account to saved demos without resetting field records.
export function upgradeDemoRoles(records: Record<string, any>): boolean {
  let changed = false;
  const boss = demoUsers.find(user => user.role === 'farm_mechanization')!;
  if (!records[`users/${boss.uid}`]) { records[`users/${boss.uid}`] = boss; changed = true; }
  const admin = records['users/demo-admin'];
  if (admin && !admin.parentId) { records['users/demo-admin'] = { ...admin, parentId: boss.uid }; changed = true; }
  return changed;
}
