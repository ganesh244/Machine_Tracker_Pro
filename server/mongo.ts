import { MongoClient, type ClientSession } from 'mongodb';
import { AsyncLocalStorage } from 'node:async_hooks';
import { configureServerStore, type ServerStore } from '../src/lib/data';
export const context = new AsyncLocalStorage<ServerStore>();
configureServerStore(()=>{const value=context.getStore();if(!value)throw new Error('Database operation outside request context.');return value;});
let connection:Promise<MongoClient>|undefined;
export async function mongo(){
 const uri=process.env.MONGODB_URI;
 if(!uri||uri.includes('<db_password>'))throw new Error('Database connection is not configured.');
 const expectedHost=process.env.MONGODB_CLUSTER_HOST;
 if(process.env.NODE_ENV==='production'&&!expectedHost)throw new Error('Database connection is not configured.');
 if(expectedHost&&new URL(uri).hostname!==expectedHost)throw new Error('Database connection does not match the FarmMech cluster.');
 connection ||=new MongoClient(uri,{maxPoolSize:10,serverSelectionTimeoutMS:8000}).connect().catch(error=>{connection=undefined;throw error;});
 const client=await connection;return {client,db:client.db(process.env.MONGODB_DATABASE||'farmmech')};
}
export async function records(session?:ClientSession){const {db}=await mongo();const rows=await db.collection('documents').find({},{session}).toArray();return Object.fromEntries(rows.map(row=>[row.path,row.value]));}
let indexed:Promise<unknown>|undefined;
export async function ensureIndexes(){return indexed ||= (async()=>{const {db}=await mongo();await db.collection('documents').createIndex({path:1},{unique:true});await db.collection('accounts').createIndex({username:1},{unique:true});await db.collection('accounts').createIndex({uid:1},{unique:true});await db.collection('sessions').createIndex({tokenHash:1},{unique:true});await db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0});await db.collection('login_limits').createIndex({expiresAt:1},{expireAfterSeconds:0});})().catch(error=>{indexed=undefined;throw error;});}
export async function transaction<T>(operation:(session:ClientSession)=>Promise<T>){
 await ensureIndexes();const {client,db}=await mongo();const session=client.startSession();
 try{return await session.withTransaction(async()=>{const store:ServerStore={records:await records(session),changed:new Set()};return context.run(store,async()=>{const result=await operation(session);const writes=[...store.changed].map(path=>store.records[path]===undefined?{deleteOne:{filter:{path}}}:{replaceOne:{filter:{path},replacement:{path,value:store.records[path]},upsert:true}});if(writes.length)await db.collection('documents').bulkWrite(writes,{session});return result;});},{readConcern:{level:'snapshot'},writeConcern:{w:'majority'}});}finally{await session.endSession();}
}
export async function closeMongo(){if(connection)await (await connection).close();connection=undefined;indexed=undefined;}
