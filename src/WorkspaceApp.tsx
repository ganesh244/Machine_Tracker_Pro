import React,{useEffect,useState} from 'react';
import { isLocalDemo } from './lib/demo';
import { backendRequest } from './lib/backendClient';
import { OperationsWorkspace } from './components/operations/OperationsWorkspace';
import { AccountLogin } from './components/operations/AccountLogin';
import type { UserProfile } from './types';
export default function WorkspaceApp(){
 const [user,setUser]=useState<UserProfile|null>(null),[loaded,setLoaded]=useState(isLocalDemo),[setupRequired,setSetupRequired]=useState(false),[error,setError]=useState('');
 const load=()=>{setError('');void backendRequest('session').then(result=>{setUser(result.user);setSetupRequired(result.setupRequired);}).catch(error=>setError(error.message)).finally(()=>setLoaded(true));};
 useEffect(()=>{if(isLocalDemo)return;load();const expired=()=>{setUser(null);};window.addEventListener('farmmech-session-expired',expired);return()=>window.removeEventListener('farmmech-session-expired',expired);},[]);
 if(isLocalDemo)return <OperationsWorkspace onOpenTools={()=>window.alert('All field operations are available in the workspace navigation.')}/>;
 if(!loaded)return <main className="fo-app fo-login"><p role="status">Connecting to FarmMech…</p></main>;
 if(error)return <main className="fo-app fo-login"><section className="fo-login-card"><h1>Connection unavailable</h1><p role="alert">{error}</p><button className="fo-button primary" onClick={load}>Try again</button></section></main>;
 if(!user)return <AccountLogin setupRequired={setupRequired} onSuccess={user=>{setSetupRequired(false);setUser(user);}}/>;
 return <OperationsWorkspace sessionUser={user} onSignOut={()=>{void backendRequest('logout').then(()=>setUser(null)).catch(error=>setError(error.message));}} onOpenTools={()=>window.alert('Use the workspace navigation to access your team’s tools.')}/>;
}
