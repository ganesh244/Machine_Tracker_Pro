import {createHash} from 'node:crypto';
import {mongo,transaction,context} from './mongo.js';
import type {UserProfile} from '../src/types.js';

// An explicit allowlist prevents a reset from touching identity/configuration data.
export const OPERATIONAL_COLLECTIONS=['planters','qr_batches','qr_labels','qr_transfers','qr_batch_additions','farmers','field_usage','updates','maintenance_requests','maintenance_logs','season_schedules','season_inspections','season_production','season_meter_readings','meter_reading_audit','machine_movements','machine_assignments','notifications'];
const filter={path:{$regex:'^('+OPERATIONAL_COLLECTIONS.join('|')+')/'}};
const adminOnly=(actor:UserProfile)=>{if(actor.role!=='admin')throw Object.assign(new Error('Only Admin can reset or restore operational data.'),{status:403});};
const fingerprint=(rows:any[])=>createHash('sha256').update(JSON.stringify(rows.map(row=>row.path).sort())).digest('hex');
const counts=(rows:any[])=>Object.fromEntries(OPERATIONAL_COLLECTIONS.map(name=>[name,rows.filter(row=>row.path.startsWith(name+'/')).length]));
export async function previewWorkspaceReset(actor:UserProfile){
 adminOnly(actor);const {db}=await mongo();
 const [rows,revision,users,accounts,last]=await Promise.all([db.collection('documents').find(filter,{projection:{path:1}}).toArray(),db.collection('sync_meta').findOne({_id:'records' as any}),db.collection('documents').countDocuments({path:{$regex:'^users/[^/]+$'}}),db.collection('accounts').countDocuments({}),db.collection<any>('operation_resets').find({status:'available'}).sort({createdAt:-1}).limit(1).next()]);
 return {counts:counts(rows),total:rows.length,revision:revision?.revision||0,fingerprint:fingerprint(rows),users,accounts,lastBackup:last?{id:last._id,createdAt:last.createdAt,total:last.total}:null};
}
export async function resetOperationalWorkspace(actor:UserProfile,input:{revision:number;fingerprint:string;confirmation:string}){
 adminOnly(actor);if(input.confirmation!=='RESET OPERATIONS')throw new Error('Type RESET OPERATIONS to confirm.');
 const result=await transaction(async session=>{
  const store=context.getStore()!;if(store.records['users/'+actor.uid]?.role!=='admin')throw new Error('Admin access changed. Reload your account.');
  const {db}=await mongo();const rows=await db.collection('documents').find(filter,{session}).toArray(),version=(await db.collection('sync_meta').findOne({_id:'records' as any},{session}))?.revision||0;
  if(version!==input.revision||fingerprint(rows)!==input.fingerprint)throw new Error('The workspace changed. Review the latest counts before resetting.');
  if(!rows.length)throw new Error('The operational workspace is already empty.');
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  // Photos stay in MongoDB in separate backup documents, without credentials.
  for(let start=0;start<rows.length;start+=250)await db.collection<any>('operation_reset_items').insertMany(rows.slice(start,start+250).map(row=>({_id:{resetId:id,path:row.path},resetId:id,path:row.path,value:row.value})),{session});
  await db.collection<any>('operation_resets').insertOne({_id:id,createdAt,createdBy:actor.uid,status:'available',total:rows.length,counts:counts(rows)},{session});
  for(const row of rows){delete store.records[row.path];store.changed.add(row.path);}
  return {backupId:id,createdAt,total:rows.length,counts:counts(rows)};
 });return result;
}
export async function restoreOperationalWorkspace(actor:UserProfile,backupId:string){
 adminOnly(actor);if(typeof backupId!=='string'||backupId.length>100)throw new Error('Choose a valid reset backup.');
 return transaction(async session=>{
  const store=context.getStore()!;if(store.records['users/'+actor.uid]?.role!=='admin')throw new Error('Admin access changed. Reload your account.');
  const {db}=await mongo();if(await db.collection('documents').countDocuments(filter,{session}))throw new Error('Restore is available only before new operational records are created.');
  const backup=await db.collection<any>('operation_resets').findOne({_id:backupId,status:'available'},{session});if(!backup)throw new Error('Reset backup is unavailable or already restored.');
  const rows=await db.collection('operation_reset_items').find({resetId:backupId},{session}).toArray();if(rows.length!==backup.total)throw new Error('The backup is incomplete. No records were restored.');
  for(const row of rows){if(!OPERATIONAL_COLLECTIONS.includes(row.path.split('/')[0]))throw new Error('Unexpected record in reset backup.');store.records[row.path]=row.value;store.changed.add(row.path);}
  await db.collection<any>('operation_resets').updateOne({_id:backupId,status:'available'},{$set:{status:'restored',restoredAt:new Date().toISOString(),restoredBy:actor.uid}},{session});
  return {restored:rows.length};
 });
}
