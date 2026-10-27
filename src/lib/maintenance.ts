import { isRemoteBrowser, remoteCommand } from './backendClient.js';
import { collection, doc, getDoc, getDocs, writeBatch } from './data.js';
import { db } from './database.js';
import { canManageMachine, reportingAncestors, ROLE_NAMES, type FieldMachine } from './fieldOperations.js';
import type { MaintenanceRequest, MaintenanceLog, UserProfile, UserRole } from '../types.js';

export interface MaintenanceEvent { action: string; by: string; name: string; role: UserRole; at: string; note: string }
export interface FieldMaintenance extends MaintenanceRequest {
  id: string; workflowVersion: 2; photos: string[]; estimatedCost: number; machineStopped: boolean;
  history: MaintenanceEvent[]; actualCost?: number; technician?: string; repairNotes?: string; repairPhotos?: string[];
  completedAt?: string; legacyStatus?: string; partsReplaced?: string; serviceDate?: string; workableConfirmed?: boolean; resolutionSubmittedByName?: string;
}
export interface FieldServiceLog extends MaintenanceLog { id: string; history: MaintenanceEvent[]; photos: string[] }
export function normalizeServiceLog(raw: any): FieldServiceLog {
  return { ...raw, approvalStatus: raw.workflowVersion !== 2 && raw.approvalStatus === 'pending_farm_mech' ? 'pending_state_manager' : raw.approvalStatus, photos: raw.photos || [], history: raw.history || [] };
}
export const APPROVAL_CHAIN = [
  { role: 'area_manager', status: 'pending_area_manager', key: 'areaManager', label: 'Area Manager' },
  { role: 'district_manager', status: 'pending_district_manager', key: 'districtManager', label: 'District Manager' },
  { role: 'state_manager', status: 'pending_state_manager', key: 'stateManager', label: 'State Manager' },
  { role: 'farm_mechanization', status: 'pending_farm_mech', key: 'farmMechManager', label: 'Farm Mechanization Team' },
] as const;
export function maintenanceRoute(machine: FieldMachine, users: UserProfile[], requestedByUid?: string) {
  const roles = new Set(reportingAncestors(users, machine.cfId || machine.currentHolderId).map(user => user.role));
  const requesterRole = users.find(user => user.uid === requestedByUid)?.role;
  return APPROVAL_CHAIN.filter(stage => (!['area_manager', 'district_manager'].includes(stage.role) || roles.has(stage.role)) && stage.role !== requesterRole);
}
export function resolveMaintenanceRoute(raw: any, machine: FieldMachine, users: UserProfile[]) {
  const request = normalizeFieldMaintenance(raw), index = APPROVAL_CHAIN.findIndex(stage => stage.status === request.status);
  if (index < 0) return request;
  const available = maintenanceRoute(machine, users, request.requestedByUid);
  return { ...request, status: APPROVAL_CHAIN.slice(index).find(stage => available.some(item => item.role === stage.role))?.status || request.status };
}
export function resolveServiceRoute(raw: any, machine: FieldMachine, users: UserProfile[]) {
  const log = normalizeServiceLog(raw);
  const resolved = resolveMaintenanceRoute({ ...log, status: log.approvalStatus, workflowVersion: 2 }, machine, users);
  return { ...log, approvalStatus: resolved.status as FieldServiceLog['approvalStatus'] };
}
export const MAINTENANCE_STATUS: Record<MaintenanceRequest['status'], string> = {
  pending_area_manager: 'Area Manager review', pending_district_manager: 'District Manager review',
  pending_state_manager: 'State Manager review', pending_farm_mech: 'Farm Mechanization Team · final review',
  pending_admin: 'Farm Mechanization Team · final review', approved: 'Approved · ready for repair',
  in_progress: 'Repair in progress', completed: 'Repair completed', rejected: 'Rejected', cancelled: 'Cancelled',
};
export function normalizeFieldMaintenance(raw: any): FieldMaintenance {
  // Older demos used the Farm Mech status for the State Manager and Admin as final reviewer.
  const status = !raw.status || raw.status === 'open' ? 'pending_area_manager' : raw.workflowVersion === 2 ? raw.status : raw.status === 'pending_farm_mech' ? 'pending_state_manager' : ['pending_admin', 'approved', 'in_progress'].includes(raw.status) ? 'pending_farm_mech' : raw.status;
  return { ...raw, status, legacyStatus: raw.workflowVersion !== 2 ? raw.status : undefined, photos: raw.photos || [], estimatedCost: raw.estimatedCost || 0, history: raw.history || [], workflowVersion: 2 };
}
export const pendingRole = (request: FieldMaintenance) => APPROVAL_CHAIN.find(stage => stage.status === request.status)?.role;
export function canReviewMaintenance(actor: UserProfile, request: FieldMaintenance, machine: FieldMachine, users: UserProfile[]) {
  return pendingRole(request) === actor.role && request.requestedByUid !== actor.uid && canManageMachine(actor, machine, users);
}
async function context(actor: UserProfile, machineId: string) {
  const [profile, snapshot, userDocs] = await Promise.all([getDoc(doc(db, 'users', actor.uid)), getDoc(doc(db, 'planters', machineId)), getDocs(collection(db, 'users'))]);
  if (!profile.exists() || profile.data().role !== actor.role) throw new Error('Your role changed. Switch accounts or reload before continuing.');
  if (!snapshot.exists()) throw new Error('Machine not found.');
  const machine = snapshot.data() as FieldMachine, users = userDocs.docs.map(record => record.data() as UserProfile);
  if (!canManageMachine(profile.data() as UserProfile, machine, users)) throw new Error('This machine is outside your reporting branch.');
  return { machine, users };
}
const event = (actor: UserProfile, action: string, note = ''): MaintenanceEvent => ({ action, by: actor.uid, name: actor.displayName, role: actor.role, at: new Date().toISOString(), note: note.trim() });
function notify(commit: ReturnType<typeof writeBatch>, users: UserProfile[], role: UserRole, machine: FieldMachine, title: string, message: string) {
  for (const recipient of users.filter(user => user.role === role && canManageMachine(user, machine, users))) {
    const id = crypto.randomUUID();
    commit.set(doc(db, 'notifications', id), { userId: recipient.uid, title, message, type: 'info', read: false, timestamp: new Date().toISOString(), link: machine.id, page: 'maintenance' });
  }
}
const active = (request: { status: string }) => !['completed', 'rejected', 'cancelled'].includes(request.status);

export async function raiseMaintenance(actor: UserProfile, machineId: string, details: { requestType: 'repair' | 'regular_service'; severity: MaintenanceRequest['severity']; description: string; partDamaged: string; estimatedCost: number; photos: string[]; machineStopped: boolean }) {
 if(isRemoteBrowser)return remoteCommand('raiseMaintenance',[machineId,details]);
  if (!['cf', 'jcf', 'area_manager', 'district_manager'].includes(actor.role)) throw new Error('Field staff or their Area / District Manager must raise the request.');
  const { machine, users } = await context(actor, machineId);
  if (details.description.trim().length < 10) throw new Error('Describe the problem in at least 10 characters.');
  if (!Number.isFinite(details.estimatedCost) || details.estimatedCost < 0) throw new Error('Estimated cost cannot be negative.');
  if (!details.photos.length) throw new Error('Add a photo of the issue or service requirement.');
  const existing = await getDocs(collection(db, 'maintenance_requests'));
  if (existing.docs.some(record => record.data().planterId === machineId && active(record.data() as any))) throw new Error('This machine already has an open maintenance request. Follow its progress below.');
  const id = crypto.randomUUID();
  const request: FieldMaintenance = { ...details, description: details.description.trim(), id, workflowVersion: 2, planterId: machineId, requestedBy: actor.displayName, requestedByUid: actor.uid, currentHolderUid: machine.cfId || machine.currentHolderId, currentHolderName: users.find(user => user.uid === (machine.cfId || machine.currentHolderId))?.displayName || '', timestamp: new Date().toISOString(), status: maintenanceRoute(machine, users, actor.uid)[0].status, approvals: {}, history: [event(actor, 'Request raised')] };
  const commit = writeBatch(db);
  commit.set(doc(db, 'maintenance_requests', id), request);
  if (details.machineStopped) commit.update(doc(db, 'planters', machineId), { status: 'maintenance', operatingStatus: 'maintenance', lastUpdated: request.timestamp });
  notify(commit, users, maintenanceRoute(machine, users, actor.uid)[0].role, machine, 'Maintenance review required', `${machineId}: ${request.description}`);
  await commit.commit(); return request;
}

export async function reviewMaintenance(actor: UserProfile, requestId: string, decision: 'approve' | 'reject', note: string) {
 if(isRemoteBrowser)return remoteCommand('reviewMaintenance',[requestId,decision,note]);
  const snapshot = await getDoc(doc(db, 'maintenance_requests', requestId));
  if (!snapshot.exists()) throw new Error('Request not found.');
  const raw = { ...snapshot.data(), id: snapshot.id } as FieldMaintenance;
  const { machine, users } = await context(actor, raw.planterId);
  const request = resolveMaintenanceRoute(raw, machine, users);
  if (!canReviewMaintenance(actor, request, machine, users)) throw new Error('Only the current reviewer in this machine’s reporting branch can make this decision.');
  if (decision === 'reject' && note.trim().length < 3) throw new Error('Give a reason for rejecting this request.');
  const route = maintenanceRoute(machine, users, request.requestedByUid);
  const index = route.findIndex(stage => stage.status === request.status);
  const stage = route[index], next = route[index + 1];
  const status = decision === 'reject' ? 'rejected' : next?.status || 'approved';
  const commit = writeBatch(db);
  commit.update(doc(db, 'maintenance_requests', requestId), { workflowVersion: 2, status, approvals: { ...request.approvals, [stage.key]: { approved: decision === 'approve', by: actor.displayName, at: new Date().toISOString() } }, history: [...request.history, event(actor, decision === 'approve' ? `${stage.label} approved` : `${stage.label} rejected`, note)] });
  if (decision === 'approve') notify(commit, users, next?.role || 'admin', machine, next ? 'Maintenance review required' : 'Maintenance approved for repair', `${request.planterId}: ${next ? `waiting for ${next.label}` : 'Farm Mechanization Team gave final approval. Coordinate the repair.'}`);
  if (decision === 'approve' && !next) {
    notify(commit, users, 'cf', machine, 'Repair report required after service', `${machine.id}: final approval given. After the service team finishes, submit repairs, parts, cost, photos and the workable confirmation.`);
    notify(commit, users, 'jcf', machine, 'Repair report required after service', `${machine.id}: final approval given. Submit the service completion report after repairs.`);
  }
  if (request.requestedByUid) commit.set(doc(db, 'notifications', crypto.randomUUID()), { userId: request.requestedByUid, title: decision === 'reject' ? 'Maintenance rejected' : 'Maintenance approval updated', message: `${request.planterId}: ${MAINTENANCE_STATUS[status]}${note ? ` — ${note.trim()}` : ''}`, type: decision === 'reject' ? 'error' : 'info', read: false, timestamp: new Date().toISOString(), link: request.planterId });
  await commit.commit();
}

export async function startMaintenance(actor: UserProfile, requestId: string) {
 if(isRemoteBrowser)return remoteCommand('startMaintenance',[requestId]);
  if (actor.role !== 'admin') throw new Error('Admin coordinates approved repairs.');
  const snapshot = await getDoc(doc(db, 'maintenance_requests', requestId));
  if (!snapshot.exists()) throw new Error('Request not found.');
  const request = normalizeFieldMaintenance({ ...snapshot.data(), id: snapshot.id });
  await context(actor, request.planterId);
  if (request.status !== 'approved') throw new Error('Repair can start only after final Farm Mechanization Team approval.');
  const commit = writeBatch(db);
  commit.update(doc(db, 'maintenance_requests', requestId), { status: 'in_progress', history: [...request.history, event(actor, 'Repair started')] });
  commit.update(doc(db, 'planters', request.planterId), { status: 'maintenance', operatingStatus: 'maintenance', lastUpdated: new Date().toISOString() });
  await commit.commit();
}

export async function completeMaintenance(actor: UserProfile, requestId: string, details: { technician: string; actualCost: number; repairNotes: string; repairPhotos: string[]; partsReplaced?: string; serviceDate?: string; workableConfirmed?: boolean }) {
 if(isRemoteBrowser)return remoteCommand('completeMaintenance',[requestId,details]);
  if (!['cf', 'jcf', 'admin'].includes(actor.role)) throw new Error('The responsible CF/JCF must submit the service report.');
  const snapshot = await getDoc(doc(db, 'maintenance_requests', requestId));
  if (!snapshot.exists()) throw new Error('Request not found.');
  const request = normalizeFieldMaintenance({ ...snapshot.data(), id: snapshot.id });
  const { machine, users } = await context(actor, request.planterId);
  if (!['approved','in_progress'].includes(request.status)) throw new Error('Farm Mechanization final approval is required before the repair report.');
  if (!request.approvals?.farmMechManager?.approved) throw new Error('Final Farm Mechanization approval must be recorded.');
  if (actor.role !== 'admin' && (!details.serviceDate || !details.partsReplaced?.trim())) throw new Error('Enter the service date and parts / service performed.');
  if (actor.role !== 'admin' && details.workableConfirmed !== true) throw new Error('Confirm the machine was tested and is workable.');
  if (details.serviceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(details.serviceDate) || !Number.isFinite(Date.parse(details.serviceDate + 'T12:00:00Z')) || details.serviceDate > new Date().toLocaleDateString('en-CA'))) throw new Error('Enter today or an earlier service date.');
  if (!details.technician.trim() || details.repairNotes.trim().length < 10) throw new Error('Enter the technician and describe the repair work.');
  if (!Number.isFinite(details.actualCost) || details.actualCost < 0) throw new Error('Enter a valid repair cost.');
  if (!details.repairPhotos.length) throw new Error('Add a photo showing the completed repair.');
  const others = await getDocs(collection(db, 'maintenance_requests'));
  if (others.docs.some(row => row.id !== requestId && row.data().planterId === machine.id && row.data().machineStopped && active(row.data() as any))) throw new Error('Another stopped-machine maintenance request is still open. Resolve it before confirming workable status.');
  const now = new Date().toISOString(), commit = writeBatch(db);
  commit.update(doc(db, 'maintenance_requests', requestId), { ...details, status: 'completed', completedAt: now, resolutionSubmittedAt: now, resolutionSubmittedByUid: actor.uid, resolutionSubmittedByName: actor.displayName, history: [...request.history, event(actor, 'Repair completed', `${details.repairNotes.trim()} · ₹${details.actualCost}`)] });
  commit.set(doc(db, 'maintenance_logs', requestId), { workflowVersion: 2, planterId: machine.id, requestId, technicianName: details.technician.trim(), partsUsed: details.partsReplaced?.trim() ? details.partsReplaced.split(',').map(part=>part.trim()).filter(Boolean) : request.partDamaged ? [request.partDamaged] : [], notes: details.repairNotes.trim(), cost: details.actualCost, timestamp: now, createdByUid: actor.uid, approvalStatus: 'approved', approvals: request.approvals, photos: details.repairPhotos, history: [...request.history, event(actor, 'Repair completed', details.repairNotes)] });
  commit.update(doc(db, 'planters', machine.id), { status: 'idle', operatingStatus: 'idle', lastUpdated: now });
  for (const role of ['cf','jcf','area_manager','district_manager','state_manager','farm_mechanization','admin'] as UserRole[]) notify(commit, users, role, machine, 'Repair report completed · machine workable', `${machine.id}: ${details.technician}, actual cost ₹${details.actualCost}. Repairs, parts and photo proof are available to your team.`);
  await commit.commit();
}

export async function reviewServiceLog(actor: UserProfile, logId: string, decision: 'approve' | 'reject', note: string) {
 if(isRemoteBrowser)return remoteCommand('reviewServiceLog',[logId,decision,note]);
  const snapshot = await getDoc(doc(db, 'maintenance_logs', logId));
  if (!snapshot.exists()) throw new Error('Service log not found.');
  const raw = { ...snapshot.data(), id: snapshot.id } as FieldServiceLog;
  const { machine, users } = await context(actor, raw.planterId);
  const log = resolveServiceRoute(raw, machine, users), route = maintenanceRoute(machine, users);
  const index = route.findIndex(stage => stage.status === log.approvalStatus);
  const stage = route[index], next = route[index + 1];
  if (!stage || stage.role !== actor.role || log.createdByUid === actor.uid) throw new Error('Only the current reviewer can approve this service log.');
  if (decision === 'reject' && note.trim().length < 3) throw new Error('Give a rejection reason.');
  const commit = writeBatch(db);
  commit.update(doc(db, 'maintenance_logs', logId), { workflowVersion: 2, approvalStatus: decision === 'reject' ? 'rejected' : next?.status || 'approved', approvals: { ...log.approvals, [stage.key]: { approved: decision === 'approve', by: actor.displayName, at: new Date().toISOString() } }, history: [...log.history, event(actor, decision === 'approve' ? `${stage.label} approved service log` : `${stage.label} rejected service log`, note)] });
  if (decision === 'approve' && next) notify(commit, users, next.role, machine, 'Service log review required', `${machine.id}: technician service log requires ${next.label} review.`);
  await commit.commit();
}
