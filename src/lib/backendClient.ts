import { isLocalDemo } from './demo';
export const isRemoteBrowser = typeof window !== 'undefined' && !isLocalDemo;
export async function backendRequest(action:string,body:unknown={}) {
 const response=await fetch(`/api/gateway?action=${encodeURIComponent(action)}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({error:'The backend is unavailable. Please try again.'}));
 if(!response.ok){if(response.status===401)window.dispatchEvent(new Event('farmmech-session-expired'));throw new Error(payload.error||'Request failed.');}
 return payload;
}
export async function remoteCommand(name:string,args:unknown[]=[]){const response=await backendRequest('command',{name,args});window.dispatchEvent(new Event('farmmech-data-changed'));return response.result;}
