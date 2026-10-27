import assert from 'node:assert/strict';
import { build } from 'esbuild';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
globalThis.window = new EventTarget();
window.location = { origin: 'http://localhost:3001' };
const bundled = await build({ stdin: { contents: "export * from './src/lib/fieldOperations'; export * from './src/lib/teamManagement'; export * as data from './src/lib/data'; export { demoUsers } from './src/lib/demo';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'browser', define: { 'import.meta.env': JSON.stringify({ DEV: true, VITE_LOCAL_DEMO: 'true' }) } });
const { data, demoUsers, ...workflow } = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const [admin, state, district, area, cf, jcf] = demoUsers;
const details={displayName:'Demo new CF',email:'new-cf@demo.local',role:'cf',parentId:area.uid,assignedState:'Telangana',assignedDistrict:'Nizamabad',assignedMandal:'Armoor',assignedArea:'Armoor'};
for(const actor of [state,district,area,cf,jcf,demoUsers[6]]) await assert.rejects(workflow.createTeamUser(actor,details));
await assert.rejects(workflow.createTeamUser({...cf,role:'admin'},details));
await assert.rejects(workflow.createTeamUser(admin,{...details,role:'admin'}));
await assert.rejects(workflow.createTeamUser(admin,{...details,parentId:jcf.uid}));
await assert.rejects(workflow.createTeamUser(admin,{...details,email:'invalid'}));
const created=await workflow.createTeamUser(admin,details);
assert.equal(created.parentId,area.uid);
assert.ok((await data.getDoc(data.doc({},'publicProfiles',created.uid))).exists());
await assert.rejects(workflow.createTeamUser(admin,{...details,email:'NEW-CF@DEMO.LOCAL'}));
let parent=admin;
for(const role of ['state_manager','district_manager','area_manager','cf','jcf']) { parent=await workflow.createTeamUser(admin,{...details,displayName:'DEMO '+role,email:role+'-new@demo.local',role,parentId:parent.uid}); }
assert.equal(workflow.branchIds((await data.getDocs(data.collection({},'users'))).docs.map(d=>d.data()),admin.uid).has(parent.uid),true);
assert.equal((await data.getDocs(data.collection({},'team_audit'))).size,6);
console.log('Team management passed: Admin-only creation, all five operational roles, reporting hierarchy, duplicate email, persisted profiles and creation audit.');
