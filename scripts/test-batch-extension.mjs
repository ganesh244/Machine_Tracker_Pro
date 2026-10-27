import assert from 'node:assert/strict';
import { build } from 'esbuild';
const saved=new Map();globalThis.localStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};globalThis.window=new EventTarget();window.location={origin:'http://localhost:3001'};
const bundled=await build({stdin:{contents:"export * from './src/lib/fieldOperations'; export * from './src/lib/maintenance'; export * from './src/lib/seasonOperations'; export * from './src/lib/teamManagement'; export * as data from './src/lib/data'; export {demoUsers} from './src/lib/demo';",loader:'ts',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'browser',define:{'import.meta.env':JSON.stringify({DEV:true,VITE_LOCAL_DEMO:'true'})}});
const {data,demoUsers,...api}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const [admin,state,district,area,cf,jcf,boss]=demoUsers,db={};
const save=async user=>data.setDoc(data.doc(db,'users',user.uid),user);


const batch=await api.createQRBatch(admin,'TS-SRD-DRF-2026',150);
const before=(await data.getDocs(data.collection(db,'qr_labels'))).docs.filter(row=>row.data().batchId===batch.id);
await data.updateDoc(before[0].ref,{status:'attached',holderId:cf.uid,machineId:'preserved-machine'});
for(const actor of [state,district,area,cf,jcf,boss])await assert.rejects(api.addBatchStickers(actor,batch.id,1));
for(const quantity of [0,-1,201,1.5])await assert.rejects(api.addBatchStickers(admin,batch.id,quantity));
await assert.rejects(api.addBatchStickers(admin,'missing',10));
const ids=await api.addBatchStickers(admin,batch.id,50);assert.equal(ids.length,50);assert.ok(ids[0].endsWith('-151'));assert.ok(ids[49].endsWith('-200'));
const after=(await data.getDocs(data.collection(db,'qr_labels'))).docs.filter(row=>row.data().batchId===batch.id);assert.equal(after.length,200);assert.equal(new Set(after.map(row=>row.id)).size,200);
assert.equal((await data.getDoc(before[0].ref)).data().status,'attached');assert.equal((await data.getDoc(before[0].ref)).data().holderId,cf.uid);
assert.equal((await data.getDoc(data.doc(db,'qr_batches',batch.id))).data().quantity,200);
assert.ok(after.filter(row=>ids.includes(row.id)).every(row=>row.data().holderId===admin.uid&&row.data().status==='available'));
const more=await api.addBatchStickers(admin,batch.id,1);assert.ok(more[0].endsWith('-201'));
console.log('Batch extension passed: 150 + 50 = 200, sequential unique IDs, original ownership/attached records preserved, Admin-only permission, validation, repeated additions.');
