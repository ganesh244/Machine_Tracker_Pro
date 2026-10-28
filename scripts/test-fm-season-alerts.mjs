import assert from 'node:assert/strict';
import { build } from 'esbuild';
const saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};globalThis.window=new EventTarget();window.location={origin:'http://localhost:3001'};
const bundled=await build({stdin:{contents:"export * from './src/lib/fieldOperations'; export * from './src/lib/maintenance'; export * from './src/lib/seasonOperations'; export * from './src/lib/teamManagement'; export * as data from './src/lib/data'; export {demoUsers} from './src/lib/demo';",loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env':JSON.stringify({DEV:true,VITE_LOCAL_DEMO:'true'})}});
const {data,demoUsers,...api}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const [admin,state,district,area,cf,jcf,boss]=demoUsers,db={};
const save=async user=>data.setDoc(data.doc(db,'users',user.uid),user);
const extra=[
 {...state,uid:'other-state',assignedState:'Andhra Pradesh',assignedDistrict:'Nizamabad'},
 {...district,uid:'other-district',parentId:'other-state',assignedState:'Andhra Pradesh',assignedDistrict:'Nizamabad'},
 {...cf,uid:'other-cf',parentId:'other-district',assignedState:'Andhra Pradesh',assignedDistrict:'Nizamabad'},
 {...area,uid:'sangareddy-area',parentId:state.uid,assignedDistrict:'Sangareddy'},
 {...cf,uid:'sangareddy-cf',parentId:'sangareddy-area',assignedDistrict:'Sangareddy'},
 {...jcf,uid:'sangareddy-jcf',parentId:'sangareddy-cf',assignedDistrict:'Sangareddy'},
];for(const user of extra)await save(user);
const users=[...demoUsers,...extra];
const details={name:'FM Rabi campaign',state:'Telangana',district:'Sangareddy',seasonStart:'2026-12-01',seasonEnd:'2027-03-01',preAlertDate:'2026-10-01',postAlertDate:'2027-03-02'};
for(const actor of [state,area,cf,jcf])await assert.rejects(api.createSeasonSchedule(actor,details));
await assert.rejects(api.createSeasonSchedule(district,details),'District cannot schedule a different district');
await assert.rejects(api.createSeasonSchedule(boss,{...details,state:'Unknown state'}));
const schedule=await api.createSeasonSchedule(boss,details);assert.equal(schedule.audience,'location');
const recipients=api.seasonRecipients(schedule,users).map(row=>row.uid);
for(const id of [admin.uid,boss.uid,state.uid,'sangareddy-area','sangareddy-cf','sangareddy-jcf'])assert.ok(recipients.includes(id),id);
for(const id of [district.uid,area.uid,cf.uid,jcf.uid,'other-state','other-district','other-cf'])assert.ok(!recipients.includes(id),id+' must not receive another location’s alert');
let notices=(await data.getDocs(data.collection(db,'notifications'))).docs.map(row=>row.data()).filter(row=>row.scheduleId===schedule.id);
assert.equal(notices.length,6);assert.ok(notices.every(row=>row.phase==='pre'));
const note=notices.find(row=>row.userId==='sangareddy-cf');const stored=(await data.getDocs(data.collection(db,'notifications'))).docs.find(row=>row.data().scheduleId===schedule.id&&row.data().userId==='sangareddy-cf');await data.updateDoc(stored.ref,{read:true});
await api.dispatchSeasonAlerts();notices=(await data.getDocs(data.collection(db,'notifications'))).docs.map(row=>row.data()).filter(row=>row.scheduleId===schedule.id);assert.equal(notices.length,6);assert.ok(notices.find(row=>row.userId==='sangareddy-cf').read);
await api.dispatchSeasonAlerts(new Date('2027-03-03T12:00:00Z'));assert.equal((await data.getDocs(data.collection(db,'notifications'))).docs.filter(row=>row.data().scheduleId===schedule.id).length,12);
assert.equal(api.canSeeSeason(extra[3],schedule,users),true);assert.equal(api.canSeeSeason(district,schedule,users),false);
const machine={id:'SG-MACHINE',cfId:'sangareddy-cf',currentHolderId:'sangareddy-cf',state:'Telangana',district:'Sangareddy',operatingStatus:'idle',status:'idle'};
await data.setDoc(data.doc(db,'planters',machine.id),machine);
assert.ok(api.machineInSeason(machine,schedule,users));assert.ok(!api.machineInSeason({...machine,state:'Andhra Pradesh'},schedule,users));
const inspection={scheduleId:schedule.id,machineId:machine.id,scannedQRId:machine.id,phase:'pre',checks:Object.fromEntries(Object.keys(api.PRE_CHECKS).map(key=>[key,true])),photos:['proof'],notes:'Ready for the new season',estimatedCost:0};
await assert.rejects(api.saveSeasonInspection(cf,inspection));
const report=await api.saveSeasonInspection(extra[5],inspection);assert.equal(report.recordedBy,'sangareddy-jcf');assert.equal(report.ready,true);
const nizamabad=await api.createSeasonSchedule(boss,{...details,district:'Nizamabad'});const nizamabadUsers=api.seasonRecipients(nizamabad,users).map(user=>user.uid);assert.ok(nizamabadUsers.includes(cf.uid)&&nizamabadUsers.includes(jcf.uid));assert.ok(!nizamabadUsers.includes('other-cf'),'Same district name in another state does not match');
console.log('FM geographic alerts passed: state/district selection; CF/JCF, Area/District/State and oversight recipients; missing-District branch; no cross-state/district leakage; pre/post dates, catch-up/dedup/read preservation; scoped JCF inspection.');

const presetOnly=await api.createSeasonSchedule(boss,{...details,state:"Andhra Pradesh",district:"Polavaram",name:"Preset district without field records"});assert.equal(presetOnly.district,"Polavaram");

const siblingCF={...extra[4],uid:'sibling-cf',displayName:'Unselected CF'};await save(siblingCF);const targetedUsers=[...users,siblingCF];
const unselected={...machine,id:'SG-UNSELECTED'};const siblingMachine={...machine,id:'SG-SIBLING',cfId:siblingCF.uid,currentHolderId:siblingCF.uid};
for(const item of [unselected,siblingMachine])await data.setDoc(data.doc(db,'planters',item.id),item);
await assert.rejects(api.createSeasonSchedule(boss,{...details,coverage:'selected_machines',machineIds:[]}));
await assert.rejects(api.createSeasonSchedule(boss,{...details,coverage:'selected_machines',machineIds:['missing-machine']}));
await assert.rejects(api.createSeasonSchedule(boss,{...details,district:'Nizamabad',coverage:'selected_machines',machineIds:[machine.id]}));
const targeted=await api.createSeasonSchedule(boss,{...details,name:'Only selected machine',coverage:'selected_machines',machineIds:[machine.id]});
assert.ok(api.machineInSeason(machine,targeted,targetedUsers));assert.ok(!api.machineInSeason(unselected,targeted,targetedUsers));assert.ok(!api.canSeeSeason(siblingCF,targeted,targetedUsers));
const targetRecipients=api.seasonRecipients(targeted,targetedUsers).map(user=>user.uid);assert.ok(targetRecipients.includes('sangareddy-cf')&&targetRecipients.includes('sangareddy-jcf')&&targetRecipients.includes(state.uid));assert.ok(!targetRecipients.includes(siblingCF.uid));
await assert.rejects(api.saveSeasonInspection(extra[4],{...inspection,scheduleId:targeted.id,machineId:unselected.id,scannedQRId:unselected.id}));
const changed=await api.updateSeasonSchedule(boss,targeted.id,{...details,name:'Retargeted',coverage:'selected_machines',machineIds:[siblingMachine.id]});
assert.deepEqual(changed.machineIds,[siblingMachine.id]);
const targetedNotes=()=>data.getDocs(data.collection(db,'notifications')).then(snapshot=>snapshot.docs.filter(row=>row.data().scheduleId===targeted.id).map(row=>row.data()));
assert.ok((await targetedNotes()).find(note=>note.userId==='sangareddy-cf').cancelled);assert.ok(!(await targetedNotes()).find(note=>note.userId===siblingCF.uid).cancelled);
await api.archiveSeasonSchedule(boss,targeted.id,true);await api.archiveSeasonSchedule(boss,targeted.id,false);assert.ok((await targetedNotes()).find(note=>note.userId==='sangareddy-cf').cancelled,'restore must not reactivate excluded recipients');
console.log('Machine targeting passed: scope validation, selected-only checks, responsible team recipients, excluded machine rejection, retargeting and archive/restore.');

const mcp={...machine,machineType:'MCP'};
const drum={...siblingMachine,machineType:'Drum seeder'};
const laser={...unselected,machineType:'Laser land leveller'};
for(const item of [mcp,drum,laser])await data.setDoc(data.doc(db,'planters',item.id),item);
await assert.rejects(api.createSeasonSchedule(boss,{...details,coverage:'machine_types',machineTypes:[]}));
await assert.rejects(api.createSeasonSchedule(boss,{...details,coverage:'machine_types',machineTypes:['Unknown']}));
const typed=await api.createSeasonSchedule(boss,{...details,name:'MCP seasonal check',coverage:'machine_types',machineTypes:['MCP'],recipientIds:[siblingCF.uid]});
assert.ok(api.machineInSeason(mcp,typed,targetedUsers));
assert.ok(!api.machineInSeason(drum,typed,targetedUsers));assert.ok(!api.machineInSeason(laser,typed,targetedUsers));
assert.ok(api.canSeeSeason(extra[4],typed,targetedUsers));assert.ok(!api.canSeeSeason(siblingCF,typed,targetedUsers),'unrelated machine-type CF excluded');
await assert.rejects(api.saveSeasonInspection(extra[4],{...inspection,scheduleId:typed.id,machineId:laser.id,scannedQRId:laser.id}));
await api.saveSeasonInspection(extra[4],{...inspection,scheduleId:typed.id});
const changedType=await api.updateSeasonSchedule(boss,typed.id,{...details,coverage:'machine_types',machineTypes:['Drum seeder']});
assert.ok(api.machineInSeason(drum,changedType,targetedUsers));assert.ok(!api.machineInSeason(mcp,changedType,targetedUsers));
const typeNotes=(await data.getDocs(data.collection(db,'notifications'))).docs.map(row=>row.data()).filter(row=>row.scheduleId===typed.id);
assert.ok(typeNotes.find(note=>note.userId===extra[4].uid).cancelled);assert.ok(!typeNotes.find(note=>note.userId===siblingCF.uid).cancelled);
console.log('Machine-type alerts passed: MCP-only recipients and inspections, drum/laser exclusion, type validation and edit retargeting.');
