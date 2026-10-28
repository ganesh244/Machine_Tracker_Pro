import { PasswordInput } from './PasswordInput';
import React,{useState} from 'react';
import { Leaf,LockKeyhole } from 'lucide-react';
import { backendRequest } from '../../lib/backendClient';
import type { UserProfile } from '../../types';
import './operations.css';
export function AccountLogin({setupRequired,onSuccess}:{setupRequired:boolean;onSuccess:(user:UserProfile)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 return <main className="fo-app fo-login"><section className="fo-login-card"><div className="fo-brand"><span><Leaf size={22}/></span>FarmMech</div><p className="fo-eyebrow">FIELD OPERATIONS</p><h1>{setupRequired?'Set up your Admin account':'Welcome back'}</h1><p>{setupRequired?'Create the first Admin account using the private setup code supplied by your deployment administrator.':'Sign in with the username and password provided by your Admin team.'}</p><form className="fo-form" style={{marginTop:24}} onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);try{const result=await backendRequest(setupRequired?'setup':'login',Object.fromEntries(data));onSuccess(result.user);}catch(error){setError(error instanceof Error?error.message:'Could not sign in.');}finally{setBusy(false);}}}>
 {setupRequired&&<><label className="fo-field">Admin name<input name="displayName" required minLength={2} maxLength={100} autoComplete="name"/></label><label className="fo-field">Private setup code<PasswordInput name="setupToken" required autoComplete="off"/></label></>}
 <label className="fo-field">Username<input name="username" required minLength={3} maxLength={50} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,49}" autoComplete="username" autoCapitalize="none" spellCheck={false}/></label>
 <label className="fo-field">Password<PasswordInput name="password" required minLength={12} maxLength={128} autoComplete={setupRequired?'new-password':'current-password'}/></label>
 {error&&<p className="fo-error" role="alert">{error}</p>}<button className="fo-button primary full" disabled={busy}><LockKeyhole size={17}/>{busy?'Please wait…':setupRequired?'Create Admin account':'Sign in'}</button>
 <p className="fo-form-note">{setupRequired?'Passwords must have at least 12 characters.':'Need an account or password reset? Contact your Admin team.'}</p></form></section></main>;
}
