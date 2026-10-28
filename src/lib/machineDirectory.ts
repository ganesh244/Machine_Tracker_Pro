import type { FieldMachine, LeadFarmer, FieldUsage } from './fieldOperations.js';
import type { UserProfile } from '../types.js';
export function machineDirectoryRow(machine:FieldMachine,users:UserProfile[],farmers:LeadFarmer[],usages:FieldUsage[]) {
 const cf=users.find(user=>user.uid===(machine.cfId||machine.currentHolderId));
 const location=typeof machine.location==='object'?machine.location:undefined;
 const seen=new Set<string>();let manager=cf;let area='';
 while(manager&&!seen.has(manager.uid)){seen.add(manager.uid);area ||= manager.assignedArea||'';manager=users.find(user=>user.uid===manager?.parentId);}
 return {machine,state:machine.state||cf?.assignedState||'State not recorded',district:location?.district||machine.district||cf?.assignedDistrict||'District not recorded',area:area||location?.mandal||machine.mandal||'Area not recorded',cfId:cf?.uid||'',cfName:cf?.displayName||'Unassigned',farmer:farmers.find(farmer=>farmer.id===machine.leadFarmerId)?.name||'',type:machine.machineType||machine.type||'Not specified',readiness:machine.operatingStatus==='maintenance'||machine.status==='maintenance'?'maintenance':!machine.leadFarmerId?'needs_farmer':machine.operatingStatus==='operating'||machine.status==='in_use'?'running':'idle',acres:usages.filter(usage=>usage.machineId===machine.id).reduce((sum,usage)=>sum+usage.landAcres,0)};
}
