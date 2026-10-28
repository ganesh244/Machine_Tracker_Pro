import React, { useState } from 'react';
import { ChevronRight, Search, Users, ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../../types';
import { ROLE_NAMES } from '../../lib/fieldOperations';
import './team-directory.css';

export function TeamDirectory({ users, canEdit, machineCount, onEdit, onReset }: { key?: string; users: UserProfile[]; canEdit: boolean; machineCount: (user: UserProfile) => number; onEdit: (user: UserProfile) => void; onReset: (user: UserProfile) => void }) {
 const [selectedId,setSelectedId]=useState(''),[query,setQuery]=useState('');
 const selected=users.find(user=>user.uid===selectedId);
 const children=(id:string)=>users.filter(user=>user.parentId===id&&user.uid!==id);
 const search=query.trim().toLowerCase();
 const roots=users.filter(user=>!users.some(parent=>parent.uid===user.parentId)||users.some(parent=>parent.uid===user.parentId&&parent.role==='admin'));
 const rows=(search?users.filter(user=>[user.displayName,user.username,user.email,ROLE_NAMES[user.role],user.assignedState,user.assignedDistrict,user.assignedMandal,user.assignedArea].filter(Boolean).join(' ').toLowerCase().includes(search)):selected?children(selected.uid):roots).slice().sort((a,b)=>a.displayName.localeCompare(b.displayName));
 const ancestors:UserProfile[]=[];const seen=new Set<string>();let cursor=selected;
 while(cursor&&!seen.has(cursor.uid)){seen.add(cursor.uid);ancestors.unshift(cursor);const parent=users.find(user=>user.uid===cursor?.parentId);cursor=parent?.role==='admin'?undefined:parent;}
 const open=(user:UserProfile)=>{setSelectedId(user.uid);setQuery('');};
 const location=(user:UserProfile)=>[user.assignedArea,user.assignedDistrict,user.assignedState].filter(Boolean).join(' · ')||'Organization-wide';
 const accountActions=(user:UserProfile)=>canEdit&&<div className="td-account"><button className="fo-text-button" onClick={()=>onEdit(user)}>Edit name</button><button className="fo-text-button" onClick={()=>onReset(user)}>Reset password</button></div>;
 return <div className="td-directory">
  <div className="td-toolbar"><label className="td-search"><Search size={18}/><input aria-label="Search team members" type="search" placeholder="Search name, username, role or area…" value={query} onChange={event=>setQuery(event.target.value)}/></label><span>{users.length} team members</span></div>
  <nav className="td-breadcrumbs" aria-label="Team hierarchy"><button onClick={()=>{setSelectedId('');setQuery('');}}>Team directory</button>{ancestors.map(user=><React.Fragment key={user.uid}><ChevronRight size={14}/><button aria-current={user.uid===selected?.uid?'page':undefined} onClick={()=>open(user)}>{user.displayName}</button></React.Fragment>)}</nav>
  {selected&&!search&&<section className="td-selected"><div><button className="fo-text-button" onClick={()=>{const previous=ancestors[ancestors.length-2];setSelectedId(previous?.uid||'');}}><ArrowLeft size={15}/>Back</button><h3>{selected.displayName}</h3><p>{ROLE_NAMES[selected.role]} · {location(selected)}</p><small>Username: {selected.username||selected.email||'—'} · {machineCount(selected)} machines in branch</small></div>{accountActions(selected)}</section>}
  <div className="td-list-heading"><h3>{search?'Search results':selected?'Direct reports':'Reporting teams'}</h3><span aria-live="polite">{rows.length} {search?'matches':selected?'direct reports':'entries'}</span></div>
  {!selected&&!search&&<p className="td-hint">Open a manager to explore their reporting team, one level at a time.</p>}
  <div className="td-grid">{rows.map(user=>{const reports=children(user.uid),manager=users.find(parent=>parent.uid===user.parentId);return <article className="td-member" key={user.uid}><button className="td-open" aria-label={`View team of ${user.displayName}`} onClick={()=>open(user)}><span className="td-avatar">{user.displayName.slice(0,1)}</span><span className="td-copy"><strong>{user.displayName}</strong><span className="td-role">{ROLE_NAMES[user.role]}</span><small>{location(user)}</small><small>{user.username||user.email}</small></span><ChevronRight size={19}/></button><div className="td-facts"><span><Users size={14}/>{reports.length} direct reports</span><span>{machineCount(user)} machines</span></div>{search&&<p className="td-manager">Reports to {manager?.displayName||'Organization'}</p>}{accountActions(user)}</article>;})}</div>
  {!rows.length&&<div className="fo-empty"><Users size={28}/><h3>{search?'No matching team members':'No direct reports yet'}</h3><p>{search?'Try a different name, role, district or area.':'This account has no team members reporting directly to it.'}</p>{search&&<button className="fo-button secondary" onClick={()=>setQuery('')}>Clear search</button>}</div>}
 </div>;
}
