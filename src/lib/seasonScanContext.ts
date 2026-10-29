export const SEASON_SCAN_KEY = 'farmmech-season-scan-context';
export interface SeasonScanContext { scheduleId:string; phase:'pre'|'post'; purpose?:'production' }
type Storage = Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
export function readSeasonScanContext(storage:Storage,userId:string):SeasonScanContext {
 try { const context=JSON.parse(storage.getItem(SEASON_SCAN_KEY)||'null');if(context?.userId===userId&&typeof context.scheduleId==='string'&&['pre','post'].includes(context.phase))return {scheduleId:context.scheduleId,phase:context.phase,...(context.purpose==='production'?{purpose:'production' as const}:{})}; } catch {}
 return {scheduleId:'',phase:'pre'};
}
export function rememberSeasonScanContext(storage:Storage,userId:string,context:SeasonScanContext) { storage.setItem(SEASON_SCAN_KEY,JSON.stringify({...context,userId})); }
export function clearSeasonScanContext(storage:Storage){storage.removeItem(SEASON_SCAN_KEY);}
