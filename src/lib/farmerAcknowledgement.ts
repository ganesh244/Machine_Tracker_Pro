import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import type { FieldMachine, LeadFarmer } from './fieldOperations';
import type { UserProfile } from '../types';

const loadImage=(src:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Farmer photo could not be loaded. Please check the saved photo and try again.'));image.src=src;});
/** A4 portrait, rendered at twice print size to preserve multilingual farmer names. */
export async function farmerAcknowledgement(machine:FieldMachine,farmer:LeadFarmer,users:UserProfile[],origin=window.location.origin){
 if(machine.id!==farmer.machineId)throw new Error('Farmer and machine records do not match.');
 const qrId=machine.qrLabelId||machine.id;
 const [qr,photo]=await Promise.all([loadImage(await QRCode.toDataURL(`${origin}/scan/${encodeURIComponent(qrId)}`,{width:320,margin:4,errorCorrectionLevel:'M'})),farmer.photos[0]?loadImage(farmer.photos[0]):Promise.resolve(null)]);
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
 const c=canvas.getContext('2d');if(!c)throw new Error('PDF rendering is unavailable in this browser.');
 c.fillStyle='#fff';c.fillRect(0,0,1190,1684);
 const text=(value:string,x:number,y:number,size=20,bold=false,color='#233c32')=>{c.font=`${bold?'600':'400'} ${size}px Arial, sans-serif`;c.fillStyle=color;c.fillText(value,x,y);};
 const wrap=(value:string,x:number,y:number,width:number,size=20)=>{c.font=`400 ${size}px Arial, sans-serif`;let line='',row=0;for(const char of String(value)){if(c.measureText(line+char).width>width&&line){text(line,x,y+row*27,size);line='';row++;}line+=char;}if(line)text(line,x,y+row*27,size);return row+1;};
 const rule=(y:number)=>{c.strokeStyle='#d6dfd9';c.lineWidth=1;c.beginPath();c.moveTo(70,y);c.lineTo(1120,y);c.stroke();};
 text('FarmMech',70,98,34,true);text('FIELD OPERATIONS',70,126,15,true,'#63766a');
 text('MACHINE HANDOVER ACKNOWLEDGEMENT',70,183,28,true);
 text('Lead farmer registration and custody record',70,218,21);
 text(`Receipt: ACK-${farmer.id}`,70,260,15);text(`Registered: ${new Date(farmer.createdAt).toLocaleDateString('en-IN')}`,70,286,18);
 rule(312);
 c.drawImage(qr,900,60,220,220);
 // Photo is fitted without stretching or cropping the evidence.
 c.strokeStyle='#d6dfd9';c.strokeRect(900,345,220,240);
 if(photo){const scale=Math.min(216/photo.width,236/photo.height),w=photo.width*scale,h=photo.height*scale;c.drawImage(photo,902+(216-w)/2,347+(236-h)/2,w,h);}else text('Photo not recorded',916,465,18);
 text('Saved farmer / handover photo',900,612,14);
 let y=355;
 const section=(title:string)=>{text(title,70,y,19,true,'#426750');y+=37;};
 const field=(label:string,value:unknown,width=750)=>{text(label.toUpperCase(),70,y,14,true,'#63766a');const n=wrap(String(value??'Not recorded'),70,y+28,width,21);y+=28+n*27+17;};
 section('01  FARMER DETAILS');
 field('Farmer name',farmer.name);field('Mobile number',farmer.phone);
 field('Village / Mandal',`${farmer.village} / ${farmer.mandal}`);
 field('District / State',`${farmer.district} / ${farmer.state}`,1040);
 field('Land holding',`${farmer.landAcres} acres`);
 field('Recorded GPS',`${farmer.lat.toFixed(6)}, ${farmer.lng.toFixed(6)}`);
 y+=8;rule(y);y+=38;section('02  MACHINE & HANDOVER DETAILS');
 const officer=users.find(user=>user.uid===(machine.cfId||machine.currentHolderId));
 const recorder=users.find(user=>user.uid===farmer.createdBy);
 // Compact two-column rows leave generous space for handwritten signatures.
 const pair=(left:string,lv:string,right:string,rv:string)=>{text(left.toUpperCase(),70,y,14,true,'#63766a');text(right.toUpperCase(),610,y,14,true,'#63766a');const a=wrap(lv,70,y+27,490,19),b=wrap(rv,610,y+27,510,19);y+=27+Math.max(a,b)*27+19;};
 pair('Machine / QR identity',qrId,'Machine type',machine.machineType||machine.type||'Not recorded');
 pair('Brand / Model',[machine.brand,machine.model].filter(Boolean).join(' / ')||'Not recorded','Serial number',machine.serialNumber||'Not recorded');
 pair('Responsible CF',officer?.displayName||'Not recorded','Registered by',recorder?.displayName||'Not recorded');
 y+=5;rule(y);y+=35;
 y+=wrap('I acknowledge receipt / custody of the machine identified above. The farmer and machine details have been reviewed with me. This acknowledgement records handover; it is not a sale or transfer of ownership.',70,y,1040,19)*27;
 const signatureY=Math.max(y+90,1455);
 if(signatureY>1550)throw new Error('The record is too long for a single A4 acknowledgement. Shorten unusually long text fields before downloading.');
 c.strokeStyle='#65766a';for(const x of [70,610]){c.beginPath();c.moveTo(x,signatureY);c.lineTo(x+450,signatureY);c.stroke();}
 text('Farmer signature / thumb impression',70,signatureY+30,18);text('CF / authorised staff signature',610,signatureY+30,18);
 text('Date: ____________________',70,signatureY+73,18);text('Place: ____________________',610,signatureY+73,18);
 rule(1605);text('Print on A4 portrait at actual size. Sign after verifying the details.',70,1638,15);text('Page 1 of 1',1020,1638,15);
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297);
 return {pdf,filename:`Farmer-acknowledgement-${qrId.replace(/[^a-z0-9-]/gi,'_')}.pdf`};
}
export async function downloadFarmerAcknowledgement(machine:FieldMachine,farmer:LeadFarmer,users:UserProfile[]){const {pdf,filename}=await farmerAcknowledgement(machine,farmer,users);pdf.save(filename);}
