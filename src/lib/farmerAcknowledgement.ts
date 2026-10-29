import { receiptTranslator, type ReceiptLanguage } from './receiptTranslations.js';
export type { ReceiptLanguage } from './receiptTranslations.js';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import type { FieldMachine, LeadFarmer } from './fieldOperations.js';
import type { UserProfile } from '../types.js';

let fontsReady:Promise<unknown>|undefined;
function loadReceiptFonts(){return fontsReady ||=Promise.all(['Telugu','Devanagari'].map(async script=>{const font=new FontFace('Receipt'+script,`url(/fonts/NotoSans${script}.ttf)`,{weight:'100 900'});document.fonts.add(await font.load());})).catch(error=>{fontsReady=undefined;throw error;});}
const loadImage=(src:string,errorMessage='Farmer photo could not be loaded. Please check the saved photo and try again.')=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(errorMessage));image.src=src;});
/** A4 portrait, rendered at twice print size to preserve multilingual farmer names. */
export async function farmerAcknowledgement(machine:FieldMachine,farmer:LeadFarmer,users:UserProfile[],origin=window.location.origin,language:ReceiptLanguage='en'){
 await loadReceiptFonts();const t=receiptTranslator(language);
 if(machine.id!==farmer.machineId)throw new Error('Farmer and machine records do not match.');
 const qrId=machine.qrLabelId||machine.id;
 const [qr,photo,logo]=await Promise.all([loadImage(await QRCode.toDataURL(`${origin}/scan/${encodeURIComponent(qrId)}`,{width:320,margin:4,errorCorrectionLevel:'M'})),farmer.photos[0]?loadImage(farmer.photos[0]):Promise.resolve(null),loadImage('/branding/dr-reddys-foundation.png','The Dr. Reddy’s Foundation logo could not be loaded. Please retry the download.')]);
 const canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;
 const c=canvas.getContext('2d');if(!c)throw new Error('PDF rendering is unavailable in this browser.');
 c.fillStyle='#fff';c.fillRect(0,0,1190,1684);
 const text=(value:string,x:number,y:number,size=20,bold=false,color='#233c32')=>{c.font=`${bold?'600':'400'} ${size}px Arial, ReceiptTelugu, ReceiptDevanagari, sans-serif`;c.fillStyle=color;c.fillText(t(value),x,y);};
 const wrap=(value:string,x:number,y:number,width:number,size=20)=>{c.font=`400 ${size}px Arial, ReceiptTelugu, ReceiptDevanagari, sans-serif`;let line='',row=0;for(const {segment:char} of new Intl.Segmenter(language,{granularity:'grapheme'}).segment(t(String(value)))){if(c.measureText(line+char).width>width&&line){text(line,x,y+row*27,size);line='';row++;}line+=char;}if(line)text(line,x,y+row*27,size);return row+1;};
 const rule=(y:number)=>{c.strokeStyle='#d6dfd9';c.lineWidth=1;c.beginPath();c.moveTo(70,y);c.lineTo(1120,y);c.stroke();};
 // Preserve the supplied Foundation logo’s aspect ratio and transparency.
 c.drawImage(logo,70,28,500,500*logo.height/logo.width);
 text('MACHINE HANDOVER ACKNOWLEDGEMENT',70,183,28,true);
 text('Lead farmer registration and custody record',70,218,21);
 text(`${t('Receipt')}: ACK-${farmer.id}`,70,260,15);text(`${t('Registered')}: ${new Date(farmer.createdAt).toLocaleDateString('en-IN')}`,70,286,18);
 rule(312);
 c.drawImage(qr,900,60,220,220);
 // Photo is fitted without stretching or cropping the evidence.
 c.strokeStyle='#d6dfd9';c.strokeRect(680,345,440,420);
 if(photo){const scale=Math.min(436/photo.width,416/photo.height),w=photo.width*scale,h=photo.height*scale;c.drawImage(photo,682+(436-w)/2,347+(416-h)/2,w,h);}else text('Photo not recorded',700,545,18);
 text('Farmer / handover photo',680,797,17);
 let y=355;
 const section=(title:string)=>{text(title,70,y,19,true,'#426750');y+=37;};
 const field=(label:string,value:unknown,width=540)=>{text(t(label).toUpperCase(),70,y,14,true,'#63766a');const n=wrap(String(value??'Not recorded'),70,y+28,width,21);y+=28+n*27+17;};
 section('01  '+t('FARMER DETAILS'));
 field('Farmer name',farmer.name);field('Mobile number',farmer.phone);
 field('Village / Mandal',`${farmer.village} / ${farmer.mandal}`);
 field('District / State',`${farmer.district} / ${farmer.state}`);
 field('Land holding',`${farmer.landAcres} ${t('acres')}`);
 field('Recorded GPS',`${farmer.lat.toFixed(6)}, ${farmer.lng.toFixed(6)}`);
 y+=8;rule(y);y+=38;section('02  '+t('MACHINE & HANDOVER DETAILS'));
 const officer=users.find(user=>user.uid===(machine.cfId||machine.currentHolderId));
 const recorder=users.find(user=>user.uid===farmer.createdBy);
 // Compact two-column rows leave generous space for handwritten signatures.
 const pair=(left:string,lv:string,right:string,rv:string)=>{text(t(left).toUpperCase(),70,y,14,true,'#63766a');text(t(right).toUpperCase(),610,y,14,true,'#63766a');const a=wrap(lv,70,y+27,490,19),b=wrap(rv,610,y+27,510,19);y+=27+Math.max(a,b)*27+19;};
 pair('Machine / QR identity',qrId,'Machine type',machine.machineType||machine.type||'Not recorded');
 field('Brand / Model',[machine.brand,machine.model].filter(Boolean).join(' / ')||'Not recorded',1040);
 pair('Responsible CF',officer?.displayName||'Not recorded','Registered by',recorder?.displayName||'Not recorded');
 y+=5;rule(y);y+=35;
 y+=wrap('I acknowledge receipt / custody of the machine identified above. The farmer and machine details have been reviewed with me. This acknowledgement records handover; it is not a sale or transfer of ownership.',70,y,1040,19)*27;
 const signatureY=Math.max(y+90,1455);
 if(signatureY>1550)throw new Error('The record is too long for a single A4 acknowledgement. Shorten unusually long text fields before downloading.');
 c.strokeStyle='#65766a';for(const x of [70,610]){c.beginPath();c.moveTo(x,signatureY);c.lineTo(x+450,signatureY);c.stroke();}
 text('Farmer signature / thumb impression',70,signatureY+30,18);text('CF / authorised staff signature',610,signatureY+30,18);
 text(t('Date')+': ____________________',70,signatureY+73,18);text(t('Place')+': ____________________',610,signatureY+73,18);
 rule(1605);text('Print on A4 portrait at actual size. Sign after verifying the details.',70,1638,15);text('Page 1 of 1',1020,1638,15);
 const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
 return {pdf,filename:`Farmer-acknowledgement-${language}-${qrId.replace(/[^a-z0-9-]/gi,'_')}.pdf`};
}
export async function downloadFarmerAcknowledgement(machine:FieldMachine,farmer:LeadFarmer,users:UserProfile[],language:ReceiptLanguage='en'){const {pdf,filename}=await farmerAcknowledgement(machine,farmer,users,window.location.origin,language);pdf.save(filename);}
