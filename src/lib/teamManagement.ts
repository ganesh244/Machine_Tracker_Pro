import { isRemoteBrowser, remoteCommand } from './backendClient.js';
import { collection, doc, getDoc, getDocs, writeBatch } from './data.js';
import { db } from './database.js';
import { isLocalDemo } from './demo.js';
import { refreshSeasonRecipients } from './seasonOperations.js';
import type { UserProfile, UserRole } from '../types.js';
export const ASSIGNABLE_ROLES = ['state_manager', 'district_manager', 'area_manager', 'cf', 'jcf'] as const;
export const PARENT_ROLES: Partial<Record<UserRole, UserRole[]>> = { state_manager: ['admin'], district_manager: ['state_manager'], area_manager: ['district_manager', 'state_manager'], cf: ['area_manager', 'district_manager', 'state_manager'], jcf: ['cf'] };
export async function createTeamUser(actor: UserProfile, details: { username?:string; password?:string; displayName: string; email: string; role: UserRole; parentId: string; assignedState: string; assignedDistrict: string; assignedMandal: string; assignedArea: string }) {
 if(isRemoteBrowser)return remoteCommand('createTeamUser',[details]);

  const profile = await getDoc(doc(db, 'users', actor.uid));
  if (actor.role !== 'admin' || !profile.exists() || profile.data().role !== 'admin') throw new Error('Only Admin can add team accounts.');
  if (![...ASSIGNABLE_ROLES,...(!isLocalDemo?['admin','farm_mechanization']:[])].includes(details.role)) throw new Error('Choose a supported operational role.');
  const displayName = details.displayName.trim(), email = details.email.trim().toLowerCase();
  if (displayName.length < 2) throw new Error('Enter the user’s full name.');
  if ((isLocalDemo || email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  const users = (await getDocs(collection(db, 'users'))).docs.map(record => record.data() as UserProfile);
  if (email && users.some(user => user.email?.trim().toLowerCase() === email)) throw new Error('An account with this email already exists.');
  const parent = users.find(user => user.uid === details.parentId);
  if (!parent || !(PARENT_ROLES[details.role]||(['admin','farm_mechanization'].includes(details.role)?['admin']:[])).includes(parent.role)) throw new Error('Choose an eligible reporting manager. Area and District manager levels may be skipped when vacant.');
  const user: UserProfile = { uid: crypto.randomUUID(), displayName, email, ...(!isLocalDemo?{username:details.username?.toLowerCase()}:{}), role: details.role, parentId: parent.uid, assignedState: details.assignedState.trim() || parent.assignedState || '', assignedDistrict: details.assignedDistrict.trim() || parent.assignedDistrict || '', assignedMandal: details.assignedMandal.trim() || parent.assignedMandal || '', assignedArea: details.assignedArea.trim() || parent.assignedArea || '' };
  if (user.role === 'farm_mechanization') Object.assign(user, {assignedState:'',assignedDistrict:'',assignedMandal:'',assignedArea:''});
  if (!['admin','farm_mechanization'].includes(user.role) && (!user.assignedState || (user.role !== 'state_manager' && !user.assignedDistrict))) throw new Error('Enter the assigned state and district.');
  const commit = writeBatch(db);
  commit.set(doc(db, 'users', user.uid), user);
  commit.set(doc(db, 'publicProfiles', user.uid), user);
  commit.set(doc(db, 'team_audit', crypto.randomUUID()), { action: 'User created', userId: user.uid, role: user.role, parentId: user.parentId, createdBy: actor.uid, timestamp: new Date().toISOString() });
  await commit.commit(); await refreshSeasonRecipients(); return user;
}

/** Correct a display name without changing login credentials or reporting links. */
export async function updateTeamUserName(actor: UserProfile, uid: string, displayName: string) {
 if(isRemoteBrowser)return remoteCommand('updateTeamUserName',[uid,displayName]);
 const profile=await getDoc(doc(db,'users',actor.uid));
 if(actor.role!=='admin'||!profile.exists()||profile.data().role!=='admin')throw new Error('Only Admin can edit team names.');
 if(typeof displayName!=='string'||displayName.trim().length<2||displayName.trim().length>100)throw new Error('Enter a name of 2–100 characters.');
 const snapshot=await getDoc(doc(db,'users',uid));
 if(!snapshot.exists())throw new Error('User not found.');
 const user={...snapshot.data(),displayName:displayName.trim()} as UserProfile;
 const commit=writeBatch(db);
 commit.set(doc(db,'users',uid),user);
 commit.set(doc(db,'publicProfiles',uid),user);
 commit.set(doc(db,'team_audit',crypto.randomUUID()),{action:'Name corrected',userId:uid,previousName:snapshot.data().displayName,displayName:user.displayName,createdBy:actor.uid,timestamp:new Date().toISOString()});
 await commit.commit();return user;
}
