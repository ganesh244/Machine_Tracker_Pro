import {collection,doc,getDoc,getDocs,writeBatch} from './data.js';
import {db} from './database.js';
import {isRemoteBrowser,remoteCommand} from './backendClient.js';
import {canManageMachine,type FieldMachine} from './fieldOperations.js';
import {canSeeSeason,machineInSeason,type SeasonSchedule} from './seasonOperations.js';
import {machineTypeName} from './analytics.js';
import type {UserProfile} from '../types.js';
export const DEFAULT_MCP_REVS_PER_ACRE=1997;
export interface MeterCalibration {revolutionsPerAcre:number;revision:number;updatedBy?:string;updatedAt?:string}
export interface SeasonMeterReading {id:string;scheduleId:string;machineId:string;phase:'before'|'after';reading:number;photos:string[];revolutionsPerAcre:number;calibrationRevision:number;recordedBy:string;recordedByName:string;timestamp:string;retrospective?:boolean}
export interface SeasonMeterSummary {before:number;after:number;delta:number;revolutionsPerAcre:number;calibrationRevision:number;acres:number}
export const meterId=(scheduleId:string,machineId:string,phase:'before'|'after')=>scheduleId+'_'+machineId+'_'+phase;
export function meterAcres(before:number,after:number,rate:number){if(![before,after].every(value=>Number.isSafeInteger(value)&&value>=0)||after<before||!Number.isFinite(rate)||rate<=0)throw new Error('Enter whole-number readings with closing reading at least the opening reading and a positive calibration.');return Math.round((after-before)/rate*100)/100;}
export async function readMeterCalibration():Promise<MeterCalibration>{const row=await getDoc(doc(db,'settings','mcp_meter'));return row.exists()?row.data() as MeterCalibration:{revolutionsPerAcre:DEFAULT_MCP_REVS_PER_ACRE,revision:1};}
export async function saveMeterCalibration(actor:UserProfile,revolutionsPerAcre:number){
 if(isRemoteBrowser)return remoteCommand('saveMeterCalibration',[revolutionsPerAcre]);
 const user=await getDoc(doc(db,'users',actor.uid));if(!user.exists()||user.data().role!=='admin')throw new Error('Only Admin can edit MCP calibration.');
 if(!Number.isFinite(revolutionsPerAcre)||revolutionsPerAcre<1||revolutionsPerAcre>100000000)throw new Error('Enter a calibration between 1 and 100,000,000 revolutions per acre.');
 const previous=await readMeterCalibration(),value={revolutionsPerAcre,revision:previous.revision+1,updatedBy:actor.uid,updatedAt:new Date().toISOString()};
 const batch=writeBatch(db);batch.set(doc(db,'settings','mcp_meter'),value);batch.set(doc(db,'meter_calibration_audit',crypto.randomUUID()),{previous,...value});await batch.commit();return value;
}
export async function meterScope(actor:UserProfile,scheduleId:string,machineId:string,scannedQRId:string){
 const users=(await getDocs(collection(db,'users'))).docs.map(row=>row.data() as UserProfile),canonical=users.find(row=>row.uid===actor.uid);
 const [seasonDoc,machineDoc]=await Promise.all([getDoc(doc(db,'season_schedules',scheduleId)),getDoc(doc(db,'planters',machineId))]);
 if(!canonical||canonical.role!==actor.role||!['cf','jcf','area_manager'].includes(actor.role)||!seasonDoc.exists()||!machineDoc.exists())throw new Error('The responsible CF, JCF or Area Manager must record the meter.');
 const season=seasonDoc.data() as SeasonSchedule,machine=machineDoc.data() as FieldMachine;
 if(season.archived||!canSeeSeason(canonical,season,users)||!machineInSeason(machine,season,users)||!canManageMachine(canonical,machine,users)||machineTypeName(machine)!=='MCP')throw new Error('Choose an MCP within this season and your reporting scope.');
 if(scannedQRId!==(machine.qrLabelId||machine.id))throw new Error('Scan this machine’s QR before recording its meter.');return {season,machine};
}
export const validMeterPhotos=(photos:unknown):photos is string[]=>Array.isArray(photos)&&photos.length<=3&&photos.every(photo=>typeof photo==='string'&&photo.trim().length>0);
export async function saveSeasonMeterStart(actor:UserProfile,details:{scheduleId:string;machineId:string;scannedQRId:string;reading:number;photos:string[]}){
 if(isRemoteBrowser)return remoteCommand('saveSeasonMeterStart',[details]);
 const {season}=await meterScope(actor,details.scheduleId,details.machineId,details.scannedQRId);
 if(season.seasonEnd<new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}))throw new Error('This season has ended. Enter both readings in its final acreage report.');
 if(!Number.isSafeInteger(details.reading)||details.reading<0||!validMeterPhotos(details.photos))throw new Error('Enter a valid whole-number reading and up to three photos.');
 if((await getDoc(doc(db,'season_production',details.scheduleId+'_'+details.machineId))).exists())throw new Error('A final report already exists for this season.');
 const id=meterId(details.scheduleId,details.machineId,'before'),old=(await getDoc(doc(db,'season_meter_readings',id))).data() as SeasonMeterReading|undefined;
 if(old&&old.reading!==details.reading&&!details.photos.length)throw new Error('Attach a new counter photo when changing the starting reading.');
 if(!details.photos.length&&!old?.photos.length)throw new Error('Attach a clear photo of the starting counter reading.');
 const calibration=old||await readMeterCalibration(),row:SeasonMeterReading={id,scheduleId:details.scheduleId,machineId:details.machineId,phase:'before',reading:details.reading,photos:details.photos.length?details.photos:old?.photos||[],revolutionsPerAcre:calibration.revolutionsPerAcre,calibrationRevision:'calibrationRevision' in calibration?calibration.calibrationRevision:calibration.revision,recordedBy:actor.uid,recordedByName:actor.displayName,timestamp:new Date().toISOString()};
 const batch=writeBatch(db);if(old)batch.set(doc(db,'meter_reading_audit',crypto.randomUUID()),{...old,photos:[],correctedAt:row.timestamp,correctedBy:actor.uid});batch.set(doc(db,'season_meter_readings',id),row);await batch.commit();return row;
}
