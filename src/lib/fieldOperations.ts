import { qrBatchPrefix } from './qrBatchIdentity.js';
import { isPresetLocation, STATE_DISTRICTS } from './locations.js';
import { isRemoteBrowser, remoteCommand } from './backendClient.js';
import { collection, doc, getDoc, getDocs, writeBatch } from './data.js';
import { db } from './database.js';
import type { Planter, UserProfile, UserRole } from '../types.js';

export const MACHINE_TYPES = ['MCP', 'Drum seeder', 'Laser land leveller', 'Other'] as const;
export const ROLE_NAMES: Record<UserRole, string> = { farm_mechanization: 'Farm Mechanization Team', admin: 'Admin team', state_manager: 'State manager', district_manager: 'District manager', area_manager: 'Area manager', cf: 'Community facilitator', jcf: 'JCF / Field operator' };
export function parseQRIdentifier(text: string): string {
  let id = text.trim();
  if (id.includes('/scan/') || id.includes('?id=')) {
    const url = new URL(id, window.location.origin);
    id = url.searchParams.get('id') || decodeURIComponent(url.pathname.split('/scan/')[1] || '');
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(id)) throw new Error('Enter a valid printed QR ID or scan link.');
  return id;
}
export interface QRBatchDetails { state?: string; district?: string; year?: number; season?: string }
export interface QRBatch extends QRBatchDetails { id: string; name: string; quantity: number; createdAt: string; createdBy: string }
export interface QRLabel { id: string; batchId: string; holderId: string; status: 'available' | 'attached'; machineId?: string; createdAt: string }
export interface LabelTransfer { id: string; labelIds: string[]; fromUserId: string; toUserId: string; timestamp: string }
export interface FieldMachine extends Planter { qrLabelId?: string; onboardedBy?: string; leadFarmerId?: string; cfId?: string }
export interface FieldLocation { state: string; district: string; mandal: string; village: string; lat: number; lng: number }
export interface LeadFarmer extends FieldLocation { id: string; machineId: string; name: string; phone: string; landAcres: number; photos: string[]; createdAt: string; createdBy: string; status?:'active'|'released'; releasedAt?:string; releasedBy?:string; releaseReason?:string }
export interface FieldUsage extends FieldLocation { id: string; machineId: string; leadFarmerId: string; farmerKind: 'lead' | 'fellow'; farmerName: string; phone: string; landAcres: number; crop: string; operationDate: string; photos: string[]; notes: string; recordedBy: string; recordedByName: string; createdAt: string }

export function branchIds(users: UserProfile[], root: string): Set<string> {
  const ids = new Set([root]);
  let changed = true;
  while (changed) { changed = false; for (const user of users) if (user.parentId && ids.has(user.parentId) && !ids.has(user.uid)) { ids.add(user.uid); changed = true; } }
  return ids;
}
export function canManageMachine(actor: UserProfile, machine: FieldMachine, users: UserProfile[]) {
  return actor.role === 'admin' || actor.role === 'farm_mechanization' || branchIds(users, actor.uid).has(machine.cfId || machine.currentHolderId) || (actor.role === 'jcf' && actor.parentId === (machine.cfId || machine.currentHolderId));
}
export function reportingAncestors(users: UserProfile[], uid: string) {
  const ancestors: UserProfile[] = [], seen = new Set<string>();
  let current = users.find(user => user.uid === uid);
  while (current && !seen.has(current.uid)) { seen.add(current.uid); ancestors.push(current); current = users.find(user => user.uid === current!.parentId); }
  return ancestors;
}
export function canReceiveLabels(actor: UserProfile, recipient: UserProfile, users: UserProfile[]) {
  if (!branchIds(users, actor.uid).has(recipient.uid)) return false;
  if (actor.role === 'district_manager') return recipient.role === 'area_manager';
  if (actor.role !== 'admin') return false;
  return recipient.role === 'district_manager' || (recipient.role === 'area_manager' && !reportingAncestors(users, recipient.uid).some(user => user.role === 'district_manager'));
}
function required(value: string, name: string) { if (!value?.trim()) throw new Error(`${name} is required.`); }
function validateLocation(location: FieldLocation) {
  required(location.state, 'State'); required(location.district, 'District'); required(location.mandal, 'Mandal'); required(location.village, 'Village');
  if (!Number.isFinite(location.lat) || Math.abs(location.lat) > 90 || !Number.isFinite(location.lng) || Math.abs(location.lng) > 180) throw new Error('Enter valid latitude and longitude, or capture GPS.');
}
async function usersList() { return (await getDocs(collection(db, 'users'))).docs.map(record => record.data() as UserProfile); }
async function machineFor(actor: UserProfile, id: string): Promise<FieldMachine> {
  const profile = await getDoc(doc(db, 'users', actor.uid));
  if (!profile.exists() || profile.data().role !== actor.role) throw new Error('Your role changed. Reload your account.');
  const snapshot = await getDoc(doc(db, 'planters', id));
  if (!snapshot.exists()) throw new Error('This machine could not be found.');
  const machine = snapshot.data() as FieldMachine;
  if (!canManageMachine(actor, machine, await usersList())) throw new Error('This machine is outside your reporting team.');
  return machine;
}

export async function createQRBatch(actor: UserProfile, name: string, quantity: number, details: QRBatchDetails = {}): Promise<QRBatch> {
 if(isRemoteBrowser)return remoteCommand('createQRBatch',[name,quantity,details]);
  if (actor.role !== 'admin') throw new Error('Only the Admin team can generate QR labels.');
  required(name, 'Batch name');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) throw new Error('Generate between 1 and 200 labels per batch.');
  const state = typeof details.state === 'string' ? details.state.trim() : '';
  const district = typeof details.district === 'string' ? details.district.trim() : '';
  const season = typeof details.season === 'string' ? details.season.trim() : '';
  if (state && !Object.hasOwn(STATE_DISTRICTS, state)) throw new Error('Choose a supported state.');
  if (district && !isPresetLocation(state, district)) throw new Error('Choose a district in the selected state.');
  if (details.year !== undefined && (!Number.isInteger(details.year) || details.year < 2000 || details.year > 2100)) throw new Error('Choose a year between 2000 and 2100.');
  if (season && !['Kharif', 'Rabi', 'Zaid / Summer', 'Other'].includes(season)) throw new Error('Choose a valid season.');
  const metadata: QRBatchDetails = { ...(state ? { state } : {}), ...(district ? { district } : {}), ...(details.year !== undefined ? { year: details.year } : {}), ...(season ? { season } : {}) };
  const batchId = crypto.randomUUID();
  const batch: QRBatch = { id: batchId, name: name.trim(), quantity, ...metadata, createdAt: new Date().toISOString(), createdBy: actor.uid };
  const commit = writeBatch(db);
  commit.set(doc(db, 'qr_batches', batchId), batch);
  const prefix = qrBatchPrefix(metadata,batchId);
  if ((await getDoc(doc(db, 'qr_labels', `${prefix}-001`))).exists()) throw new Error('Could not reserve unique label IDs. Please generate the batch again.');
  for (let index = 1; index <= quantity; index++) {
    const id = `${prefix}-${String(index).padStart(3, '0')}`;
    const label: QRLabel = { id, batchId, holderId: actor.uid, status: 'available', createdAt: batch.createdAt };
    commit.set(doc(db, 'qr_labels', id), label);
  }
  await commit.commit(); return batch;
}

/** Extend a batch without changing any distributed or attached label. */
export async function addBatchStickers(actor:UserProfile,batchId:string,quantity:number){
 if(isRemoteBrowser)return remoteCommand('addBatchStickers',[batchId,quantity]);
 const profile=await getDoc(doc(db,'users',actor.uid));
 if(!profile.exists()||profile.data().role!=='admin'||actor.role!=='admin')throw new Error('Only the Admin team can add stickers.');
 if(!Number.isInteger(quantity)||quantity<1||quantity>200)throw new Error('Add between 1 and 200 stickers at a time.');
 const snapshot=await getDoc(doc(db,'qr_batches',batchId));if(!snapshot.exists())throw new Error('Batch not found.');
 const batch=snapshot.data() as QRBatch;
 const labels=(await getDocs(collection(db,'qr_labels'))).docs.map(row=>row.data() as QRLabel).filter(row=>row.batchId===batchId);
 const numbered=labels.map(label=>({label,match:label.id.match(/^(.*)-(\d+)$/)})).filter(row=>row.match);
 const prefixes=new Set(numbered.map(row=>row.match![1]));
 if(prefixes.size>1||numbered.length!==labels.length)throw new Error('This batch has mixed label numbering. Please create a new batch.');
 const prefix=numbered[0]?.match?.[1]||`QR-${new Date(batch.createdAt).getFullYear()}-${batchId.slice(0,8).toUpperCase()}`;
 const last=Math.max(batch.quantity,0,...numbered.map(row=>Number(row.match![2])));
 const ids=Array.from({length:quantity},(_,index)=>`${prefix}-${String(last+index+1).padStart(3,'0')}`);
 for(const id of ids)if((await getDoc(doc(db,'qr_labels',id))).exists())throw new Error('Label numbering conflict. Reload and try again.');
 const timestamp=new Date().toISOString(),commit=writeBatch(db);
 for(const id of ids)commit.set(doc(db,'qr_labels',id),{id,batchId,holderId:actor.uid,status:'available',createdAt:timestamp});
 commit.update(doc(db,'qr_batches',batchId),{quantity:Math.max(batch.quantity,labels.length)+quantity});
 const eventId=crypto.randomUUID();commit.set(doc(db,'qr_batch_additions',eventId),{id:eventId,batchId,quantity,labelIds:ids,createdBy:actor.uid,timestamp});
 await commit.commit();return ids;
}

export async function distributeQRLabels(actor: UserProfile, labelIds: string[], recipientId: string) {
 if(isRemoteBrowser)return remoteCommand('distributeQRLabels',[labelIds,recipientId]);
  const users = await usersList();
  const recipient = users.find(user => user.uid === recipientId);
  if (!recipient || !canReceiveLabels(actor, recipient, users)) throw new Error('Choose a manager in the next level of your reporting team.');
  const uniqueIds = [...new Set(labelIds)];
  if (!uniqueIds.length) throw new Error('Select at least one blank QR label.');
  const labels = await Promise.all(uniqueIds.map(id => getDoc(doc(db, 'qr_labels', id))));
  const commit = writeBatch(db);
  for (const snapshot of labels) {
    const label = snapshot.data() as QRLabel | undefined;
    if (!label || label.holderId !== actor.uid || label.status !== 'available') throw new Error('Only unused labels currently held by you can be distributed. Refresh your selection.');
    commit.update(doc(db, 'qr_labels', label.id), { holderId: recipientId });
  }
  const id = crypto.randomUUID();
  commit.set(doc(db, 'qr_transfers', id), { id, labelIds: uniqueIds, fromUserId: actor.uid, toUserId: recipientId, timestamp: new Date().toISOString() });
  await commit.commit();
}

export async function onboardFieldMachine(actor: UserProfile, labelId: string, details: FieldLocation & { machineType: string; brand: string; model: string; serialNumber: string; cfId: string; photos: string[] }) {
 if(isRemoteBrowser)return remoteCommand('onboardFieldMachine',[labelId,details]);
  if (!['area_manager', 'district_manager'].includes(actor.role)) throw new Error('An Area or District Manager must onboard the machine.');
  const profile = await getDoc(doc(db, 'users', actor.uid));
  if (!profile.exists() || profile.data().role !== actor.role) throw new Error('Your role changed. Reload your account.');
  validateLocation(details); required(details.machineType, 'Machine type');
  const labelSnap = await getDoc(doc(db, 'qr_labels', labelId));
  const label = labelSnap.data() as QRLabel | undefined;
  if (!label || label.status !== 'available') throw new Error('This QR label is already attached or was not generated by the Admin team.');
  if (label.holderId !== actor.uid) throw new Error('This label must be distributed to your account before onboarding.');
  const users = await usersList();
  const cf = users.find(user => user.uid === details.cfId && user.role === 'cf');
  if (!cf || !branchIds(users, actor.uid).has(cf.uid) || (actor.role === 'district_manager' && cf.parentId !== actor.uid)) throw new Error('Select a CF reporting directly to you when no Area Manager is assigned.');
  if ((await getDoc(doc(db, 'planters', labelId))).exists()) throw new Error('This label already has a machine record.');
  const now = new Date().toISOString();
  const machine: FieldMachine = {
    id: labelId, qrLabelId: labelId, machineType: details.machineType, type: details.machineType,
    brand: details.brand.trim(), model: details.model.trim(), serialNumber: details.serialNumber.trim(),
    state: details.state, district: details.district, mandal: details.mandal, location: details.village, lat: details.lat, lng: details.lng,
    cfId: cf.uid, currentHolderId: cf.uid, currentHolderRole: 'cf', cfJf: cf.uid,
    status: 'registered_unused', operatingStatus: 'idle', lastReading: 0, lastUpdated: now, registrationDate: now,
    onboardedBy: actor.uid, gallery: details.photos,
  };
  const commit = writeBatch(db);
  commit.set(doc(db, 'planters', labelId), machine);
  commit.update(doc(db, 'qr_labels', labelId), { status: 'attached', machineId: labelId });
  await commit.commit(); return machine;
}

export async function onboardLeadFarmer(actor: UserProfile, machineId: string, details: FieldLocation & { name: string; phone: string; landAcres: number; photos: string[] }) {
 if(isRemoteBrowser)return remoteCommand('onboardLeadFarmer',[machineId,details]);
  if (!['cf', 'jcf', 'area_manager'].includes(actor.role)) throw new Error('The assigned CF, JCF or Area Manager must onboard the lead farmer.');
  const machine = await machineFor(actor, machineId);
  if (machine.leadFarmerId) throw new Error('This machine already has a lead farmer. Record a usage visit instead.');
  validateLocation(details); required(details.name, 'Lead farmer name');
  if (!/^\d{10}$/.test(details.phone.replace(/[\s-]/g, ''))) throw new Error('Enter a 10-digit mobile number.');
  if (!Number.isFinite(details.landAcres) || details.landAcres <= 0) throw new Error('Land size must be greater than zero.');
  if (!details.photos.length) throw new Error('Add at least one lead farmer or handover photo.');
  const id = crypto.randomUUID(), now = new Date().toISOString();
  const farmer: LeadFarmer = { ...details, name: details.name.trim(), id, machineId, createdAt: now, createdBy: actor.uid };
  const commit = writeBatch(db);
  commit.set(doc(db, 'farmers', id), farmer);
  commit.update(doc(db, 'planters', machineId), { leadFarmerId: id, currentCustodian: farmer.name, initialOperator: farmer.name, lastUpdated: now });
  commit.set(doc(db, 'planters', machineId, 'usageLogs', id), { type: 'onboarding', farmerName: farmer.name, initialOperator: farmer.name, handoverTo: farmer.name, cfJf: machine.cfId || machine.currentHolderId, timestamp: now, imageUrl: farmer.photos[0], location: { village: farmer.village, mandal: farmer.mandal, district: farmer.district, gps: { lat: farmer.lat, lng: farmer.lng } } });
  await commit.commit(); return farmer;
}

export async function recordFarmerUsage(actor: UserProfile, machineId: string, details: Omit<FieldUsage, 'id' | 'machineId' | 'leadFarmerId' | 'recordedBy' | 'recordedByName' | 'createdAt'>) {
 if(isRemoteBrowser)return remoteCommand('recordFarmerUsage',[machineId,details]);
  if (!['cf', 'jcf', 'area_manager'].includes(actor.role)) throw new Error('A CF, JCF or Area Manager must record field usage.');
  const machine = await machineFor(actor, machineId);
  if (!machine.leadFarmerId) throw new Error('Onboard the lead farmer before recording usage.');
  if (machine.status === 'maintenance' || machine.operatingStatus === 'maintenance') throw new Error('This machine is under maintenance. Record usage only after the repair is completed.');
  validateLocation(details); required(details.farmerName, 'Farmer name'); required(details.crop, 'Crop sown');
  if (!Number.isFinite(details.landAcres) || details.landAcres <= 0) throw new Error('Area worked must be greater than zero.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(details.operationDate) || !Number.isFinite(new Date(details.operationDate + 'T12:00:00').getTime()) || details.operationDate > new Date().toLocaleDateString('en-CA')) throw new Error('Choose today or an earlier usage date.');
  if (!details.photos.length) throw new Error('Add at least one field or work photo.');
  const id = crypto.randomUUID(), now = new Date().toISOString();
  const usage: FieldUsage = { ...details, id, machineId, leadFarmerId: machine.leadFarmerId, recordedBy: actor.uid, recordedByName: actor.displayName, createdAt: now };
  const location = { village: details.village, mandal: details.mandal, district: details.district, gps: { lat: details.lat, lng: details.lng } };
  const commit = writeBatch(db);
  commit.set(doc(db, 'field_usage', id), usage);
  commit.set(doc(db, 'planters', machineId, 'usageLogs', id), { ...usage, type: 'usage', timestamp: now, imageUrl: details.photos[0], acresCovered: details.landAcres, cropType: details.crop, location });
  commit.set(doc(db, 'updates', id), { planterId: machineId, type: 'handover', timestamp: now, usageStartDate: details.operationDate, updatedBy: actor.displayName, farmerName: details.farmerName, jcfName: details.farmerName, cropType: details.crop, acresCovered: details.landAcres, areaAcres: details.landAcres, distanceKm: 0, previousReading: machine.lastReading || 0, newReading: machine.lastReading || 0, imageUrl: details.photos[0], location });
  // Responsibility remains with the CF and lead farmer, regardless of who uses the machine.
  commit.update(doc(db, 'planters', machineId), { status: 'in_use', operatingStatus: 'operating', lastUpdated: now });
  await commit.commit(); return usage;
}

export async function assignResponsibleCF(actor: UserProfile, machineId: string, cfId: string) {
 if(isRemoteBrowser)return remoteCommand('assignResponsibleCF',[machineId,cfId]);
  if (!['area_manager','district_manager'].includes(actor.role)) throw new Error('Only Area or District Managers assign machines.');
  const machine = await machineFor(actor,machineId), users = await usersList(), cf = users.find(user=>user.uid===cfId&&user.role==='cf');
  if (!cf || !branchIds(users,actor.uid).has(cf.uid) || (actor.role==='district_manager'&&cf.parentId!==actor.uid)) throw new Error('Select a CF reporting directly to your team.');
  const commit=writeBatch(db), now=new Date().toISOString();
  commit.update(doc(db,'planters',machineId),{cfId:cf.uid,currentHolderId:cf.uid,currentHolderRole:'cf',cfJf:cf.uid,lastUpdated:now});
  commit.set(doc(db,'machine_assignments',crypto.randomUUID()),{machineId,fromCF:machine.cfId||machine.currentHolderId,toCF:cf.uid,assignedBy:actor.uid,timestamp:now});
  commit.set(doc(db,'notifications',crypto.randomUUID()),{userId:cf.uid,title:'Machine assigned',message:`${machineId} is now assigned to you. Scan its QR to manage farmers and usage.`,read:false,timestamp:now,link:machineId,page:'machines'});
  await commit.commit();
}
