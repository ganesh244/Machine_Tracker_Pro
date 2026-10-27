import { doc, getDoc, writeBatch } from './data.js';
import { db } from './database.js';
import { isLocalDemo, demoUsers } from './demo.js';
import { APPROVAL_CHAIN } from './maintenance.js';

export const DEMO_BATCH = 'demo-field-rollout-v2';
export const demoLabel = (n: number) => `DEMO-QR-${String(n).padStart(3, '0')}`;
export const DEMO_PHOTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="#d8eddd"/><path d="M0 270L600 180V400H0" fill="#6b9e57"/><path d="M0 330L600 240M0 380L600 290" stroke="#c1dba5" stroke-width="16"/><text x="40" y="70" font-size="28" fill="#174b35">DEMO · Field evidence</text><text x="40" y="110" font-size="18" fill="#174b35">Illustration — sample data only</text></svg>');
let loading: Promise<boolean> | undefined;
export function ensureDemoScenarios() {
  if (!isLocalDemo) return Promise.resolve(false);
  return loading ||= install().catch(error => { loading = undefined; throw error; });
}
async function install() {
  const marker = doc(db, 'settings', DEMO_BATCH);
  if ((await getDoc(marker)).exists()) return false;
  const rows: Record<string, any> = {}, now = new Date().toISOString();
  const put = (path: string, value: any) => { rows[path] = value; };
  const location = { state: 'Telangana', district: 'Nizamabad', mandal: 'Armoor', village: 'DEMO Perkit', lat: 18.793, lng: 78.289 };
  put(`qr_batches/${DEMO_BATCH}`, { id: DEMO_BATCH, name: 'DEMO · Field rollout (100 labels)', quantity: 100, createdBy: 'demo-admin', createdAt: now });
  for (let n = 1; n <= 100; n++) {
    const id = demoLabel(n), attached = n >= 11 && n <= 22;
    put(`qr_labels/${id}`, { id, batchId: DEMO_BATCH, holderId: n <= 3 || attached ? 'demo-area' : n <= 10 ? 'demo-district' : 'demo-admin', status: attached ? 'attached' : 'available', ...(attached ? { machineId: id } : {}), createdAt: now });
  }
  for (const [id, fromUserId, toUserId, labelIds] of [
    ['district', 'demo-admin', 'demo-district', Array.from({ length: 22 }, (_, n) => demoLabel(n + 1))],
    ['area', 'demo-district', 'demo-area', [1, 2, 3, ...Array.from({ length: 12 }, (_, n) => n + 11)].map(demoLabel)],
  ] as [string, string, string, string[]][]) put(`qr_transfers/demo-${id}`, { id: `demo-${id}`, fromUserId, toUserId, labelIds, timestamp: now });
  const statuses = ['pending_area_manager', 'pending_district_manager', 'pending_state_manager', 'pending_farm_mech', 'approved', 'in_progress', 'completed', 'rejected'];
  for (let n = 11; n <= 22; n++) {
    const id = demoLabel(n), farmerId = `demo-lead-${n}`, machineType = ['MCP', 'Drum seeder', 'Laser land leveller'][(n - 11) % 3];
    const stopped = n >= 15 && n <= 20;
    put(`planters/${id}`, { id, qrLabelId: id, machineType, type: machineType, brand: 'DEMO FieldWorks', model: '2026', serialNumber: `DEMO-SN-${n}`, state: location.state, district: location.district, mandal: location.mandal, location: location.village, lat: location.lat, lng: location.lng, cfId: 'demo-cf', currentHolderId: 'demo-cf', currentHolderRole: 'cf', cfJf: 'demo-cf', status: stopped ? 'maintenance' : n === 11 ? 'registered_unused' : 'idle', operatingStatus: stopped ? 'maintenance' : 'idle', lastReading: 0, lastUpdated: now, registrationDate: now, onboardedBy: 'demo-area', gallery: [DEMO_PHOTO], ...(n !== 11 ? { leadFarmerId: farmerId, currentCustodian: `DEMO Lead farmer ${n}`, initialOperator: `DEMO Lead farmer ${n}` } : {}) });
    if (n !== 11) {
      const farmer = { ...location, id: farmerId, machineId: id, name: `DEMO Lead farmer ${n}`, phone: '0000000000', landAcres: 5, photos: [DEMO_PHOTO], createdAt: now, createdBy: 'demo-cf' };
      put(`farmers/${farmerId}`, farmer);
      put(`planters/${id}/usageLogs/${farmerId}`, { type: 'onboarding', farmerName: farmer.name, initialOperator: farmer.name, timestamp: now, imageUrl: DEMO_PHOTO, location: { ...location, gps: { lat: location.lat, lng: location.lng } } });
    }
    if ([12, 13, 14, 21, 22].includes(n)) for (let visit = 1; visit <= 3; visit++) {
      const usageId = `demo-usage-${n}-${visit}`, date = new Date(Date.now() - visit * 86400000).toISOString().slice(0, 10);
      const usage = { ...location, id: usageId, machineId: id, leadFarmerId: farmerId, farmerKind: visit === 1 ? 'lead' : 'fellow', farmerName: visit === 1 ? `DEMO Lead farmer ${n}` : `DEMO Fellow farmer ${n}-${visit}`, phone: '0000000000', landAcres: visit * 1.5, crop: ['Paddy', 'Maize', 'Bengal gram'][visit - 1], operationDate: date, photos: [DEMO_PHOTO], notes: 'DEMO · Sowing/land preparation completed.', recordedBy: visit === 3 ? 'demo-jcf' : 'demo-cf', recordedByName: visit === 3 ? demoUsers[5].displayName : demoUsers[4].displayName, createdAt: date + 'T09:00:00.000Z' };
      put(`field_usage/${usageId}`, usage);
      put(`planters/${id}/usageLogs/${usageId}`, { ...usage, type: 'usage', timestamp: usage.createdAt, acresCovered: usage.landAcres, cropType: usage.crop, imageUrl: DEMO_PHOTO });
      put(`updates/${usageId}`, { ...usage, planterId: id, type: 'handover', timestamp: usage.createdAt, areaAcres: usage.landAcres, acresCovered: usage.landAcres, distanceKm: 0, imageUrl: DEMO_PHOTO, updatedBy: usage.recordedByName });
    }
    if (n >= 15) {
      const status = statuses[n - 15], requestId = `demo-maintenance-${n}`;
      const approvalCount = n <= 18 ? n - 15 : n === 22 ? 0 : 4;
      const history: any[] = [{ action: 'Request raised', by: 'demo-cf', name: demoUsers[4].displayName, role: 'cf', at: now, note: 'DEMO · Inspection photo attached' }];
      const approvals: Record<string, any> = {};
      APPROVAL_CHAIN.slice(0, approvalCount).forEach(stage => { const actor = demoUsers.find(user => user.role === stage.role)!; approvals[stage.key] = { approved: true, by: actor.displayName, at: now }; history.push({ action: `${stage.label} approved`, by: actor.uid, name: actor.displayName, role: actor.role, at: now, note: 'DEMO · Estimate reviewed' }); });
      if (n === 22) { approvals.areaManager = { approved: false, by: demoUsers[3].displayName, at: now }; history.push({ action: 'Area Manager rejected', by: 'demo-area', name: demoUsers[3].displayName, role: 'area_manager', at: now, note: 'DEMO · Duplicate service requirement; machine inspected and usable.' }); }
      if ([20, 21].includes(n)) history.push({ action: 'Repair started', by: 'demo-admin', name: demoUsers[0].displayName, role: 'admin', at: now, note: '' });
      if (n === 21) history.push({ action: 'Repair completed', by: 'demo-admin', name: demoUsers[0].displayName, role: 'admin', at: now, note: 'DEMO · Drive chain replaced and safety tested.' });
      const request = { id: requestId, workflowVersion: 2, planterId: id, status, requestType: n % 2 ? 'repair' : 'regular_service', severity: 'medium', description: `DEMO · ${machineType} drive chain requires inspection and servicing.`, partDamaged: 'Drive chain', estimatedCost: 2500, photos: [DEMO_PHOTO], machineStopped: stopped, requestedBy: demoUsers[4].displayName, requestedByUid: 'demo-cf', currentHolderUid: 'demo-cf', currentHolderName: demoUsers[4].displayName, timestamp: now, approvals, history, ...(n === 21 ? { actualCost: 2200, technician: 'DEMO Technician', repairNotes: 'DEMO · Drive chain replaced and safety tested.', repairPhotos: [DEMO_PHOTO], completedAt: now, resolutionSubmittedAt: now } : {}) };
      put(`maintenance_requests/${requestId}`, request);
      if (n === 21) put(`maintenance_logs/${requestId}`, { workflowVersion: 2, planterId: id, requestId, technicianName: 'DEMO Technician', partsUsed: ['Drive chain'], notes: request.repairNotes, cost: 2200, timestamp: now, createdByUid: 'demo-admin', approvalStatus: 'approved', approvals, photos: [DEMO_PHOTO], history });
    }
  }
  // Never overwrite existing records, including demo records already acted on.
  const existing = await Promise.all(Object.keys(rows).map(path => getDoc(doc(db, path))));
  const commit = writeBatch(db);
  Object.entries(rows).forEach(([path, value], index) => { if (!existing[index].exists()) commit.set(doc(db, path), value); });
  commit.set(marker, { installedAt: now, version: 2 });
  await commit.commit();
  return true;
}
