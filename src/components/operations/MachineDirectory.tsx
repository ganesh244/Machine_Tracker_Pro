import React,{useMemo,useState} from 'react';
import {ChevronRight,MapPin,Search,Tractor} from 'lucide-react';
import type {FieldMachine,LeadFarmer,FieldUsage} from '../../lib/fieldOperations';
import type {UserProfile} from '../../types';
import {machineDirectoryRow} from '../../lib/machineDirectory';
import './machine-directory.css';
export function MachineDirectory({machines,users,farmers,usages,renderMachines}:{key?:string;machines:FieldMachine[];users:UserProfile[];farmers:LeadFarmer[];usages:FieldUsage[];renderMachines:(machines:FieldMachine[])=>React.ReactNode}) {
 const [state,setState]=useState(''),[district,setDistrict]=useState(''),[area,setArea]=useState(''),[cf,setCF]=useState(''),[type,setType]=useState(''),[readiness,setReadiness]=useState(''),[query,setQuery]=useState(''),[sort,setSort]=useState('id'),[showAll,setShowAll]=useState(false);
 const rows=useMemo(()=>machines.map(machine=>machineDirectoryRow(machine,users,farmers,usages)),[machines,users,farmers,usages]);
 const options=(values:string[])=>[...new Set(values)].sort((a,b)=>a.localeCompare(b));
 const scoped=rows.filter(row=>(!state||row.state===state)&&(!district||row.district===district)&&(!area||row.area===area));
 const matches=scoped.filter(row=>(!cf||row.cfId===cf)&&(!type||row.type===type)&&(!readiness||row.readiness===readiness)&&[row.machine.id,row.machine.serialNumber,row.machine.brand,row.type,row.cfName,row.farmer,row.state,row.district,row.area].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 matches.sort((a,b)=>sort==='acres'?b.acres-a.acres:sort==='id'?a.machine.id.localeCompare(b.machine.id):String(a[sort as 'area'|'district'|'cfName'|'type']).localeCompare(String(b[sort as 'area'|'district'|'cfName'|'type']))||a.machine.id.localeCompare(b.machine.id));
 const next=!state?'state':!district?'district':'area';
 const groups=options(scoped.map(row=>row[next]));
 const browsing=!area&&!showAll&&!query.trim()&&!cf&&!type&&!readiness;
 const reset=()=>{setState('');setDistrict('');setArea('');setCF('');setType('');setReadiness('');setQuery('');setSort('id');setShowAll(false);};
 const chooseState=(value:string)=>{setState(value);setDistrict('');setArea('');setCF('');setShowAll(false);};
 const chooseDistrict=(value:string)=>{setDistrict(value);setArea('');setCF('');setShowAll(false);};
 return <div className="md-directory">
 <div className="md-controls"><label className="md-search"><Search size={17}/><input type="search" aria-label="Search machines" placeholder="Search QR, type, CF, farmer or location…" value={query} onChange={event=>setQuery(event.target.value)}/></label><button className="fo-text-button" onClick={reset}>Reset filters</button></div>
 <div className="md-filters">
 <label>State<select aria-label="Filter machines by state" value={state} onChange={event=>chooseState(event.target.value)}><option value="">All states</option>{options(rows.map(row=>row.state)).map(value=><option key={value}>{value}</option>)}</select></label>
 <label>District<select aria-label="Filter machines by district" value={district} disabled={!state} onChange={event=>chooseDistrict(event.target.value)}><option value="">All districts</option>{options(rows.filter(row=>!state||row.state===state).map(row=>row.district)).map(value=><option key={value}>{value}</option>)}</select></label>
 <label>Area<select aria-label="Filter machines by area" value={area} disabled={!district} onChange={event=>{setArea(event.target.value);setCF('');}}><option value="">All areas</option>{options(rows.filter(row=>(!state||row.state===state)&&(!district||row.district===district)).map(row=>row.area)).map(value=><option key={value}>{value}</option>)}</select></label>
 <label>Responsible CF<select aria-label="Filter machines by CF" value={cf} onChange={event=>setCF(event.target.value)}><option value="">All CFs</option>{options(scoped.map(row=>row.cfId)).filter(Boolean).map(id=><option key={id} value={id}>{users.find(user=>user.uid===id)?.displayName}</option>)}</select></label>
 <label>Machine type<select aria-label="Filter machines by type" value={type} onChange={event=>setType(event.target.value)}><option value="">All types</option>{options(rows.map(row=>row.type)).map(value=><option key={value}>{value}</option>)}</select></label>
 <label>Readiness<select aria-label="Filter machines by readiness" value={readiness} onChange={event=>setReadiness(event.target.value)}><option value="">All readiness</option><option value="running">Running</option><option value="idle">Idle</option><option value="maintenance">Maintenance</option><option value="needs_farmer">Needs lead farmer</option></select></label>
 </div>
 <nav className="md-breadcrumbs" aria-label="Machine locations"><button onClick={()=>{chooseState('');}}>All locations</button>{state&&<><ChevronRight size={14}/><button onClick={()=>chooseDistrict('')}>{state}</button></>}{district&&<><ChevronRight size={14}/><button onClick={()=>{setArea('');setShowAll(false);}}>{district}</button></>}{area&&<><ChevronRight size={14}/><strong>{area}</strong></>}</nav>
 <div className="md-result-bar"><div><h3>{browsing?`Browse by ${next}`:'Machines'}</h3><p aria-live="polite">{matches.length} of {machines.length} machines in your reporting scope</p></div>{browsing?<button className="fo-button secondary small" onClick={()=>setShowAll(true)}>View machines here</button>:<label>Sort by<select aria-label="Sort machines" value={sort} onChange={event=>setSort(event.target.value)}><option value="id">QR ID</option><option value="district">District</option><option value="area">Area</option><option value="cfName">CF name</option><option value="type">Machine type</option><option value="acres">Most acres covered</option></select></label>}</div>
 {browsing&&<div className="md-groups">{groups.map(value=><button key={value} className="md-group" onClick={()=>next==='state'?chooseState(value):next==='district'?chooseDistrict(value):setArea(value)}><span className="md-location-icon"><MapPin size={21}/></span><span><strong>{value}</strong><small>{scoped.filter(row=>row[next]===value).length} machines</small></span><ChevronRight size={18}/></button>)}</div>}
 {!browsing&&matches.length>0&&renderMachines(matches.map(row=>row.machine))}
 {(!machines.length||!matches.length)&&<div className="fo-empty"><Tractor size={28}/><h3>{machines.length?'No machines match these filters':'No machines onboarded yet'}</h3><p>{machines.length?'Try another location or reset the filters.':'Locations appear here when your team onboards machines.'}</p></div>}
 </div>;
}
