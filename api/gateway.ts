import { mongo, ensureIndexes, records, transaction, context } from '../server/mongo.js';
import { validateCredentials, verifyPassword, hashPassword, issueSession, currentUser, logout, cookie, throttle, setupAdmin } from '../server/auth.js';
import { visibleRecords } from '../server/scope.js';
import * as field from '../src/lib/fieldOperations.js';
import * as maintenance from '../src/lib/maintenance.js';
import * as seasons from '../src/lib/seasonOperations.js';
import { createTeamUser, updateTeamUserName } from '../src/lib/teamManagement.js';
import { getDoc, getDocs, doc, setDoc } from '../src/lib/data.js';

const commands:Record<string,Function>={updateTeamUserName,createQRBatch:field.createQRBatch,addBatchStickers:field.addBatchStickers,distributeQRLabels:field.distributeQRLabels,onboardFieldMachine:field.onboardFieldMachine,onboardLeadFarmer:field.onboardLeadFarmer,recordFarmerUsage:field.recordFarmerUsage,assignResponsibleCF:field.assignResponsibleCF,raiseMaintenance:maintenance.raiseMaintenance,reviewMaintenance:maintenance.reviewMaintenance,startMaintenance:maintenance.startMaintenance,completeMaintenance:maintenance.completeMaintenance,reviewServiceLog:maintenance.reviewServiceLog,createSeasonSchedule:seasons.createSeasonSchedule,updateSeasonSchedule:seasons.updateSeasonSchedule,archiveSeasonSchedule:seasons.archiveSeasonSchedule,saveSeasonInspection:seasons.saveSeasonInspection};
function safeInput(value:any,depth=0){if(depth>12)throw new Error('Invalid request.');if(typeof value==='string'&&value.length>1500000)throw new Error('An uploaded photo or text is too large.');if(Array.isArray(value)){if(value.length>500)throw new Error('Too many items.');value.forEach(item=>safeInput(item,depth+1));}else if(value&&typeof value==='object'){for(const [key,item] of Object.entries(value)){if(['__proto__','constructor','prototype','__local'].includes(key)||key.startsWith('$')||key.includes('.'))throw new Error('Invalid request field.');safeInput(item,depth+1);}}}
function validateRef(ref:any){if(!ref||!['doc','collection'].includes(ref.kind)||typeof ref.path!=='string'||ref.path.length>300||! /^[a-zA-Z0-9_\-/]+$/.test(ref.path))throw new Error('Invalid record reference.');if(ref.constraints?.length>10)throw new Error('Too many query constraints.');return ref;}
export default async function handler(req:any,res:any){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 try{
  if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
  const expected=process.env.APP_ORIGIN||`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL||'farmmech-machine-tracker.vercel.app'}`;
  const origin=req.headers.origin;if(origin&&origin!==expected&&!(process.env.NODE_ENV!=='production'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)))return res.status(403).json({error:'Request origin is not allowed.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Use JSON.'});
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};if(JSON.stringify(body).length>4000000)return res.status(413).json({error:'Upload is too large. Use fewer or smaller photos.'});safeInput(body);
  const requestStarted=Date.now();
  const action=String(req.query?.action||new URL(req.url,'http://localhost').searchParams.get('action')||'');
  await ensureIndexes();const {db}=await mongo();console.info('FarmMech database ready',{action,elapsed:Date.now()-requestStarted});
  if(action==='session'){const user=await currentUser(req);return res.json({user,setupRequired:!(await db.collection('accounts').countDocuments({}))});}
  if(action==='setup'){await throttle('setup:'+String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||''),5);const user=await setupAdmin(body);res.setHeader('Set-Cookie',cookie(await issueSession(user.uid)));return res.json({user});}
  if(action==='login'){
   const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';const password=typeof body.password==='string'?body.password:'';
   await throttle('login-user:'+username);await throttle('login-ip:'+String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||''),40);
   validateCredentials(username,password);
   const account=await db.collection('accounts').findOne({username,disabled:{$ne:true}});
   // A fixed-cost dummy hash avoids a fast unknown-user response.
   const fallback='scrypt:00000000000000000000000000000000:'+ '0'.repeat(128);
   const valid=await verifyPassword(password,account?.passwordHash||fallback);
   if(!account||!valid)return res.status(401).json({error:'Invalid username or password.'});
   const profile=await db.collection('documents').findOne({path:`users/${account.uid}`});if(!profile)return res.status(401).json({error:'Account profile is unavailable. Contact Admin.'});
   await logout(req);res.setHeader('Set-Cookie',cookie(await issueSession(account.uid,account.passwordVersion||0)));return res.json({user:profile.value});
  }
  if(action==='logout'){await logout(req);res.setHeader('Set-Cookie',cookie('',0));return res.json({ok:true});}
  const actor=await currentUser(req);if(!actor)return res.status(401).json({error:'Sign in to continue.'});
  if(action==='read'||action==='readMany'){
   if(action==='readMany'&&(!Array.isArray(body.refs)||!body.refs.length||body.refs.length>50))throw new Error('Choose between 1 and 50 record references.');
   const refs=(action==='readMany'?body.refs:[body.ref]).map(validateRef);console.info('FarmMech loading records',{action,elapsed:Date.now()-requestStarted});const visible=visibleRecords(actor,await records());console.info('FarmMech records loaded',{action,count:Object.keys(visible).length,elapsed:Date.now()-requestStarted});
   return context.run({records:visible,changed:new Set()},async()=>{
    const results=await Promise.all(refs.map(async(ref:any)=>{if(ref.kind==='doc'){const row=await getDoc(ref);return {path:ref.path,value:row.data()};}const result=await getDocs(ref);return {rows:result.docs.map((row:any)=>({path:row.ref.path,value:row.data()}))};}));
    console.info('FarmMech read completed',{action,collections:refs.map((ref:any)=>ref.path),counts:results.map((result:any)=>result.rows?.length??(result.value?1:0)),bytes:Buffer.byteLength(JSON.stringify(results))});
    return res.json(action==='readMany'?{results}:results[0]);
   });
  }
  if(action==='username'){
   if(actor.role!=='admin')return res.status(403).json({error:'Only Admin can change usernames.'});
   const uid=typeof body.uid==='string'?body.uid:'';
   const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
   if(!/^[a-z0-9][a-z0-9._-]{2,49}$/.test(username))throw new Error('Use a username of 3–50 letters/numbers, dots, underscores or hyphens.');
   const user=await transaction(async session=>{
    const store=context.getStore()!;if(store.records['users/'+actor.uid]?.role!=='admin')throw new Error('Admin access required.');
    const profile=store.records['users/'+uid];const account=await db.collection('accounts').findOne({uid},{session});
    if(!profile||!account)throw new Error('Account not found.');
    const updated={...profile,username};
    await db.collection('accounts').updateOne({uid},{$set:{username}},{session});
    await setDoc(doc({},'users',uid),updated);await setDoc(doc({},'publicProfiles',uid),updated);
    await setDoc(doc({},'team_audit',crypto.randomUUID()),{action:'Username corrected',userId:uid,previousUsername:account.username,username,createdBy:actor.uid,timestamp:new Date().toISOString()});
    return updated;
   });return res.json({user});
  }
  if(action==='password'){
   const target=typeof body.uid==='string'?body.uid:actor.uid;
   if(target!==actor.uid&&actor.role!=='admin')return res.status(403).json({error:'Only Admin can reset another account password.'});
   validateCredentials('password-check',body.password);await throttle('password:'+actor.uid,10);
   const account=await db.collection('accounts').findOne({uid:target});if(!account)return res.status(404).json({error:'Account not found.'});
   if(target===actor.uid&&(typeof body.currentPassword!=='string'||!await verifyPassword(body.currentPassword,account.passwordHash)))return res.status(400).json({error:'Current password is incorrect.'});
   const updated=await db.collection('accounts').updateOne({uid:target,passwordHash:account.passwordHash},{$set:{passwordHash:await hashPassword(body.password)},$inc:{passwordVersion:1}});if(!updated.matchedCount)throw new Error('The account changed. Please retry.');await db.collection('sessions').deleteMany({uid:target});
   await db.collection('account_audit').insertOne({action:'password-reset',target,by:actor.uid,timestamp:new Date()});
   if(target===actor.uid)res.setHeader('Set-Cookie',cookie('',0));return res.json({ok:true,signOut:target===actor.uid});
  }
  if(action==='export'){return res.json({records:visibleRecords(actor,await records()),exportedAt:new Date().toISOString(),version:1});}
  if(action==='notificationRead'){
   const path=String(body.path||'');if(!/^notifications\/[^/]+$/.test(path)||Object.keys(body.value||{}).join(',')!=='read'||body.value.read!==true)return res.status(403).json({error:'Only your notification read state can be changed.'});
   const result=await db.collection('documents').updateOne({path,'value.userId':actor.uid},{$set:{'value.read':true}});if(!result.matchedCount)return res.status(403).json({error:'Notification unavailable.'});return res.json({ok:true});
  }
  if(action==='command'){
   await throttle('command:'+actor.uid,300);const args=body.args;if(!Array.isArray(args)||args.length>5)throw new Error('Invalid command arguments.');
   if(body.name==='dispatchSeasonAlerts'){await transaction(()=>seasons.dispatchSeasonAlerts());return res.json({result:null});}
   if(body.name==='createTeamUser'){
    if(actor.role!=='admin')return res.status(403).json({error:'Only Admin can create accounts.'});const details=args[0];validateCredentials(details?.username,details?.password);const passwordHash=await hashPassword(details.password);
    const user=await transaction(async session=>{const current=context.getStore()!.records['users/'+actor.uid];if(current?.role!=='admin')throw new Error('Admin access required.');const {password:ignoredPassword,...publicDetails}=details;const profile=await createTeamUser(current,publicDetails);await db.collection('accounts').insertOne({uid:profile.uid,username:details.username.toLowerCase(),passwordHash,createdAt:new Date()},{session});return profile;});return res.json({result:user});
   }
   const command=Object.hasOwn(commands,body.name)?commands[body.name]:undefined;if(!command)return res.status(400).json({error:'Unknown operation.'});
   const result=await transaction(async()=>{const canonical=context.getStore()!.records['users/'+actor.uid];if(!canonical)throw new Error('Account not found.');return command(canonical,...args);});return res.json({result:result??null});
  }
  return res.status(404).json({error:'Unknown request.'});
 }catch(error:any){
  console.error('FarmMech API request failed',{name:error?.name||'Error',code:error?.code,action:String(req.query?.action||'')});
  if(error?.code===11000)return res.status(409).json({error:'This username or record already exists. Reload and try again.'});
  if(error?.name?.includes('Mongo')||error?.name?.includes('PoolCleared')||String(error?.message).includes('server monitor timeout')||String(error?.message).includes('Database connection'))return res.status(503).json({error:'Database unavailable. Ask Admin to check the MongoDB connection.'});
  return res.status(error?.status||400).json({error:error instanceof Error?error.message:'The request could not be completed.'});
 }
}
