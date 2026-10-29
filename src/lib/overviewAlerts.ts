import {canManageMachine,type FieldMachine} from './fieldOperations.js';
import {machineTypeName} from './analytics.js';
import {canSeeSeason,machineInSeason,type SeasonSchedule,type SeasonInspection} from './seasonOperations.js';
import {canReviewMaintenance,type FieldMaintenance} from './maintenance.js';
import {meterId,type SeasonMeterReading} from './seasonMeter.js';
import type {SeasonProduction} from './seasonProduction.js';
import type {UserProfile} from '../types.js';
export interface OverviewAction {id:string;kind:'inspection'|'production'|'meter'|'approval'|'repair';title:string;description:string;count:number;label:string;priority:number;scheduleId?:string;phase?:'pre'|'post'}
export function buildOverviewActions(actor:UserProfile,users:UserProfile[],inputMachines:FieldMachine[],schedules:SeasonSchedule[],inspections:SeasonInspection[],production:SeasonProduction[],readings:SeasonMeterReading[],requests:FieldMaintenance[],now=new Date()):OverviewAction[]{
 const machines=inputMachines.filter(machine=>canManageMachine(actor,machine,users)),ids=new Set(machines.map(row=>row.id)),today=now.toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),actions:OverviewAction[]=[];
 const field=['cf','jcf','area_manager','district_manager'].includes(actor.role),reporter=['cf','jcf','area_manager'].includes(actor.role);
 for(const schedule of schedules){if(schedule.archived||!canSeeSeason(actor,schedule,users))continue;const target=machines.filter(machine=>machine.qrLabelId&&machineInSeason(machine,schedule,users));if(!target.length)continue;
  const place=[schedule.name,schedule.state,schedule.district].filter(Boolean).join(' · ');
  for(const phase of ['pre','post'] as const){const date=phase==='pre'?schedule.preAlertDate:schedule.postAlertDate;if(date>today||phase==='pre'&&today>schedule.seasonEnd)continue;
   const completed=new Set(inspections.filter(row=>row.scheduleId===schedule.id&&row.phase===phase).map(row=>row.machineId)),pending=target.filter(machine=>!completed.has(machine.id));
   if(pending.length)actions.push({id:schedule.id+'-'+phase,kind:'inspection',title:phase==='pre'?'Pre-season readiness checks due':'Post-season care checks due',description:place,count:pending.length,label:field?'Scan & inspect':'Track inspections',priority:phase==='pre'?10:12,scheduleId:schedule.id,phase});
  }
  if(schedule.seasonEnd<today){const reported=new Set(production.filter(row=>row.scheduleId===schedule.id).map(row=>row.machineId)),pending=target.filter(machine=>!reported.has(machine.id));if(pending.length)actions.push({id:schedule.id+'-production',kind:'production',title:'Season acreage reports pending',description:place,count:pending.length,label:reporter?'Scan & report acreage':'View reporting progress',priority:15,scheduleId:schedule.id});}
  else if(schedule.preAlertDate<=today){const saved=new Set(readings.filter(row=>row.phase==='before').map(row=>row.id)),pending=target.filter(machine=>machineTypeName(machine)==='MCP'&&!saved.has(meterId(schedule.id,machine.id,'before')));if(pending.length)actions.push({id:schedule.id+'-meter',kind:'meter',title:'MCP opening counter photos needed',description:place,count:pending.length,label:reporter?'Scan & record counter':'View counter collection',priority:11,scheduleId:schedule.id});}
 }
 const relevant=requests.filter(row=>ids.has(row.planterId)),approvals=relevant.filter(request=>canReviewMaintenance(actor,request,machines.find(machine=>machine.id===request.planterId)!,users));
 if(approvals.length)actions.push({id:'maintenance-approvals',kind:'approval',title:actor.role==='farm_mechanization'?'Final maintenance approvals needed':'Maintenance approvals need your decision',description:'Review the issue, estimate and supporting photos.',count:approvals.length,label:'Review approvals',priority:2});
 if(actor.role==='admin'){const ready=relevant.filter(row=>row.status==='approved');if(ready.length)actions.push({id:'approved-repairs',kind:'repair',title:'Approved repairs ready to coordinate',description:'Farm Mechanization approval is complete. Arrange the service team.',count:ready.length,label:'Coordinate repairs',priority:4});}
 if(['cf','jcf'].includes(actor.role)){const ready=relevant.filter(row=>['approved','in_progress'].includes(row.status)&&row.approvals?.farmMechManager?.approved);if(ready.length)actions.push({id:'repair-reports',kind:'repair',title:'Repair completion reports required',description:'After service, submit repairs, photos and the workable confirmation.',count:ready.length,label:'Complete repair report',priority:4});}
 return actions.sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id));
}
