import { branchIds, reportingAncestors, canManageMachine, type FieldMachine } from '../src/lib/fieldOperations.js';
import { canSeeSeason, type SeasonSchedule } from '../src/lib/seasonOperations.js';
import type { UserProfile } from '../src/types.js';
export function visibleRecords(actor:UserProfile,all:Record<string,any>){
 const users=Object.entries(all).filter(([path])=>/^users\/[^/]+$/.test(path)).map(([,value])=>value as UserProfile);
 const branch=branchIds(users,actor.uid),directory=new Set([...branch,...reportingAncestors(users,actor.uid).map(user=>user.uid)]),global=['admin','farm_mechanization'].includes(actor.role);
 const historySeasons=new Set(Object.entries(all).filter(([path,row])=>path.startsWith('season_production/')&&row.cfId&&canManageMachine(actor,{cfId:row.cfId,currentHolderId:row.cfId} as FieldMachine,users)).map(([,row])=>row.scheduleId));
 const machines=new Set(Object.entries(all).filter(([path,value])=>/^planters\/[^/]+$/.test(path)&&canManageMachine(actor,value as FieldMachine,users)).map(([path])=>path.split('/')[1]));
 const visibleLabels=new Set(Object.entries(all).filter(([path,row])=>/^qr_labels\/[^/]+$/.test(path)&&(global||branch.has(row.holderId)||machines.has(row.machineId))).map(([path])=>path.split('/')[1]));
 const batches=new Set([...visibleLabels].map(id=>all['qr_labels/'+id]?.batchId));
 return Object.fromEntries(Object.entries(all).filter(([path,row])=>{const [kind,id,child]=path.split('/');
 switch(kind){
 case 'machine_movements':return machines.has(row.machineId)||canManageMachine(actor,{cfId:row.fromCFId,currentHolderId:row.fromCFId} as FieldMachine,users)||canManageMachine(actor,{cfId:row.toCFId,currentHolderId:row.toCFId} as FieldMachine,users);
 case 'settings':return id==='mcp_meter';
 case 'users':return global||directory.has(id)||['admin','farm_mechanization'].includes(row.role);
 case 'planters':return machines.has(id)&&(!child||child==='usageLogs');
 case 'season_production':return machines.has(row.machineId)||!!row.cfId&&canManageMachine(actor,{cfId:row.cfId,currentHolderId:row.cfId} as FieldMachine,users);
 case 'farmers':case 'field_usage':case 'season_inspections':case 'season_meter_readings':return machines.has(row.machineId);
 case 'maintenance_requests':case 'maintenance_logs':return machines.has(row.planterId);
 case 'notifications':return row.userId===actor.uid;
 case 'qr_labels':return visibleLabels.has(id);
 case 'qr_batches':return global||batches.has(id);
 case 'qr_transfers':return global||branch.has(row.fromUserId)||branch.has(row.toUserId);
 case 'season_schedules':return canSeeSeason(actor,row as SeasonSchedule,users)||historySeasons.has(id);
 default:return false;
 }
 }));
}
