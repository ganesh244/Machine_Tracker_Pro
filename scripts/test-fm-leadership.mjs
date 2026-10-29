import assert from 'node:assert/strict';
import {build} from 'esbuild';
const saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};globalThis.window=new EventTarget();window.location={origin:'http://localhost:3001'};
const bundle=await build({stdin:{contents:"export * from './src/lib/fieldOperations';export * from './src/lib/seasonOperations';export * from './src/lib/seasonProduction';export * from './src/lib/seasonProductionAnalytics';export * from './src/lib/seasonMeter';export * from './src/lib/maintenance';export * from './src/lib/overviewAlerts';export {visibleRecords} from './server/scope';export * as data from './src/lib/data';export {demoUsers} from './src/lib/demo';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env':JSON.stringify({DEV:true,VITE_LOCAL_DEMO:'true'})}});
const api=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`),[admin,state,dm,am,cf,jcf,boss]=api.demoUsers,db={};
const fm={...boss,assignedState:'',assignedDistrict:'',assignedMandal:'',assignedArea:''};
await api.data.setDoc(api.data.doc(db,'users',fm.uid),fm);
const ap=[{...state,uid:'fm-ap-state',assignedState:'Andhra Pradesh',assignedDistrict:'Guntur'},{...dm,uid:'fm-ap-dm',parentId:'fm-ap-state',assignedState:'Andhra Pradesh',assignedDistrict:'Guntur'},{...am,uid:'fm-ap-am',parentId:'fm-ap-dm',assignedState:'Andhra Pradesh',assignedDistrict:'Guntur'},{...cf,uid:'fm-ap-cf',parentId:'fm-ap-am',assignedState:'Andhra Pradesh',assignedDistrict:'Guntur'},{...jcf,uid:'fm-ap-jcf',parentId:'fm-ap-cf',assignedState:'Andhra Pradesh',assignedDistrict:'Guntur'}];
for(const user of ap)await api.data.setDoc(api.data.doc(db,'users',user.uid),user);
const users=[...api.demoUsers.filter(row=>row.uid!==fm.uid),fm,...ap];
const machines=[{id:'FM-TS-MCP',qrLabelId:'FM-TS-MCP',machineType:'MCP',type:'MCP',cfId:cf.uid,currentHolderId:cf.uid,state:'Telangana',district:'Nizamabad',mandal:'Armoor',location:'DEMO TS',operatingStatus:'idle',status:'idle'},{id:'FM-AP-DRUM',qrLabelId:'FM-AP-DRUM',machineType:'Drum seeder',type:'Drum seeder',cfId:ap[3].uid,currentHolderId:ap[3].uid,state:'Andhra Pradesh',district:'Guntur',mandal:'DEMO area',location:'DEMO AP',operatingStatus:'idle',status:'idle'}];
for(const machine of machines)await api.data.setDoc(api.data.doc(db,'planters',machine.id),machine);
const all=Object.fromEntries(users.map(user=>['users/'+user.uid,user]));
const expected=[];for(const machine of machines){all['planters/'+machine.id]=machine;expected.push('planters/'+machine.id);for(const kind of ['farmers','field_usage','season_inspections','season_meter_readings','maintenance_requests','maintenance_logs','machine_movements']){const path=kind+'/'+machine.id;all[path]={machineId:machine.id,planterId:machine.id,fromCFId:machine.cfId,toCFId:machine.cfId};expected.push(path);}all['qr_labels/'+machine.id]={id:machine.id,holderId:machine.cfId,batchId:machine.id};all['qr_batches/'+machine.id]={id:machine.id};}
all['notifications/fm']={userId:fm.uid};all['notifications/cf']={userId:cf.uid};all['accounts/private']={passwordHash:'hidden-test'};all['settings/admin-setup']={private:true};all['settings/mcp_meter']={revolutionsPerAcre:1997};
const visible=api.visibleRecords(fm,all);for(const path of expected)assert.ok(visible[path],path+' is available to global leadership');assert.ok(!visible['notifications/cf']);assert.ok(!visible['accounts/private']);assert.ok(!visible['settings/admin-setup']);assert.ok(visible['settings/mcp_meter']);
assert.ok(!api.visibleRecords(cf,all)['planters/'+machines[1].id]);
console.log('FM visibility passed: no assigned geography or descendant requirement; TS/AP machines, farmers, photos/usage/meter/maintenance/movement records visible; credentials and other users’ notifications hidden; CF remains branch-scoped.');
const season=await api.createSeasonSchedule(dm,{name:'DEMO district-owned FM oversight',state:'Telangana',district:'Nizamabad',seasonStart:'2025-06-01',seasonEnd:'2025-09-30',preAlertDate:'2025-05-01',postAlertDate:'2025-10-01',coverage:'selected_machines',machineIds:[machines[0].id]});
await api.updateSeasonSchedule(fm,season.id,{...season,name:'DEMO FM reviewed season'});await api.archiveSeasonSchedule(fm,season.id,true);await api.archiveSeasonSchedule(fm,season.id,false);
await assert.rejects(api.createQRBatch(fm,'Not an admin task',1));await assert.rejects(api.saveMeterCalibration(fm,2000));
await assert.rejects(api.saveSeasonProduction(fm,{scheduleId:season.id,machineId:machines[0].id,scannedQRId:machines[0].id,totalAcres:1,crops:[{crop:'Maize',acres:1}],notes:'DEMO',photos:[]}));
await assert.rejects(api.saveSeasonInspection(fm,{scheduleId:season.id,machineId:machines[0].id,scannedQRId:machines[0].id,phase:'pre',checks:{mechanism:true,safety:true,trial:true,ready:true},photos:['proof'],notes:'DEMO',estimatedCost:0}));
console.log('FM planning/role separation passed: can manage district-owned campaigns; cannot act as Admin calibration/QR generator or submit field acreage/inspections.');
for(const [index,machine] of machines.entries()){
 const chain=index?[ap[2],ap[1],ap[0]]:[am,dm,state],requester=index?ap[3]:cf;
 const request=await api.raiseMaintenance(requester,machine.id,{requestType:'repair',severity:'medium',description:'DEMO leadership final review evidence',partDamaged:'Chain',estimatedCost:1000,photos:['proof'],machineStopped:true});
 await assert.rejects(api.reviewMaintenance(fm,request.id,'approve','Cannot bypass manager reviews'));
 for(const reviewer of chain)await api.reviewMaintenance(reviewer,request.id,'approve','DEMO reviewed');
 const snapshot=await api.data.getDoc(api.data.doc(db,'maintenance_requests',request.id)),pending=snapshot.data();
 const actions=api.buildOverviewActions(fm,users,machines,[],[],[],[],[pending]);assert.equal(actions.find(row=>row.kind==='approval')?.count,1);
 await api.reviewMaintenance(fm,request.id,index?'reject':'approve',index?'DEMO repair estimate needs revision':'DEMO final approved');
 const finished=(await api.data.getDoc(api.data.doc(db,'maintenance_requests',request.id))).data();assert.equal(finished.status,index?'rejected':'approved');
 await assert.rejects(api.reviewMaintenance(fm,request.id,'approve','Duplicate decision'));
}
console.log('FM final review passed: both states; blocked before Area/District/State; final action appears in leadership alerts; approve/reject and duplicate guards work.');
