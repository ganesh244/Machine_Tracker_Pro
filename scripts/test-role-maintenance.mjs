import assert from 'node:assert/strict';
import { build } from 'esbuild';
const saved = new Map();
globalThis.localStorage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
globalThis.window = new EventTarget(); window.location = { origin: 'http://localhost:3001' };
const compiled = await build({ stdin: { contents: "export * from './src/lib/maintenance'; export * as field from './src/lib/fieldOperations'; export * as data from './src/lib/data'; export { demoUsers, upgradeDemoRoles } from './src/lib/demo';", loader: 'ts', resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'browser', define: { 'import.meta.env': JSON.stringify({ DEV: true, VITE_LOCAL_DEMO: 'true' }) } });
const { data, field, demoUsers, upgradeDemoRoles, ...maintenance } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);
const [admin, state, district, area, cf, jcf, boss] = demoUsers, db = {};
let denied = 0;
async function rejects(promise, message) { await assert.rejects(promise, message); denied++; }
const secondBranch = [
  { ...state, uid: 'state-other', displayName: 'Other State', parentId: admin.uid, assignedState: 'Andhra Pradesh' },
  { ...district, uid: 'district-other', parentId: 'state-other' },
  { ...area, uid: 'area-other', parentId: 'district-other' },
  { ...cf, uid: 'cf-other', parentId: 'area-other' },
  { ...jcf, uid: 'jcf-other', parentId: 'cf-other' },
];
for (const user of secondBranch) await data.setDoc(data.doc(db, 'users', user.uid), user);
const users = [...demoUsers, ...secondBranch];
const own = { id: 'SCOPE-OWN', currentHolderId: cf.uid, cfId: cf.uid }, other = { id: 'SCOPE-OTHER', currentHolderId: 'cf-other', cfId: 'cf-other' };
for (const actor of [cf, jcf, area, district, state]) {
  assert.equal(field.canManageMachine(actor, own, users), true, `${actor.role}: own branch visible`);
  assert.equal(field.canManageMachine(actor, other, users), false, `${actor.role}: other branch hidden`);
}
for (const actor of [admin, boss]) {
  assert.equal(field.canManageMachine(actor, own, users), true);
  assert.equal(field.canManageMachine(actor, other, users), true, `${actor.role}: global oversight`);
}
const existing = { 'users/demo-admin': { ...admin, parentId: '' }, 'planters/KEEP': { id: 'KEEP', custom: 123 } };
assert.equal(upgradeDemoRoles(existing), true);
assert.equal(existing['planters/KEEP'].custom, 123, 'Role upgrade preserves existing field data');
assert.equal(existing['users/demo-admin'].parentId, boss.uid);
assert.equal(upgradeDemoRoles(existing), false, 'Role upgrade is idempotent');
for (const actor of [cf, jcf, area, district, state, boss]) await rejects(field.createQRBatch(actor, 'Not allowed', 2));
const batch = await field.createQRBatch(admin, 'Role audit batch', 2);
const ids = (await data.getDocs(data.collection(db, 'qr_labels'))).docs.map(record => record.id);
await field.distributeQRLabels(admin, ids, district.uid); await field.distributeQRLabels(district, ids, area.uid);
const location = { state: 'Telangana', district: 'Nizamabad', mandal: 'Armoor', village: 'Audit Village', lat: 18.79, lng: 78.28 };
const machineInput = { ...location, machineType: 'MCP', brand: 'Audit', model: '', serialNumber: '', cfId: cf.uid, photos: [] };
await rejects(field.onboardFieldMachine(admin, ids[0], machineInput));
const machine = await field.onboardFieldMachine(area, ids[0], machineInput);
const farmerInput = { ...location, name: 'Audit Lead Farmer', phone: '9876543210', landAcres: 4, photos: ['data:image/png;base64,proof'] };
for (const actor of [admin, state, district, boss]) await rejects(field.onboardLeadFarmer(actor, machine.id, farmerInput));
const farmer = await field.onboardLeadFarmer(cf, machine.id, farmerInput);
const usageInput = { ...location, farmerKind: 'lead', farmerName: farmer.name, phone: farmer.phone, landAcres: 1, crop: 'Paddy', operationDate: new Date().toLocaleDateString('en-CA'), photos: ['data:image/png;base64,field'], notes: '' };
for (const actor of [admin, state, district, boss, secondBranch[3]]) await rejects(field.recordFarmerUsage(actor, machine.id, usageInput));
const issue = { requestType: 'repair', severity: 'high', description: 'Drive chain is damaged and needs replacement', partDamaged: 'Drive chain', estimatedCost: 2500, photos: ['data:image/png;base64,issue'], machineStopped: true };
for (const actor of [admin, state, boss, secondBranch[3]]) await rejects(maintenance.raiseMaintenance(actor, machine.id, issue));
const request = await maintenance.raiseMaintenance(cf, machine.id, issue);
await rejects(maintenance.raiseMaintenance(jcf, machine.id, issue), 'Duplicate open requests denied');
await rejects(field.recordFarmerUsage(jcf, machine.id, usageInput), 'Usage paused while machine is stopped');
await rejects(maintenance.startMaintenance(admin, request.id), 'Admin cannot start before final approval');
for (const actor of [admin, state, district, boss, cf, jcf, secondBranch[2]]) await rejects(maintenance.reviewMaintenance(actor, request.id, 'approve', 'Wrong reviewer'));
await maintenance.reviewMaintenance(area, request.id, 'approve', 'Area inspection completed');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_requests', request.id))).data().status, 'pending_district_manager');
await rejects(maintenance.reviewMaintenance(area, request.id, 'approve', 'Duplicate decision'));
await rejects(maintenance.reviewMaintenance(secondBranch[1], request.id, 'approve', 'Other district'));
await maintenance.reviewMaintenance(district, request.id, 'approve', 'District review completed');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_requests', request.id))).data().status, 'pending_state_manager');
await rejects(maintenance.reviewMaintenance(secondBranch[0], request.id, 'approve', 'Other state'));
await maintenance.reviewMaintenance(state, request.id, 'approve', 'State budget review completed');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_requests', request.id))).data().status, 'pending_farm_mech');
await rejects(maintenance.reviewMaintenance(admin, request.id, 'approve', 'Admin must not approve'));
await rejects(maintenance.startMaintenance(admin, request.id), 'State approval is not final approval');
await maintenance.reviewMaintenance(boss, request.id, 'approve', 'Final approval by Farm Mechanization Team');
for (const actor of [cf, jcf, area, district, state, boss]) await rejects(maintenance.startMaintenance(actor, request.id));
await maintenance.startMaintenance(admin, request.id);
const completion = { technician: 'Audit Technician', actualCost: 2200, repairNotes: 'Replaced damaged drive chain and tested operation', repairPhotos: ['data:image/png;base64,repair'] };
await rejects(maintenance.completeMaintenance(cf, request.id, completion));
await rejects(maintenance.completeMaintenance(admin, request.id, { ...completion, repairPhotos: [] }));
await maintenance.completeMaintenance(admin, request.id, completion);
const finished = (await data.getDoc(data.doc(db, 'maintenance_requests', request.id))).data();
assert.equal(finished.status, 'completed'); assert.equal(finished.actualCost, 2200);
assert.equal(finished.history.length, 7, 'Request, four approvals, repair start and completion recorded');
assert.ok(finished.approvals.farmMechManager.approved); assert.ok(finished.approvals.stateManager.approved);
assert.equal((await data.getDoc(data.doc(db, 'planters', machine.id))).data().operatingStatus, 'idle');
await field.recordFarmerUsage(jcf, machine.id, usageInput);
await rejects(maintenance.completeMaintenance(admin, request.id, completion), 'No duplicate repair completion');
const rejected = await maintenance.raiseMaintenance(jcf, machine.id, { ...issue, machineStopped: false, requestType: 'regular_service' });
await rejects(maintenance.reviewMaintenance(area, rejected.id, 'reject', ''));
await maintenance.reviewMaintenance(area, rejected.id, 'reject', 'Service interval not reached; inspect next month');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_requests', rejected.id))).data().status, 'rejected');
const notifications = (await data.getDocs(data.collection(db, 'notifications'))).docs.map(record => record.data());
assert.equal(notifications.some(note => note.userId === 'state-other' && note.link === machine.id), false, 'Approval notifications do not leak to another state');
await data.setDoc(data.doc(db, 'maintenance_logs', 'legacy-service'), { planterId: machine.id, technicianName: 'Legacy technician', notes: 'Historical service record', approvalStatus: 'pending_farm_mech', createdByUid: cf.uid });
assert.equal(maintenance.normalizeServiceLog({ approvalStatus: 'pending_farm_mech' }).approvalStatus, 'pending_state_manager');
await maintenance.reviewServiceLog(state, 'legacy-service', 'approve', 'State review');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_logs', 'legacy-service'))).data().approvalStatus, 'pending_farm_mech');
await maintenance.reviewServiceLog(boss, 'legacy-service', 'approve', 'Final review');
assert.equal((await data.getDoc(data.doc(db, 'maintenance_logs', 'legacy-service'))).data().approvalStatus, 'approved');
for (const status of ['approved', 'in_progress']) {
  const id = `legacy-${status}`;
  await data.setDoc(data.doc(db, 'maintenance_requests', id), { planterId: machine.id, status, requestedByUid: cf.uid });
  assert.equal(maintenance.normalizeFieldMaintenance({ status }).status, 'pending_farm_mech');
  await rejects(maintenance.startMaintenance(admin, id), 'Historical approval needs final Farm Team review before continuation');
}
console.log(`Role audit passed: 7 roles, two independent state branches, safe saved-data upgrade, ${denied} denied invalid actions, four-stage approval, Admin repair proof, service log compatibility, scoped notifications and usage pause/resume.`);
