import { canManageMachine,type FieldMachine } from './fieldOperations.js';
import { machineTypeName,type Geography } from './analytics.js';
import { machineInSeason,canSeeSeason, type SeasonSchedule } from './seasonOperations.js';
import {seasonEnded,type SeasonProduction } from './seasonProduction.js';
import type { UserProfile } from '../types.js';
export function seasonProductionAnalytics(actor:UserProfile,users:UserProfile[],inputMachines:FieldMachine[],inputReports:SeasonProduction[],schedules:SeasonSchedule[],seasonId='',year='',geography:Geography='district'){
 const machines=inputMachines.filter(machine=>canManageMachine(actor,machine,users)),ids=new Set(machines.map(row=>row.id));
 const seasons=schedules.filter(row=>canSeeSeason(actor,row,users)&&(!seasonId||row.id===seasonId)&&(!year||row.seasonEnd.slice(0,4)===year));
 const seasonIds=new Set(seasons.map(row=>row.id));
 // Deterministic report IDs and this guard prevent revisions / duplicate inputs being added twice.
 const unique=new Map<string,SeasonProduction>();for(const row of inputReports)if(ids.has(row.machineId)&&seasonIds.has(row.scheduleId)){const key=row.scheduleId+'|'+row.machineId,previous=unique.get(key);if(!previous||row.revision>previous.revision||row.revision===previous.revision&&row.updatedAt>previous.updatedAt)unique.set(key,row);}
 const reports=[...unique.values()],totalAcres=reports.reduce((n,row)=>n+row.totalAcres,0);
 const group=(items:{name:string;acres:number;machineId:string}[])=>{const groups=new Map<string,{name:string;acres:number;machines:Set<string>}>();for(const row of items){const name=row.name.trim()||'Unspecified',key=name.toLowerCase(),current=groups.get(key)||{name,acres:0,machines:new Set<string>()};current.acres+=row.acres;current.machines.add(row.machineId);groups.set(key,current);}return [...groups.values()].map(row=>({...row,machines:row.machines.size})).sort((a,b)=>b.acres-a.acres||a.name.localeCompare(b.name));};
 const crops=group(reports.flatMap(report=>report.crops.map(crop=>({name:crop.crop,acres:crop.acres,machineId:report.machineId}))));
 const byMachine=machines.map(machine=>({machine,name:machine.id,acres:reports.filter(row=>row.machineId===machine.id).reduce((n,row)=>n+row.totalAcres,0),reports:reports.filter(row=>row.machineId===machine.id).length})).sort((a,b)=>b.acres-a.acres);
 const types=group(reports.map(row=>({name:machineTypeName(machines.find(machine=>machine.id===row.machineId)!),acres:row.totalAcres,machineId:row.machineId})));
 const places=group(reports.map(row=>({name:[row[geography],...(geography==='village'?[row.mandal,row.district,row.state]:geography==='mandal'?[row.district,row.state]:geography==='district'?[row.state]:[])].filter(Boolean).join(' · '),acres:row.totalAcres,machineId:row.machineId})));
 const trend=seasons.slice().sort((a,b)=>a.seasonEnd.localeCompare(b.seasonEnd)).map(season=>({name:season.name,acres:reports.filter(row=>row.scheduleId===season.id).reduce((n,row)=>n+row.totalAcres,0),machines:reports.filter(row=>row.scheduleId===season.id).length}));
 const completed=seasons.filter(row=>seasonEnded(row)&&!row.archived);
 const expected=completed.flatMap(season=>machines.filter(machine=>machineInSeason(machine,season,users)).map(machine=>({season,machine}))),pending=expected.filter(({season,machine})=>!reports.some(row=>row.scheduleId===season.id&&row.machineId===machine.id));
 return {machines,reports,totalAcres,crops,byMachine,types,places,trend,pending,expected:expected.length,zeroUse:reports.filter(row=>row.totalAcres===0).length};
}
