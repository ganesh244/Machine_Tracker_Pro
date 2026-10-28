import { isPresetLocation } from '../../lib/locations';
import React, { useState } from 'react';
import { Field } from './FieldForms';
import { StateDistrictFields } from './StateDistrictFields';
import { qrBatchName, qrBatchPrefix } from '../../lib/qrBatchIdentity';
import type { QRBatchDetails } from '../../lib/fieldOperations';
export function GenerateBatchForm({busy,error,onGenerate}:{busy:boolean;error:string;onGenerate:(name:string,quantity:number,details:QRBatchDetails)=>void}) {
 const [details,setDetails]=useState<QRBatchDetails>({});
 const read=(form:HTMLFormElement):QRBatchDetails=>{const data=new FormData(form);return {state:String(data.get('state')||''),district:isPresetLocation(String(data.get('state')||''),String(data.get('district')||''))?String(data.get('district')):'',...(data.get('year')?{year:Number(data.get('year'))}:{}),season:String(data.get('season')||'')};};
 return <form className="fo-form" onChange={event=>setDetails(read(event.currentTarget))} onSubmit={event=>{event.preventDefault();const current=read(event.currentTarget);onGenerate(qrBatchName(current),Number(new FormData(event.currentTarget).get('quantity')),current);}}>
 <div className="fo-info">Choose the rollout details below. The batch name and QR ID format update automatically. No machine details are needed yet.</div>
 <fieldset className="fo-form-section"><legend>Batch details (optional)</legend><p>Leave blank for a general batch.</p><div className="fo-form-grid"><StateDistrictFields stateRequired={false} districtRequired={false}/><Field label="Year (optional)"><select name="year" defaultValue=""><option value="">No year selected</option>{Array.from({length:101},(_,index)=>2000+index).map(year=><option key={year} value={year}>{year}</option>)}</select></Field><Field label="Season (optional)"><select name="season" defaultValue=""><option value="">No season selected</option>{['Kharif','Rabi','Zaid / Summer','Other'].map(season=><option key={season}>{season}</option>)}</select></Field></div></fieldset>
 <Field label="Batch name (automatic)"><input aria-label="Automatic batch name" value={qrBatchName(details)} readOnly/></Field>
 <div className="fo-info" aria-live="polite"><strong>QR ID preview</strong><p style={{overflowWrap:'anywhere'}}>{qrBatchPrefix(details,'BATCHID')}-001</p><small>BATCHID becomes a unique batch code. The final number is the sticker number. Year defaults to the current year when omitted. KH = Kharif, RB = Rabi, SU = Summer, OT = Other.</small></div>
 <Field label="Number of QR labels *" hint="Generate up to 200 labels per batch. Each label has a unique permanent ID."><input name="quantity" required type="number" min="1" max="200" defaultValue="100"/></Field>
 {error&&<p className="fo-error" role="alert">{error}</p>}<button className="fo-button primary" disabled={busy}>{busy?'Generating…':'Generate blank QR labels'}</button>
 </form>;
}
