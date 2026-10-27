// Keep the existing data API while routing the local demo to browser storage.
import { backendRequest, isRemoteBrowser } from './backendClient';
export interface ServerStore { records:Record<string,any>; changed:Set<string> }
let serverProvider:(()=>ServerStore)|undefined;
export function configureServerStore(provider:()=>ServerStore){serverProvider=provider;}
import { isLocalDemo, DEMO_STORE_KEY, seedDemo, upgradeDemoRoles } from './demo';

type LocalRef = { path: string; kind: 'doc' | 'collection'; constraints?: any[]; id: string };
let records: Record<string, any> | undefined;
const listeners = new Set<() => void>();
const clone = (value: any) => value === undefined ? undefined : structuredClone(value);
function store() {
  if(serverProvider)return serverProvider().records;
  if (!records) {
    const saved = localStorage.getItem(DEMO_STORE_KEY);
    records = saved ? JSON.parse(saved) : seedDemo();
    const upgraded = upgradeDemoRoles(records!);
    if (!saved || upgraded) localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(records));
  }
  return records!;
}
function persist(next: Record<string, any>) {
  if(serverProvider){const context=serverProvider();for(const path of new Set([...Object.keys(context.records),...Object.keys(next)]))if(JSON.stringify(context.records[path])!==JSON.stringify(next[path]))context.changed.add(path);context.records=next;return;}
  localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(next));
  records = next;
  listeners.forEach(listener => listener());
}
if (isLocalDemo) window.addEventListener('storage', event => {
  if (event.key === DEMO_STORE_KEY) { records = undefined; listeners.forEach(listener => listener()); }
});
function reference(kind: LocalRef['kind'], parent: any, ...segments: string[]): LocalRef {
  const path = [parent?.path, ...segments].filter(Boolean).join('/');
  return { path, kind, id: path.split('/').at(-1)! };
}
function snapshot(path: string, value: any) {
  return { id: path.split('/').at(-1)!, ref: reference('doc', null, path), exists: () => value !== undefined, data: () => clone(value), get: (key: string) => value?.[key] };
}
const field = (value: any, key: string) => key.split('.').reduce((current, part) => current?.[part], value);
function result(ref: LocalRef): any {
  const data = store();
  if (ref.kind === 'doc') return snapshot(ref.path, data[ref.path]);
  let entries = Object.entries(data).filter(([path]) => path.startsWith(ref.path + '/') && path.split('/').length === ref.path.split('/').length + 1);
  for (const constraint of ref.constraints || []) {
    const [key, operator, target] = constraint.args;
    if (constraint.type === 'where') entries = entries.filter(([, value]) => {
      const current = field(value, key);
      switch (operator) {
        case '==': return current === target;
        case '!=': return current !== undefined && current !== target;
        case '>=': return current >= target;
        case '<=': return current <= target;
        case '>': return current > target;
        case '<': return current < target;
        case 'in': return target.includes(current);
        case 'array-contains': return current?.includes(target);
        default: throw new Error(`Unsupported local filter: ${operator}`);
      }
    });
  }
  const ordering = (ref.constraints || []).filter(c => c.type === 'orderBy');
  entries.sort((a, b) => {
    for (const { args: [key, direction] } of ordering) {
      const left = field(a[1], key), right = field(b[1], key);
      const comparison = left === right ? 0 : left > right ? 1 : -1;
      if (comparison) return direction === 'desc' ? -comparison : comparison;
    }
    return 0;
  });
  const cap = ref.constraints?.find(c => c.type === 'limit');
  if (cap) entries = entries.slice(0, cap.args[0]);
  const docs = entries.map(([path, value]) => snapshot(path, value));
  return { docs, size: docs.length, empty: !docs.length, forEach: (callback: any) => docs.forEach(callback) };
}
function apply(previous: any, values: any) {
  const next = clone(previous || {});
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const parts = key.split('.');
    const last = parts.pop()!;
    let target = next;
    parts.forEach(part => { target = target[part] ??= {}; });
    const transform = value as any;
    if (transform?.__local === 'increment') target[last] = (target[last] || 0) + transform.value;
    else if (transform?.__local === 'arrayUnion') {
      target[last] = [...(target[last] || [])];
      for (const item of transform.value) {
        if (!target[last].some((existing: any) => JSON.stringify(existing) === JSON.stringify(item))) target[last].push(clone(item));
      }
    }
    else target[last] = clone(value);
  }
  return next;
}
const choose = (remote:any, local:any):any => isRemoteBrowser ? remote : local;
const remoteSnapshot=(row:any)=>snapshot(row.path,row.value);
async function remoteRead(ref:LocalRef){const response=await backendRequest('read',{ref});if(ref.kind==='doc')return remoteSnapshot(response);const docs=response.rows.map(remoteSnapshot);return {docs,size:docs.length,empty:!docs.length,forEach:(callback:any)=>docs.forEach(callback)};}
function remoteSubscribe(ref:LocalRef,callback:any,onError?:any){let active=true;const emit=()=>{remoteRead(ref).then(result=>{if(active)(typeof callback==='function'?callback:callback.next)(result);}).catch(error=>{if(active)onError?.(error);});};emit();const timer=setInterval(emit,15000);window.addEventListener('farmmech-data-changed',emit);return()=>{active=false;clearInterval(timer);window.removeEventListener('farmmech-data-changed',emit);};}
const denied=async()=>{throw new Error('Direct writes are disabled. Use an authorised workflow.');};
const remoteApi:any={collection:(parent:any,...parts:string[])=>reference('collection',parent,...parts),doc:(parent:any,...parts:string[])=>reference('doc',parent,...parts),query:(ref:LocalRef,...constraints:any[])=>({...ref,constraints}),where:(...args:any[])=>({type:'where',args}),orderBy:(...args:any[])=>({type:'orderBy',args}),limit:(...args:any[])=>({type:'limit',args}),getDoc:remoteRead,getDocs:remoteRead,onSnapshot:remoteSubscribe,setDoc:denied,addDoc:denied,deleteDoc:denied,updateDoc:async(ref:LocalRef,value:any)=>{await backendRequest('notificationRead',{path:ref.path,value});window.dispatchEvent(new Event('farmmech-data-changed'));},arrayUnion:(...value:any[])=>({__local:'arrayUnion',value}),increment:(value:number)=>({__local:'increment',value}),writeBatch:()=>({set:denied,update:denied,delete:denied,commit:denied})};
export const collection = choose(remoteApi.collection, (parent: any, ...parts: string[]) => reference('collection', parent, ...parts));
export const doc = choose(remoteApi.doc, (parent: any, ...parts: string[]) => reference('doc', parent, ...(parts.length ? parts : [crypto.randomUUID()])));
export const query = choose(remoteApi.query, (ref: LocalRef, ...constraints: any[]) => ({ ...ref, constraints }));
export const where = choose(remoteApi.where, (...args: any[]) => ({ type: 'where', args }));
export const orderBy = choose(remoteApi.orderBy, (...args: any[]) => ({ type: 'orderBy', args }));
export const limit = choose(remoteApi.limit, (...args: any[]) => ({ type: 'limit', args }));
export const getDoc = choose(remoteApi.getDoc, async (ref: LocalRef) => result(ref));
export const getDocs = choose(remoteApi.getDocs, async (ref: LocalRef) => result(ref));
export const onSnapshot = choose(remoteApi.onSnapshot, (ref: LocalRef, callback: any, onError?: any) => {
  let active = true;
  const emit = () => { if (active) { try { (typeof callback === 'function' ? callback : callback.next)(result(ref)); } catch (error) { if (onError) onError(error); else console.error(error); } } };
  listeners.add(emit); queueMicrotask(emit);
  return () => { active = false; listeners.delete(emit); };
});
export const setDoc = choose(remoteApi.setDoc, async (ref: LocalRef, value: any, options?: any) => persist({ ...store(), [ref.path]: apply(options?.merge ? store()[ref.path] : {}, value) }));
export const updateDoc = choose(remoteApi.updateDoc, async (ref: LocalRef, value: any) => {
  if (!store()[ref.path]) throw new Error('Record no longer exists.');
  persist({ ...store(), [ref.path]: apply(store()[ref.path], value) });
});
export const deleteDoc = choose(remoteApi.deleteDoc, async (ref: LocalRef) => { const next = { ...store() }; delete next[ref.path]; persist(next); });
export const addDoc = choose(remoteApi.addDoc, async (ref: LocalRef, value: any) => {
  const target = reference('doc', ref, crypto.randomUUID());
  persist({ ...store(), [target.path]: apply({}, value) }); return target;
});
export const arrayUnion = choose(remoteApi.arrayUnion, (...value: any[]) => ({ __local: 'arrayUnion', value }));
export const increment = choose(remoteApi.increment, (value: number) => ({ __local: 'increment', value }));
export const writeBatch = choose(remoteApi.writeBatch, () => {
  const operations: any[] = [];
  const batch = {
    set: (ref: LocalRef, value: any, options?: any) => { operations.push({ type: 'set', ref, value, options }); return batch; },
    update: (ref: LocalRef, value: any) => { operations.push({ type: 'update', ref, value }); return batch; },
    delete: (ref: LocalRef) => { operations.push({ type: 'delete', ref }); return batch; },
    commit: async () => {
      const next = { ...store() };
      for (const operation of operations) {
        const { type, ref, value, options } = operation;
        if (type === 'delete') delete next[ref.path];
        else { if (type === 'update' && !next[ref.path]) throw new Error('Record no longer exists.'); next[ref.path] = apply(type === 'update' || options?.merge ? next[ref.path] : {}, value); }
      }
      persist(next);
    },
  };
  return batch;
});
