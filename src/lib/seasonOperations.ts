import {meterId,readMeterCalibration,validMeterPhotos} from './seasonMeter.js';
import { MACHINE_TYPES } from './fieldOperations.js';
import { isCalendarDate } from './calendarDate.js';
import { isPresetLocation } from './locations.js';
import { isRemoteBrowser, remoteCommand } from './backendClient.js';
import { collection, doc, getDoc, getDocs, writeBatch } from './data.js';
import { db } from './database.js';
import { branchIds, reportingAncestors, canManageMachine, type FieldMachine } from './fieldOperations.js';
import { raiseMaintenance } from './maintenance.js';
import type { UserProfile } from '../types.js';
export interface SeasonSchedule { id:string; name:string; state?:string; audience?:'branch'|'location'; district:string; ownerId:string; seasonStart:string; seasonEnd:string; preAlertDate:string; postAlertDate:string; createdAt:string; endedAt?:string; endedBy?:string; endNote?:string; archived?:boolean; updatedAt?:string; coverage?:'selected_machines'|'machine_types'|'all_machines'; machineIds?:string[]; machineTypes?:string[]; recipientIds?:string[] }
export interface SeasonInspection { id:string; scheduleId:string; machineId:string; scannedQRId?:string; phase:'pre'|'post'; ready:boolean; checks:Record<string,boolean>; notes:string; photos:string[]; maintenanceId?:string; recordedBy:string; recordedByName:string; timestamp:string }
export const PRE_CHECKS:Record<string,string>={mechanism:'Mechanism / moving parts checked',safety:'Safety guards and fasteners okay',trial:'Trial run completed',ready:'Machine ready for field use'};
export const POST_CHECKS:Record<string,string>={cleaned:'Machine cleaned',lubricated:'Lubrication / regular service completed',covered:'Machine covered',secure:'Parked in a secure location',shade:'Parked under shade'};
const day=(date=new Date())=>date.toLocaleDateString('en-CA');
async function profiles(){return (await getDocs(collection(db,'users'))).docs.map(row=>row.data() as UserProfile);}
async function verify(actor:UserProfile){const snap=await getDoc(doc(db,'users',actor.uid));if(!snap.exists()||snap.data().role!==actor.role)throw new Error('Your role changed. Reload your account.');}
const validDate=isCalendarDate;
const same = (a?:string,b?:string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
export function userSeasonLocation(user:UserProfile,users:UserProfile[]) {
 const path=reportingAncestors(users,user.uid);
 return {state:path.find(row=>row.assignedState?.trim())?.assignedState||'',district:path.find(row=>row.assignedDistrict?.trim())?.assignedDistrict||''};
}
function locationAudience(schedule:SeasonSchedule,users:UserProfile[]){return schedule.audience==='location'||users.find(user=>user.uid===schedule.ownerId)?.role==='farm_mechanization';}
function inSeasonLocation(user:UserProfile,schedule:SeasonSchedule,users:UserProfile[]){const location=userSeasonLocation(user,users);return same(location.state,schedule.state)&&(user.role==='state_manager'||same(location.district,schedule.district));}
export function machineInSeason(machine:FieldMachine,schedule:SeasonSchedule,users:UserProfile[]){if(schedule.coverage==='selected_machines'&&!schedule.machineIds?.includes(machine.id))return false;if(schedule.coverage==='machine_types'&&!schedule.machineTypes?.some(type=>same(type,machine.machineType||machine.type)))return false;return locationAudience(schedule,users)?same(machine.state,schedule.state)&&same(machine.district,schedule.district):branchIds(users,schedule.ownerId).has(machine.cfId||machine.currentHolderId);}
export function seasonRecipients(schedule:SeasonSchedule,users:UserProfile[]) {
 if(schedule.coverage==='selected_machines'||schedule.coverage==='machine_types')return users.filter(user=>['admin','farm_mechanization'].includes(user.role)||schedule.recipientIds?.includes(user.uid));
 if(locationAudience(schedule,users)) return users.filter(user=>['admin','farm_mechanization'].includes(user.role)||inSeasonLocation(user,schedule,users));
 const branch=branchIds(users,schedule.ownerId),ancestors=new Set(reportingAncestors(users,schedule.ownerId).map(user=>user.uid));
 return users.filter(user=>branch.has(user.uid)||ancestors.has(user.uid)||['admin','farm_mechanization'].includes(user.role));
}
export function canSeeSeason(actor:UserProfile,schedule:SeasonSchedule,users:UserProfile[]){return seasonRecipients(schedule,users).some(user=>user.uid===actor.uid);}
export function canManageSeason(actor:UserProfile,schedule:SeasonSchedule){return ['admin','farm_mechanization'].includes(actor.role)||actor.role==='district_manager'&&schedule.ownerId===actor.uid;}
export function canInspectSeason(actor:UserProfile,schedule:SeasonSchedule,users:UserProfile[]){return !schedule.archived&&!schedule.endedAt&&['cf','jcf','area_manager','district_manager'].includes(actor.role)&&canSeeSeason(actor,schedule,users);}
async function targetMachines(actor:UserProfile,schedule:SeasonSchedule,users:UserProfile[]){
 if(schedule.coverage&&!['selected_machines','machine_types','all_machines'].includes(schedule.coverage))throw new Error('Choose a valid machine coverage.');
 if(schedule.coverage==='all_machines'||!schedule.coverage)return {coverage:'all_machines' as const,machineIds:[],recipientIds:[]};
 if(schedule.coverage==='machine_types'&&(!Array.isArray(schedule.machineTypes)||!schedule.machineTypes.length||schedule.machineTypes.some(type=>!MACHINE_TYPES.includes(type as typeof MACHINE_TYPES[number]))))throw new Error('Choose at least one valid machine type.');
 if(schedule.coverage==='selected_machines'&&(!Array.isArray(schedule.machineIds)||!schedule.machineIds.length||schedule.machineIds.length>500||schedule.machineIds.some(id=>typeof id!=='string')))throw new Error('Select at least one machine (up to 500 per plan).');
 const ids=[...new Set(schedule.machineIds||[])];const machines=(await getDocs(collection(db,'planters'))).docs.map(row=>row.data() as FieldMachine);
 const selected=schedule.coverage==='machine_types'?machines.filter(machine=>machineInSeason(machine,schedule,users)&&canManageMachine(actor,machine,users)):ids.map(id=>machines.find(machine=>machine.id===id));
 const base={...schedule,coverage:'all_machines' as const};
 for(const machine of selected)if(!machine||!canManageMachine(actor,machine,users)||!machineInSeason(machine,base,users)||!same(machine.state||userSeasonLocation(users.find(user=>user.uid===(machine.cfId||machine.currentHolderId))||actor,users).state,schedule.state)||!same(machine.district||userSeasonLocation(users.find(user=>user.uid===(machine.cfId||machine.currentHolderId))||actor,users).district,schedule.district))throw new Error('Select machines within this state, district and your reporting scope.');
 const recipients=new Set<string>([actor.uid]);
 for(const machine of selected){const cfId=machine!.cfId||machine!.currentHolderId;for(const user of reportingAncestors(users,cfId))recipients.add(user.uid);for(const user of users)if(user.role==='jcf'&&user.parentId===cfId)recipients.add(user.uid);}
 return {coverage:schedule.coverage,machineIds:schedule.coverage==='machine_types'?[]:ids,machineTypes:schedule.coverage==='machine_types'?[...new Set(schedule.machineTypes)]:[],recipientIds:[...recipients]};
}
async function syncRecipients(schedule:SeasonSchedule,users:UserProfile[]){const allowed=new Set(seasonRecipients(schedule,users).map(user=>user.uid));const notes=await getDocs(collection(db,'notifications'));const commit=writeBatch(db);let changed=false;for(const note of notes.docs)if(note.data().scheduleId===schedule.id){commit.update(note.ref,{cancelled:!!schedule.archived||!allowed.has(note.data().userId)});changed=true;}if(changed)await commit.commit();}
export async function createSeasonSchedule(actor:UserProfile,details:Omit<SeasonSchedule,'id'|'ownerId'|'createdAt'>){
 if(isRemoteBrowser)return remoteCommand('createSeasonSchedule',[details]);
 await verify(actor);if(!['admin','district_manager','farm_mechanization'].includes(actor.role))throw new Error('Admin, District Managers and the Farm Mechanization Team set seasonal alert dates.');
 const users=await profiles(), own=userSeasonLocation(actor,users), state=(details.state||own.state).trim(),district=details.district.trim();
 if(!details.name.trim()||!state||!district)throw new Error('Enter season name, state and district.');
 if(actor.role==='district_manager'&&(!same(district,own.district)||!same(state,own.state)))throw new Error('Schedule inspections for your assigned state and district.');
 if(['admin','farm_mechanization'].includes(actor.role)){
  if(!isPresetLocation(state,district)&&!users.some(user=>{const loc=userSeasonLocation(user,users);return same(loc.state,state)&&same(loc.district,district);})){const machines=(await getDocs(collection(db,'planters'))).docs.map(row=>row.data() as FieldMachine);if(!machines.some(machine=>same(machine.state,state)&&same(machine.district,district)))throw new Error('Select a state and district present in your team directory or machine records.');}
 }
 if(![details.seasonStart,details.seasonEnd,details.preAlertDate,details.postAlertDate].every(validDate))throw new Error('Enter valid season and alert dates.');
 if(details.preAlertDate>details.seasonStart||details.seasonEnd<details.seasonStart||details.postAlertDate<details.seasonEnd)throw new Error('Pre-season alert must be on/before season start, and post-season alert on/after season end.');
 const id=crypto.randomUUID(),schedule:SeasonSchedule={...details,name:details.name.trim(),state,district,audience:['admin','farm_mechanization'].includes(actor.role)?'location':'branch',id,ownerId:actor.uid,createdAt:new Date().toISOString()};
 Object.assign(schedule,await targetMachines(actor,schedule,users));
 const commit=writeBatch(db);commit.set(doc(db,'season_schedules',id),schedule);await commit.commit();await dispatchSeasonAlerts();return schedule;
}
export async function updateSeasonSchedule(actor:UserProfile,id:string,details:Pick<SeasonSchedule,'name'|'seasonStart'|'seasonEnd'|'preAlertDate'|'postAlertDate'> & Pick<Partial<SeasonSchedule>,'coverage'|'machineIds'|'machineTypes'>){
 if(isRemoteBrowser)return remoteCommand('updateSeasonSchedule',[id,details]);
 await verify(actor);const snapshot=await getDoc(doc(db,'season_schedules',id));
 if(!snapshot.exists())throw new Error('Season schedule not found.');
 const schedule=snapshot.data() as SeasonSchedule;
 if(!canManageSeason(actor,schedule))throw new Error('Only Admin, Farm Mechanization or the owning District Manager can manage this schedule.');
 if(schedule.archived||schedule.endedAt)throw new Error('Archived or ended seasons cannot be edited. Create the next season instead.');
 if(!details.name.trim()||![details.seasonStart,details.seasonEnd,details.preAlertDate,details.postAlertDate].every(validDate)||details.preAlertDate>details.seasonStart||details.seasonEnd<details.seasonStart||details.postAlertDate<details.seasonEnd)throw new Error('Enter a season name and valid season / reminder dates.');
 const users=await profiles();const updated={...schedule,name:details.name.trim(),seasonStart:details.seasonStart,seasonEnd:details.seasonEnd,preAlertDate:details.preAlertDate,postAlertDate:details.postAlertDate,coverage:details.coverage??schedule.coverage,machineIds:details.machineIds??schedule.machineIds,machineTypes:details.machineTypes??schedule.machineTypes,updatedAt:new Date().toISOString()};Object.assign(updated,await targetMachines(actor,updated,users));
 const commit=writeBatch(db);commit.set(doc(db,'season_schedules',id),updated);await commit.commit();await syncRecipients(updated,users);await dispatchSeasonAlerts();return updated;
}
export async function endSeasonSchedule(actor:UserProfile,id:string,note:string){
 if(isRemoteBrowser)return remoteCommand('endSeasonSchedule',[id,note]);
 await verify(actor);if(actor.role!=='farm_mechanization')throw new Error('Only Farm Mechanization Team can end a season.');
 const snapshot=await getDoc(doc(db,'season_schedules',id));if(!snapshot.exists())throw new Error('Season schedule not found.');
 const schedule=snapshot.data() as SeasonSchedule;if(schedule.archived||schedule.endedAt)throw new Error('This season is archived or already ended.');
 if(typeof note!=='string'||note.trim().length<5||note.length>1000)throw new Error('Enter a closing note of 5–1,000 characters.');
 const now=new Date().toISOString(),end=day();if(schedule.seasonStart>end)throw new Error('This season has not started yet.');
 const updated={...schedule,endedAt:now,endedBy:actor.uid,endNote:note.trim(),seasonEnd:schedule.seasonEnd>end?end:schedule.seasonEnd,postAlertDate:schedule.postAlertDate>end?end:schedule.postAlertDate,updatedAt:now};
 const commit=writeBatch(db);commit.update(snapshot.ref,updated);
 for(const user of seasonRecipients(updated,await profiles()))commit.set(doc(db,'notifications',`season-ended-${id}-${user.uid}`),{userId:user.uid,title:'Season ended',message:`${schedule.name}: Farm Mechanization ended this season. Seasonal reminders are stopped. Saved reports remain available. ${note.trim()}`,read:false,timestamp:now,page:'production',scheduleId:id});
 const existingNotes=await getDocs(collection(db,'notifications'));for(const row of existingNotes.docs)if(row.data().scheduleId===id&&row.id.startsWith('season-'+id+'-'))commit.update(row.ref,{cancelled:true});
 await commit.commit();await dispatchSeasonAlerts();return updated;
}
export async function archiveSeasonSchedule(actor:UserProfile,id:string,archived:boolean){
 if(isRemoteBrowser)return remoteCommand('archiveSeasonSchedule',[id,archived]);
 await verify(actor);const snapshot=await getDoc(doc(db,'season_schedules',id));
 if(!snapshot.exists())throw new Error('Season schedule not found.');
 const schedule=snapshot.data() as SeasonSchedule;
 if(!canManageSeason(actor,schedule))throw new Error('Only Admin, Farm Mechanization or the owning District Manager can manage this schedule.');
 const commit=writeBatch(db);commit.update(doc(db,'season_schedules',id),{archived,updatedAt:new Date().toISOString()});
 // Reminder records retain their read state and identity across restore.
 const notifications=await getDocs(collection(db,'notifications'));const recipients=new Set(seasonRecipients(schedule,await profiles()).map(user=>user.uid));
 for(const row of notifications.docs)if(row.id.startsWith('season-'+id+'-'))commit.update(row.ref,{cancelled:archived||!recipients.has(row.data().userId)});
 await commit.commit();if(!archived)await dispatchSeasonAlerts();
}
let dispatching:Promise<void>|undefined;
export function dispatchSeasonAlerts(now=new Date()){if(isRemoteBrowser)return dispatching ||=remoteCommand('dispatchSeasonAlerts').finally(()=>{dispatching=undefined;});if(typeof window==='undefined')return dispatch(now);return dispatching ||=dispatch(now).finally(()=>{dispatching=undefined;});}
async function dispatch(now:Date){
 const [users,snapshots]=await Promise.all([profiles(),getDocs(collection(db,'season_schedules'))]);
 const schedules=await reconcileSeasonRecipients(users,snapshots.docs.map(row=>row.data() as SeasonSchedule));
 const commit=writeBatch(db);let count=0;
 for(const schedule of schedules){if(schedule.endedAt){const old=await getDocs(collection(db,'notifications'));for(const row of old.docs)if(row.data().scheduleId===schedule.id&&row.id.startsWith('season-'+schedule.id+'-')&&!row.data().cancelled){commit.update(row.ref,{cancelled:true});count++;}continue;}if(schedule.archived)continue;
  for(const phase of ['pre','post'] as const){if((phase==='pre'?schedule.preAlertDate:schedule.postAlertDate)>day(now))continue;
   for(const user of seasonRecipients(schedule,users)){
    const id=`season-${schedule.id}-${phase}-${user.uid}`;if((await getDoc(doc(db,'notifications',id))).exists())continue;
    commit.set(doc(db,'notifications',id),{userId:user.uid,title:`${phase==='pre'?'Pre':'Post'}-season inspection due`,message:`${schedule.name}${schedule.coverage==='machine_types'?' · '+schedule.machineTypes!.join(', '):''}${schedule.coverage==='selected_machines'?' · '+schedule.machineIds!.length+' selected machine(s)':''} · ${schedule.state ? schedule.state + ' / ' : ''}${schedule.district}: ${['cf','jcf','area_manager','district_manager'].includes(user.role) ? phase==='post'?'scan each assigned machine, submit its season total with crop-wise acres under Season acreage, and complete its post-season care checklist.':'scan your assigned machines and submit the readiness checklist with pictures. For MCP, also save the opening counter reading and photo under Season acreage.' : 'seasonal inspections are due. Track field-team reports and maintenance escalations.'}`,type:'info',read:false,timestamp:now.toISOString(),page:'seasons',scheduleId:schedule.id,phase});count++;
   }
  }
 }
 if(count)await commit.commit();
}
export async function saveSeasonInspection(actor:UserProfile,details:{scheduleId:string;machineId:string;scannedQRId:string;phase:'pre'|'post';checks:Record<string,boolean>;notes:string;photos:string[];estimatedCost:number;openingMeter?:{reading:number;photos:string[]}}){
 if(isRemoteBrowser)return remoteCommand('saveSeasonInspection',[details]);
 await verify(actor);if(!['cf','jcf','area_manager','district_manager'].includes(actor.role))throw new Error('CF/JCF and Area / District Managers complete seasonal inspections.');
 const [users,scheduleDoc,machineDoc]=await Promise.all([profiles(),getDoc(doc(db,'season_schedules',details.scheduleId)),getDoc(doc(db,'planters',details.machineId))]);
 if(!scheduleDoc.exists()||!machineDoc.exists())throw new Error('Choose an existing schedule and machine.');
 const schedule=scheduleDoc.data() as SeasonSchedule,machine=machineDoc.data() as FieldMachine;
 if(schedule.archived||schedule.endedAt)throw new Error('This season is closed. Reports are read-only.');
 if(details.scannedQRId!==(machine.qrLabelId||machine.id))throw new Error('Scan the QR attached to this machine before filling its inspection report.');
 if(!canInspectSeason(actor,schedule,users)||!machineInSeason(machine,schedule,users)||!canManageMachine(actor,machine,users))throw new Error('This inspection is outside your reporting branch.');
 if(!['pre','post'].includes(details.phase))throw new Error('Choose pre-season or post-season.');
 if(day()<(details.phase==='pre'?schedule.preAlertDate:schedule.postAlertDate))throw new Error('This inspection window has not started yet.');
 if(!details.photos.length)throw new Error('Attach at least one machine / service photo.');
 const keys=Object.keys(details.phase==='pre'?PRE_CHECKS:POST_CHECKS);
 if(keys.some(key=>typeof details.checks[key]!=='boolean'))throw new Error('Answer every checklist item.');
 const ready=keys.every(key=>details.checks[key]);if(!ready&&details.notes.trim().length<10)throw new Error('Describe the failed checks and service needed in at least 10 characters.');
 const id=`${schedule.id}-${details.phase}-${machine.id}`;
 if((await getDoc(doc(db,'season_inspections',id))).exists())throw new Error('This machine already has a report for this season and phase.');
 let openingRecord:any;
 if(details.phase==='pre'&&(machine.machineType||machine.type)==='MCP'){
  const meter=details.openingMeter;if(!meter||!Number.isSafeInteger(meter.reading)||meter.reading<0||meter.reading>999999||!validMeterPhotos(meter.photos)||!meter.photos.length)throw new Error('Enter the six-digit opening counter (000000–999999) and attach its photo.');
  const openingId=meterId(schedule.id,machine.id,'before'),prior=await getDoc(doc(db,'season_meter_readings',openingId));
  if(prior.exists()&&prior.data().reading!==meter.reading)throw new Error('This season already has a different saved opening counter.');
  const calibration=prior.exists()?prior.data():await readMeterCalibration();
  openingRecord=prior.exists()?prior.data():{id:openingId,scheduleId:schedule.id,machineId:machine.id,phase:'before',reading:meter.reading,photos:meter.photos,revolutionsPerAcre:calibration.revolutionsPerAcre,calibrationRevision:calibration.revision,recordedBy:actor.uid,recordedByName:actor.displayName,timestamp:new Date().toISOString()};
 }
 let maintenanceId:string|undefined;
 if(!ready){const requests=await getDocs(collection(db,'maintenance_requests'));const existing=requests.docs.find(row=>row.data().planterId===machine.id&&!['completed','rejected','cancelled'].includes(row.data().status));
  maintenanceId=existing?.id||(await raiseMaintenance(actor,machine.id,{requestType:details.phase==='pre'?'repair':'regular_service',severity:'medium',description:`${details.phase==='pre'?'Pre':'Post'}-season: ${details.notes.trim()}`,partDamaged:'Seasonal inspection findings',estimatedCost:details.estimatedCost,photos:details.photos,machineStopped:true})).id;
 }
 const timestamp=new Date().toISOString(),report:SeasonInspection={id,scheduleId:schedule.id,machineId:machine.id,scannedQRId:details.scannedQRId,phase:details.phase,ready,checks:details.checks,notes:details.notes.trim(),photos:details.photos,recordedBy:actor.uid,recordedByName:actor.displayName,timestamp,...(maintenanceId?{maintenanceId}:{})};
 const commit=writeBatch(db);commit.set(doc(db,'season_inspections',id),report);if(openingRecord)commit.set(doc(db,'season_meter_readings',openingRecord.id),openingRecord);
 if(!ready)commit.update(doc(db,'planters',machine.id),{status:'maintenance',operatingStatus:'maintenance',lastUpdated:timestamp});
 commit.set(doc(db,'planters',machine.id,'usageLogs',id),{type:'season_inspection',phase:details.phase,timestamp,imageUrl:details.photos[0],updatedBy:actor.displayName,notes:report.notes,ready,reportId:id});
 for(const user of users.filter(row=>canManageMachine(row,machine,users))){commit.set(doc(db,'notifications',`report-${id}-${user.uid}`),{userId:user.uid,title:`${details.phase==='pre'?'Pre':'Post'}-season report submitted`,message:`${machine.id}: ${ready?'all checks passed':'maintenance escalated'}. ${actor.displayName} submitted photo evidence.`,read:false,timestamp,page:'seasons',scheduleId:schedule.id,link:machine.id});}
 await commit.commit();return report;
}

// Derive current recipients before every dispatch, including older saved campaigns.
async function reconcileSeasonRecipients(users:UserProfile[],schedules:SeasonSchedule[]){
 if(!schedules.some(schedule=>!schedule.archived&&['selected_machines','machine_types'].includes(schedule.coverage||'')))return schedules;
 const machines=(await getDocs(collection(db,'planters'))).docs.map(row=>row.data() as FieldMachine);
 const updatedSchedules:SeasonSchedule[]=[];
 for(const schedule of schedules){if(schedule.archived||!['selected_machines','machine_types'].includes(schedule.coverage||'')){updatedSchedules.push(schedule);continue;}const ids=new Set<string>([schedule.ownerId]);
  for(const machine of machines.filter(machine=>machineInSeason(machine,schedule,users))){const cfId=machine.cfId||machine.currentHolderId;for(const user of reportingAncestors(users,cfId))ids.add(user.uid);for(const user of users)if(user.role==='jcf'&&user.parentId===cfId)ids.add(user.uid);}
  const recipientIds=[...ids];if(JSON.stringify(recipientIds.slice().sort())===JSON.stringify((schedule.recipientIds||[]).slice().sort())){updatedSchedules.push(schedule);continue;}const updated={...schedule,recipientIds};const batch=writeBatch(db);batch.update(doc(db,'season_schedules',schedule.id),{recipientIds});await batch.commit();await syncRecipients(updated,users);updatedSchedules.push(updated);
 }
 return updatedSchedules;
}
// Run after responsibility changes; do not reuse an older in-flight demo snapshot.
export async function refreshSeasonRecipients(){
 if(dispatching)await dispatching;
 await dispatchSeasonAlerts();
}
