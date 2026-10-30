import { meterAcres,meterId,readMeterCalibration,validMeterPhotos,type SeasonMeterReading,type SeasonMeterSummary } from './seasonMeter.js';
import {machineTypeName} from './analytics.js';
import { collection,doc,getDoc,getDocs,writeBatch } from './data.js';
import { db } from './database.js';
import { isRemoteBrowser,remoteCommand } from './backendClient.js';
import { canManageMachine,reportingAncestors,type FieldMachine } from './fieldOperations.js';
import { canSeeSeason,machineInSeason,type SeasonSchedule } from './seasonOperations.js';
import type { UserProfile } from '../types.js';
export interface CropAcreage { crop:string; acres:number }
export interface SeasonProduction { id:string; scheduleId:string; seasonName:string; seasonStart:string; seasonEnd:string; machineId:string; machineType:string; totalAcres:number; meter?:SeasonMeterSummary; crops:CropAcreage[]; notes:string; photos:string[]; village:string; mandal:string; district:string; state:string; cfId:string; recordedBy:string; recordedByName:string; createdAt:string; updatedAt:string; revision:number; history:{totalAcres:number;crops:CropAcreage[];recordedBy:string;at:string;meter?:SeasonMeterSummary}[] }
export const canonicalCrop=(value:string)=>{const name=value.trim().replace(/\s+/g,' '),key=name.toLowerCase().replace(/[^a-z]/g,'');return ['soybean','soyabean','soybeans','soyabeans'].includes(key)?'Soybean':['maize','corn'].includes(key)?'Maize':['paddy','rice'].includes(key)?'Paddy':name;};
export const seasonEnded=(schedule:SeasonSchedule)=>!!schedule.endedAt||schedule.seasonEnd<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export async function saveSeasonProduction(actor:UserProfile,details:{scheduleId:string;machineId:string;scannedQRId:string;totalAcres:number;crops:CropAcreage[];notes:string;photos:string[];meter?:{before:number;after:number;beforePhotos:string[];afterPhotos:string[]}}){
 if(isRemoteBrowser)return remoteCommand('saveSeasonProduction',[details]);
 const users=(await getDocs(collection(db,'users'))).docs.map(row=>row.data() as UserProfile),canonical=users.find(user=>user.uid===actor.uid);
 if(!canonical||canonical.role!==actor.role||!['cf','jcf','area_manager'].includes(canonical.role))throw new Error('The responsible CF, JCF or Area Manager submits seasonal acreage.');
 const [seasonDoc,machineDoc]=await Promise.all([getDoc(doc(db,'season_schedules',details.scheduleId)),getDoc(doc(db,'planters',details.machineId))]);
 if(!seasonDoc.exists()||!machineDoc.exists())throw new Error('Choose an existing season and machine.');
 const schedule=seasonDoc.data() as SeasonSchedule,machine=machineDoc.data() as FieldMachine;
 if(schedule.endedAt)throw new Error('Farm Mechanization ended this season. Reports are read-only.');
 if(schedule.archived||!canSeeSeason(canonical,schedule,users)||!machineInSeason(machine,schedule,users)||!canManageMachine(canonical,machine,users))throw new Error('This machine is outside the active season or your reporting scope.');
 if(!seasonEnded(schedule))throw new Error('Submit final acreage after this season has ended.');
 if(details.scannedQRId!==(machine.qrLabelId||machine.id))throw new Error('Scan the QR on this machine before reporting seasonal acreage.');
 const beforeId=meterId(schedule.id,machine.id,'before'),afterId=meterId(schedule.id,machine.id,'after');
 const [openingDoc,closingDoc]=await Promise.all([getDoc(doc(db,'season_meter_readings',beforeId)),getDoc(doc(db,'season_meter_readings',afterId))]);
 const opening=openingDoc.data() as SeasonMeterReading|undefined,closing=closingDoc.data() as SeasonMeterReading|undefined;
 let meter:SeasonMeterSummary|undefined;
 if(machineTypeName(machine)==='MCP'){
  const input=details.meter;if(!input)throw new Error('MCP reports require before and after counter readings with photo evidence.');
  if(!validMeterPhotos(input.beforePhotos)||!validMeterPhotos(input.afterPhotos)||!input.beforePhotos.length&&!opening?.photos.length||!input.afterPhotos.length&&!closing?.photos.length)throw new Error('Attach before-season and after-season counter photos.');
  if(closing&&input.after!==closing.reading&&!input.afterPhotos.length)throw new Error('Attach a new closing photo when changing the counter reading.');
  if(opening&&input.before!==opening.reading)throw new Error('The opening reading must match the saved starting meter.');
  const calibration=opening||await readMeterCalibration(),acres=meterAcres(input.before,input.after,calibration.revolutionsPerAcre);
  meter={before:input.before,after:input.after,delta:input.after-input.before,revolutionsPerAcre:calibration.revolutionsPerAcre,calibrationRevision:'calibrationRevision' in calibration?calibration.calibrationRevision:calibration.revision,acres};
  // Claimed acreage is entered independently; the counter is evidence for FM review.
 }else if(details.meter)throw new Error('Counter conversion applies only to MCP machines.');
 const validAcres=(value:number)=>Number.isFinite(value)&&value>=0&&value<=10000000&&Math.abs(value*100-Math.round(value*100))<0.00001;
 if(!validAcres(details.totalAcres)||!Array.isArray(details.crops)||details.crops.length>30)throw new Error('Enter valid acreage with up to two decimal places.');
 const crops=details.crops.map(row=>({crop:typeof row.crop==='string'?canonicalCrop(row.crop):'',acres:row.acres}));
 if(crops.some(row=>!row.crop||row.crop.length>80||!validAcres(row.acres)||row.acres<=0)||new Set(crops.map(row=>row.crop.toLowerCase())).size!==crops.length)throw new Error('Use a different crop name on each row and positive crop acreage.');
 if(Math.round(crops.reduce((sum,row)=>sum+row.acres,0)*100)!==Math.round(details.totalAcres*100))throw new Error('Crop acres must add up to the machine’s season total.');
 if(typeof details.notes!=='string'||details.notes.length>2000||details.totalAcres===0&&!details.notes.trim())throw new Error('Explain why this machine covered zero acres, or keep notes within 2,000 characters.');
 if(!Array.isArray(details.photos)||details.photos.length>3||details.photos.some(photo=>typeof photo!=='string'))throw new Error('Attach up to three photos.');
 const id=details.scheduleId+'_'+machine.id,previous=(await getDoc(doc(db,'season_production',id))).data() as SeasonProduction|undefined,now=new Date().toISOString();
 const report:SeasonProduction={id,scheduleId:schedule.id,seasonName:schedule.name,seasonStart:schedule.seasonStart,seasonEnd:schedule.seasonEnd,machineId:machine.id,machineType:machine.machineType||machine.type,totalAcres:details.totalAcres,...(meter?{meter}:{}),crops,notes:details.notes.trim(),photos:details.photos.length?details.photos:previous?.photos||[],village:previous?.village??(typeof machine.location==='string'?machine.location:machine.location?.village||''),mandal:previous?.mandal??machine.mandal??'',district:previous?.district??machine.district??'',state:previous?.state??machine.state??'',cfId:previous?.cfId||machine.cfId||machine.currentHolderId,recordedBy:actor.uid,recordedByName:actor.displayName,createdAt:previous?.createdAt||now,updatedAt:now,revision:(previous?.revision||0)+1,history:previous?[...(previous.history||[]),{totalAcres:previous.totalAcres,crops:previous.crops,recordedBy:previous.recordedBy,at:previous.updatedAt,...(previous.meter?{meter:previous.meter}:{})}]:[]};
 const commit=writeBatch(db);if(meter&&details.meter){for(const phase of ['before','after'] as const){const prior=phase==='before'?opening:closing;const photos=phase==='before'?details.meter.beforePhotos:details.meter.afterPhotos;const reading:SeasonMeterReading={id:phase==='before'?beforeId:afterId,scheduleId:schedule.id,machineId:machine.id,phase,reading:meter[phase],photos:photos.length?photos:prior?.photos||[],revolutionsPerAcre:meter.revolutionsPerAcre,calibrationRevision:meter.calibrationRevision,recordedBy:prior&&phase==='before'?prior.recordedBy:actor.uid,recordedByName:prior&&phase==='before'?prior.recordedByName:actor.displayName,timestamp:prior&&phase==='before'?prior.timestamp:now,...(!opening&&phase==='before'?{retrospective:true}:{})};commit.set(doc(db,'season_meter_readings',reading.id),reading);}}commit.set(doc(db,'season_production',id),report);
 const recipients=new Set([...reportingAncestors(users,report.cfId).map(user=>user.uid),...reportingAncestors(users,machine.cfId||machine.currentHolderId).map(user=>user.uid),...users.filter(user=>['admin','farm_mechanization'].includes(user.role)).map(user=>user.uid)]);
 for(const uid of recipients)if(uid!==actor.uid)commit.set(doc(db,'notifications','production-'+id+'-'+report.revision+'-'+uid),{userId:uid,title:previous?'Season acreage corrected':'Season acreage submitted',message:`${schedule.name} · ${machine.id} · ${report.totalAcres} acres · ${crops.map(row=>row.crop+': '+row.acres+' ac').join(', ')||'No seasonal use'}`,read:false,timestamp:now,page:'production',scheduleId:schedule.id});
 await commit.commit();return report;
}
