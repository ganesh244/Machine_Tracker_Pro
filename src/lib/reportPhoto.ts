export const REPORT_PHOTO_MAX_EDGE = 1024;
export const REPORT_PHOTO_TARGET_BYTES = 180 * 1024;
export function photoBytes(dataUrl:string){const encoded=dataUrl.split(',')[1]||'';return Math.max(0,Math.floor(encoded.length*3/4)-(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0));}
/** Compress in the browser before storing or transmitting a report photo. */
export async function prepareReportPhoto(file:File):Promise<string>{
 if(!file.type.startsWith('image/')||file.size>10*1024*1024)throw new Error('Choose an image smaller than 10 MB.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('This image format could not be read. Try JPG or PNG.'));image.src=url;});
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('This photo could not be opened.');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw new Error('Photo preparation is unavailable in this browser.');
  let edge=Math.min(REPORT_PHOTO_MAX_EDGE,Math.max(image.naturalWidth,image.naturalHeight));
  for(let attempt=0;attempt<6;attempt++){
   const scale=Math.min(1,edge/Math.max(image.naturalWidth,image.naturalHeight));
   canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.7,.62,.54]){const result=canvas.toDataURL('image/jpeg',quality);if(!result.startsWith('data:image/jpeg'))throw new Error('This browser could not optimize the photo.');if(photoBytes(result)<=REPORT_PHOTO_TARGET_BYTES)return result;}
   edge=Math.max(480,Math.floor(edge*.8));
  }
  throw new Error('This photo is too detailed to optimize. Crop it or choose a different photo.');
 }finally{URL.revokeObjectURL(url);}
}
