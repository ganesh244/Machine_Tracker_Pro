import assert from 'node:assert/strict';
import { build } from 'esbuild';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';
const bundled=await build({entryPoints:['src/lib/qrPrintLayout.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {paginateStickers,STICKERS_PER_PAGE,QR_A4_CSS}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
assert.equal(STICKERS_PER_PAGE,16);
for(const size of [0,1,15,16,17,32,100,200]) {
 const ids=Array.from({length:size},(_,n)=>`QR-${n+1}`), pages=paginateStickers(ids);
 assert.equal(pages.length,Math.ceil(size/16));
 assert.deepEqual(pages.flat(),ids);
 assert.ok(pages.every(page=>page.length<=16));
 assert.ok(pages.slice(0,-1).every(page=>page.length===16));
}
const pages=paginateStickers(Array.from({length:100},(_,n)=>n+1));
assert.equal(pages.length,7);assert.deepEqual(pages[6],[97,98,99,100]);
assert.ok(QR_A4_CSS.includes('size: A4 portrait'));
console.log('A4 QR print passed: 16 per page; exact, partial and empty selections; 100 labels produce 7 pages, last page 97–100; no omissions or duplicates.');

const decoderBundle=await build({entryPoints:['src/lib/qrScan.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {decodeQRImage}=await import(`data:text/javascript;base64,${Buffer.from(decoderBundle.outputFiles[0].text).toString('base64')}`);
const target='http://localhost:3001/scan/QR-2026-D88FEF2D-100';
const png=PNG.sync.read(await QRCode.toBuffer(target,{width:114,margin:4,errorCorrectionLevel:'M'}));
assert.equal(decodeQRImage(new Uint8ClampedArray(png.data),png.width,png.height),target);
console.log('Print-sized QR pixel decoding passed with quiet zone and full machine scan URL.');
