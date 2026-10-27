import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mongo, transaction } from './mongo.js';
import { doc, setDoc, getDoc } from '../src/lib/data.js';
import { db as logicalDb } from '../src/lib/database.js';
import type { UserProfile } from '../src/types.js';
const scrypt=promisify(rawScrypt);
export const COOKIE='farmmech_session';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function validateCredentials(username:unknown,password:unknown){if(typeof username!=='string'||! /^[a-z0-9][a-z0-9._-]{2,49}$/i.test(username)||typeof password!=='string'||password.length<12||password.length>128)throw new Error('Use a username of 3–50 letters/numbers and a password of 12–128 characters.');}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64) as Buffer;return `scrypt:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password:string,hash:string){const [,salt,key]=hash.split(':');if(!salt||!key)return false;const actual=await scrypt(password,salt,64) as Buffer;const expected=Buffer.from(key,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export function cookie(token:string,maxAge=43200){return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`;}
export function sessionToken(req:any){return String(req.headers.cookie||'').split(';').map(value=>value.trim()).find(value=>value.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export async function currentUser(req:any){const token=sessionToken(req);if(!token)return null;const {db}=await mongo();const session=await db.collection('sessions').findOne({tokenHash:digest(token),expiresAt:{$gt:new Date()}});if(!session)return null;const account=await db.collection('accounts').findOne({uid:session.uid,disabled:{$ne:true}});if(!account||(session.passwordVersion||0)!==(account.passwordVersion||0))return null;const row=await db.collection('documents').findOne({path:`users/${session.uid}`});return row?.value as UserProfile||null;}
export async function issueSession(uid:string,passwordVersion=0){const {db}=await mongo();const token=randomBytes(32).toString('base64url');await db.collection('sessions').insertOne({uid,passwordVersion,tokenHash:digest(token),expiresAt:new Date(Date.now()+43200000)});return token;}
export async function logout(req:any){const token=sessionToken(req);if(token){const {db}=await mongo();await db.collection('sessions').deleteOne({tokenHash:digest(token)});}}
export async function throttle(key:string,max=10){const {db}=await mongo();const bucket=Math.floor(Date.now()/900000);const row=await db.collection('login_limits').findOneAndUpdate({_id:digest(key+':'+bucket) as any},{$inc:{count:1},$setOnInsert:{expiresAt:new Date(Date.now()+1800000)}},{upsert:true,returnDocument:'after'});if((row?.count||0)>max){const error=new Error('Too many attempts. Please try again in 15 minutes.');(error as any).status=429;throw error;}}
export async function setupAdmin(details:any){
 validateCredentials(details.username,details.password);const configured=process.env.ADMIN_SETUP_TOKEN;
 if(!configured||typeof details.setupToken!=='string'||digest(configured)!==digest(details.setupToken))throw new Error('The setup code is invalid.');
 if(typeof details.displayName!=='string'||details.displayName.trim().length<2)throw new Error('Enter the Admin name.');
 const passwordHash=await hashPassword(details.password);
 return transaction(async session=>{const {db}=await mongo();if(await db.collection('accounts').countDocuments({},{session}))throw new Error('Admin setup is already complete.');
 // This unique marker prevents two concurrent first-admin requests from both succeeding.
 if((await getDoc(doc(logicalDb,'settings','admin-setup'))).exists())throw new Error('Admin setup is already complete.');
 const user:UserProfile={uid:crypto.randomUUID(),username:details.username.toLowerCase(),displayName:details.displayName.trim(),email:'',role:'admin'};
 await setDoc(doc(logicalDb,'users',user.uid),user);await setDoc(doc(logicalDb,'settings','admin-setup'),{completedAt:new Date().toISOString()});
 await db.collection('accounts').insertOne({uid:user.uid,username:user.username,passwordHash,createdAt:new Date()},{session});return user;});
}
