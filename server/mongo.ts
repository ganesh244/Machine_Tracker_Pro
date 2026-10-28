import { attachDatabasePool } from '@vercel/functions';
import { MongoClient, type ClientSession } from 'mongodb';
import { AsyncLocalStorage } from 'node:async_hooks';
import { configureServerStore, type ServerStore } from '../src/lib/data.js';
export const context = new AsyncLocalStorage<ServerStore>();
configureServerStore(()=>{const value=context.getStore();if(!value)throw new Error('Database operation outside request context.');return value;});
let connection:Promise<MongoClient>|undefined;
export async function mongo(){
 const uri=process.env.MONGODB_URI;
 if(!uri||uri.includes('<db_password>'))throw new Error('Database connection is not configured.');
 const expectedHost=process.env.MONGODB_CLUSTER_HOST;
 if(process.env.NODE_ENV==='production'&&!expectedHost)throw new Error('Database connection is not configured.');
 if(expectedHost&&new URL(uri).hostname!==expectedHost)throw new Error('Database connection does not match the FarmMech cluster.');
 if(!connection){
  const client=new MongoClient(uri,{maxPoolSize:5,minPoolSize:0,maxIdleTimeMS:5000,maxConnecting:2,serverMonitoringMode:'poll',serverSelectionTimeoutMS:8000,connectTimeoutMS:8000,waitQueueTimeoutMS:8000,socketTimeoutMS:60000,compressors:['zlib']});
  // Release idle sockets before Vercel suspends the instance; polling avoids a
  // long-lived streaming heartbeat being resumed after its deadline expired.
  attachDatabasePool(client);
  connection=client.connect().catch(async error=>{connection=undefined;await client.close().catch(()=>{});throw error;});
 }
 const client=await connection;return {client,db:client.db(process.env.MONGODB_DATABASE||'farmmech')};
}
let cachedRecords:{version:number;records:Record<string,any>}|undefined;
let loadingRecords:Promise<Record<string,any>>|undefined;
export function invalidateRecords(){cachedRecords=undefined;}
async function loadRecords(session?:ClientSession,collections?:string[]){
 const {db}=await mongo();
 const filter=collections?{path:{$regex:'^('+collections.join('|')+')/'}}:{};
 const rows=await db.collection('documents').find(filter,{session,maxTimeMS:20000,...(collections?{projection:{'value.photos':0,'value.gallery':0,'value.imageUrl':0}}:{})}).toArray();
 return Object.fromEntries(rows.map(row=>[row.path,row.value]));
}
export async function records(session?:ClientSession,collections?:string[]){
 if(session||collections)return loadRecords(session,collections);
 // Share a download across simultaneous legacy and batched reads. A tiny,
 // transactional revision check prevents repeatedly transferring saved photos.
 if(loadingRecords)return loadingRecords;
 loadingRecords=(async()=>{const {db}=await mongo();const version=(await db.collection('sync_meta').findOne({_id:'records' as any}))?.revision||0;
  if(cachedRecords?.version===version)return cachedRecords.records;
  const rows=await loadRecords();cachedRecords={version,records:rows};return rows;
 })().finally(()=>{loadingRecords=undefined;});return loadingRecords;
}
let indexed:Promise<unknown>|undefined;
export async function ensureIndexes(){return indexed ||= (async()=>{const {db}=await mongo();await db.collection('documents').createIndex({path:1},{unique:true});await db.collection('accounts').createIndex({username:1},{unique:true});await db.collection('accounts').createIndex({uid:1},{unique:true});await db.collection('sessions').createIndex({tokenHash:1},{unique:true});await db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0});await db.collection('login_limits').createIndex({expiresAt:1},{expireAfterSeconds:0});})().catch(error=>{indexed=undefined;throw error;});}
export async function transaction<T>(operation:(session:ClientSession)=>Promise<T>,collections?:string[]){
 await ensureIndexes();const {client,db}=await mongo();const session=client.startSession();
 try{return await session.withTransaction(async()=>{const store:ServerStore={records:await records(session,collections),changed:new Set()};return context.run(store,async()=>{const result=await operation(session);const writes=[...store.changed].map(path=>store.records[path]===undefined?{deleteOne:{filter:{path}}}:{replaceOne:{filter:{path},replacement:{path,value:store.records[path]},upsert:true}});if(writes.length){await db.collection('documents').bulkWrite(writes,{session});await db.collection('sync_meta').updateOne({_id:'records' as any},{$inc:{revision:1}},{upsert:true,session});invalidateRecords();}return result;});},{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});}finally{await session.endSession();}
}
export async function closeMongo(){if(connection)await (await connection).close();connection=undefined;indexed=undefined;cachedRecords=undefined;loadingRecords=undefined;}
