import assert from 'node:assert/strict';
import { build } from 'esbuild';
const saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};globalThis.window=new EventTarget();window.location={origin:'http://localhost:3001'};
const bundled=await build({stdin:{contents:"export * from './src/lib/fieldOperations'; export * from './src/lib/maintenance'; export * from './src/lib/seasonOperations'; export * from './src/lib/teamManagement'; export * as data from './src/lib/data'; export {demoUsers} from './src/lib/demo';",loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env':JSON.stringify({DEV:true,VITE_LOCAL_DEMO:'true'})}});
const {data,demoUsers,...api}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const [admin,state,district,area,cf,jcf,boss]=demoUsers,db={};
const save=async user=>data.setDoc(data.doc(db,'users',user.uid),user);

const details={name:'Editable Rabi',state:'Telangana',district:'Nizamabad',seasonStart:'2026-12-01',seasonEnd:'2027-03-01',preAlertDate:'2026-10-01',postAlertDate:'2027-03-02'};
const schedule=await api.createSeasonSchedule(district,details);
const reports=data.doc(db,'season_inspections','retained-report');await data.setDoc(reports,{id:'retained-report',scheduleId:schedule.id,notes:'Preserved evidence'});
for(const actor of [state,area,cf,jcf]){await assert.rejects(api.updateSeasonSchedule(actor,schedule.id,details));await assert.rejects(api.archiveSeasonSchedule(actor,schedule.id,true));}
const other={...district,uid:'other-manager'};await save(other);await assert.rejects(api.archiveSeasonSchedule(other,schedule.id,true));
await assert.rejects(api.updateSeasonSchedule(district,schedule.id,{...details,preAlertDate:'2027-01-01'}));
await api.updateSeasonSchedule(admin,schedule.id,{...details,name:'Updated Rabi'});
assert.equal((await data.getDoc(data.doc(db,'season_schedules',schedule.id))).data().name,'Updated Rabi');
const notes=async()=>({docs:(await data.getDocs(data.collection(db,'notifications'))).docs.filter(row=>row.id.startsWith('season-'+schedule.id))});
const first=(await notes()).docs.find(row=>row.id.startsWith('season-'+schedule.id));await data.updateDoc(first.ref,{read:true});
const before=(await notes()).docs.length;
await api.archiveSeasonSchedule(district,schedule.id,true);
assert.ok((await notes()).docs.every(row=>row.data().cancelled));
await api.dispatchSeasonAlerts(new Date('2028-01-01T12:00:00Z'));assert.equal((await notes()).docs.length,before);
assert.ok((await data.getDoc(reports)).exists());
const archived=(await data.getDoc(data.doc(db,'season_schedules',schedule.id))).data();assert.equal(api.canInspectSeason(cf,archived,demoUsers),false);
await assert.rejects(api.updateSeasonSchedule(district,schedule.id,details));
await api.archiveSeasonSchedule(admin,schedule.id,false);
assert.ok((await notes()).docs.every(row=>!row.data().cancelled));assert.equal((await data.getDoc(first.ref)).data().read,true);assert.equal((await notes()).docs.length,before);
assert.ok((await data.getDoc(reports)).exists());
const another=await api.createSeasonSchedule(admin,{...details,name:'Another season'});assert.notEqual(another.id,schedule.id);
console.log('Season management passed: role/ownership checks, edit validation, archive stops reminders/inspection, report preservation, restore/read-state/dedup, independent new schedule.');

const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
const ending=await api.createSeasonSchedule(boss,{...details,name:'DEMO manual ending',seasonStart:today,seasonEnd:'2099-12-01',preAlertDate:today,postAlertDate:'2099-12-02'});
for(const actor of [admin,state,district,area,cf,jcf])await assert.rejects(api.endSeasonSchedule(actor,ending.id,'Unauthorized ending'));
await assert.rejects(api.endSeasonSchedule(boss,ending.id,''));
const closed=await api.endSeasonSchedule(boss,ending.id,'Field work completed; collect final reports');
assert.equal(closed.seasonEnd,today);assert.equal(closed.postAlertDate,today);assert.equal(closed.endedBy,boss.uid);assert.ok(closed.endedAt);assert.ok(!closed.archived);
await assert.rejects(api.endSeasonSchedule(boss,ending.id,'Duplicate ending'));
await assert.rejects(api.updateSeasonSchedule(boss,ending.id,details));
assert.equal((await data.getDoc(reports)).data().notes,'Preserved evidence');
const next=await api.createSeasonSchedule(boss,{...details,name:'Next season'});assert.notEqual(next.id,ending.id);
console.log('Manual season ending passed: FM-only, dates advanced, evidence retained, duplicate/edit denied and next season created.');

await api.dispatchSeasonAlerts();assert.ok((await data.getDocs(data.collection(db,'notifications'))).docs.filter(row=>row.id.startsWith('season-'+ending.id+'-')).every(row=>row.data().cancelled));console.log('Ended seasons stop and cancel seasonal reminders.');
