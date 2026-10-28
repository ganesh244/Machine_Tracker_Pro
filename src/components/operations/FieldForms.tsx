import { prepareReportPhoto, photoBytes } from '../../lib/reportPhoto';
import { StateDistrictFields } from './StateDistrictFields';
import React, { useState } from 'react';
import { Camera, MapPin, Plus, Trash2, Loader2 } from 'lucide-react';
import { isLocalDemo } from '../../lib/demo';
import { MACHINE_TYPES, branchIds, onboardFieldMachine, onboardLeadFarmer, recordFarmerUsage, type FieldMachine, type LeadFarmer, type FieldLocation } from '../../lib/fieldOperations';
import type { UserProfile } from '../../types';

const samplePhoto = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e2f0de"/><path d="M0 300L800 180V500H0" fill="#a7c88d"/><path d="M0 400L800 280M0 470L800 350" stroke="#6d985a" stroke-width="28"/><rect x="310" y="210" width="170" height="100" rx="12" fill="#18795a"/><circle cx="330" cy="320" r="45" fill="#253e35"/><circle cx="470" cy="320" r="45" fill="#253e35"/><text x="400" y="80" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#335440">DEMO FIELD PHOTO</text></svg>');
export const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => <label className="fo-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
export function PhotoProof({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  React.useEffect(() => {
    if (!open) return;
    const handle = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); setOpen(false); } };
    window.addEventListener('keydown', handle, true);
    return () => window.removeEventListener('keydown', handle, true);
  }, [open]);
  return <div className="fo-proof"><button type="button" aria-label={`View ${alt}`} onClick={() => setOpen(true)}><img loading="lazy" decoding="async" src={src} alt={alt} /></button>{open && <div className="fo-photo-lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}><button type="button" aria-label="Close photo" onClick={() => setOpen(false)}>×</button><img loading="lazy" decoding="async" src={src} alt={alt} onClick={event => event.stopPropagation()} /><p>{alt}</p></div>}</div>;
}
export function PhotoPicker({ photos, onChange, label = 'Photos', required = true }: { photos: string[]; onChange: (photos: string[]) => void; label?: string; required?: boolean }) {
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const upload = async (files: FileList | null) => {
    if (!files) return; setBusy(true); setError('');
    try {
      if (files.length + photos.length > 3) throw new Error('Add up to three photos per record.');
      const additions: string[] = [];
      for (const file of Array.from(files)) {
        additions.push(await prepareReportPhoto(file));
      }
      onChange([...photos, ...additions]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not read photo.'); }
    finally { setBusy(false); }
  };
  return <div className="fo-photo-field"><p className="fo-label">{label} {required && <span className="fo-required">*</span>}</p>
    <div className="fo-photo-grid">{photos.map((photo, index) => <div key={index} className="fo-photo-thumb"><img loading="lazy" decoding="async" src={photo} alt={`${label} ${index + 1}`} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => onChange(photos.filter((_, position) => position !== index))}><Trash2 size={14} /></button></div>)}
      {photos.length < 3 && <label className="fo-upload"><Camera size={23} /><strong>{busy ? 'Preparing…' : 'Add a photo'}</strong><small>Take a photo or choose a file</small><input aria-label={label} type="file" accept="image/*" multiple disabled={busy} onChange={event => { void upload(event.target.files); event.target.value = ''; }} /></label>}
    </div>
    <small className="fo-photo-size-note">{busy?'Optimizing photos before upload…':photos.length?`${photos.length} photo${photos.length===1?'':'s'} · ${Math.round(photos.reduce((sum,photo)=>sum+(photo.startsWith('data:image/')?photoBytes(photo):0),0)/1024)} KB total`:'Photos are automatically resized and compressed before upload.'}</small>
    {isLocalDemo && photos.length < 3 && <button className="fo-text-button" type="button" onClick={() => onChange([...photos, samplePhoto])}><Plus size={13} /> Use a demo photo</button>}
    {error && <p className="fo-error" role="alert">{error}</p>}
  </div>;
}

export function LocationFields({ initial }: { initial?: Partial<FieldLocation> }) {
  const [lat, setLat] = useState(initial?.lat === undefined ? '' : String(initial.lat));
  const [lng, setLng] = useState(initial?.lng === undefined ? '' : String(initial.lng));
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <fieldset className="fo-form-section"><legend>Village & location</legend>
    <div className="fo-form-grid"><StateDistrictFields initialState={initial?.state||'Telangana'} initialDistrict={initial?.district||''}/><Field label="Mandal *"><input name="mandal" required defaultValue={initial?.mandal || ''} /></Field><Field label="Village *"><input name="village" required defaultValue={initial?.village || ''} /></Field></div>
    <div className="fo-gps-heading"><div><strong>GPS coordinates</strong><small>Capture the location in the field, or enter it manually.</small></div><button type="button" className="fo-button secondary small" disabled={busy} onClick={() => {
      setBusy(true); setError('');
      if (!navigator.geolocation) { setError('GPS is unavailable. Enter the coordinates manually.'); setBusy(false); return; }
      navigator.geolocation.getCurrentPosition(position => { setLat(String(Number(position.coords.latitude.toFixed(6)))); setLng(String(Number(position.coords.longitude.toFixed(6)))); setBusy(false); }, () => { setError('Could not capture GPS. Allow location access or enter coordinates below.'); setBusy(false); }, { enableHighAccuracy: true, timeout: 15000 });
    }}>{busy ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />} {busy ? 'Locating…' : 'Capture GPS'}</button></div>
    <div className="fo-form-grid"><Field label="Latitude *"><input required name="lat" type="number" step="any" min="-90" max="90" placeholder="18.7930" value={lat} onChange={event => setLat(event.target.value)} /></Field><Field label="Longitude *"><input required name="lng" type="number" step="any" min="-180" max="180" placeholder="78.2890" value={lng} onChange={event => setLng(event.target.value)} /></Field></div>
    {error && <p role="alert" className="fo-error">{error}</p>}
  </fieldset>;
}
const value = (form: FormData, key: string) => String(form.get(key) || '').trim();
function location(form: FormData): FieldLocation { return { state: value(form, 'state'), district: value(form, 'district'), mandal: value(form, 'mandal'), village: value(form, 'village'), lat: Number(value(form, 'lat')), lng: Number(value(form, 'lng')) }; }
function useSubmit(onSuccess: () => void) {
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  return { saving, error, run: async (operation: () => Promise<unknown>) => { setSaving(true); setError(''); try { await operation(); onSuccess(); } catch (err) { setError(err instanceof Error ? err.message : 'Could not save. Please try again.'); } finally { setSaving(false); } } };
}
function Submit({ saving, error, children }: { saving: boolean; error: string; children: React.ReactNode }) { return <div className="fo-form-footer">{error && <p role="alert" className="fo-error">{error}</p>}<p>Fields marked * are required.</p><button className="fo-button primary" disabled={saving} type="submit">{saving ? <><Loader2 size={17} className="animate-spin" /> Saving…</> : children}</button></div>; }

export function MachineOnboardingForm({ actor, labelId, users, onSuccess }: { actor: UserProfile; labelId: string; users: UserProfile[]; onSuccess: () => void }) {
  const [photos, setPhotos] = useState<string[]>([]), submit = useSubmit(onSuccess);
  const [machineType, setMachineType] = useState('');
  const scope = branchIds(users, actor.uid);
  return <form className="fo-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit.run(() => onboardFieldMachine(actor, labelId, { ...location(form), machineType: value(form, 'machineType') === 'Other' ? value(form, 'customMachineType') : value(form, 'machineType'), brand: value(form, 'brand'), model: value(form, 'model'), serialNumber: value(form, 'serialNumber'), cfId: value(form, 'cfId'), photos })); }}>
    <div className="fo-info">Attach this label to one machine. Its QR identity stays the same throughout its life.</div>
    <fieldset className="fo-form-section"><legend>Machine details</legend><div className="fo-form-grid"><Field label="Machine type *"><select required name="machineType" value={machineType} onChange={event => setMachineType(event.target.value)}><option value="" disabled>Select machine type</option>{MACHINE_TYPES.map(type => <option key={type}>{type}</option>)}</select></Field><Field label="Serial / asset number"><input name="serialNumber" placeholder="Manufacturer serial number" /></Field><Field label="Brand"><input name="brand" placeholder="Manufacturer" /></Field><Field label="Model"><input name="model" placeholder="Model name" /></Field></div>
      {machineType === 'Other' && <Field label="Specify machine type *"><input required name="customMachineType" placeholder="e.g. Power weeder" /></Field>}
      <Field label="Responsible community facilitator *" hint="The CF remains responsible even when a farmer is using the machine."><select required name="cfId" defaultValue=""><option value="" disabled>Choose a CF</option>{users.filter(user => user.role === 'cf' && scope.has(user.uid) && (actor.role !== 'district_manager' || user.parentId === actor.uid)).map(user => <option key={user.uid} value={user.uid}>{user.displayName}</option>)}</select></Field>
    </fieldset>
    <PhotoPicker photos={photos} onChange={setPhotos} label="Machine photos" required={false} />
    <LocationFields initial={{ state: actor.assignedState, district: actor.assignedDistrict, mandal: actor.assignedMandal }} />
    <Submit {...submit}>Onboard machine & assign CF</Submit>
  </form>;
}
export function LeadFarmerForm({ actor, machine, onSuccess }: { actor: UserProfile; machine: FieldMachine; onSuccess: () => void }) {
  const [photos, setPhotos] = useState<string[]>([]), submit = useSubmit(onSuccess);
  return <form className="fo-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit.run(() => onboardLeadFarmer(actor, machine.id, { ...location(form), name: value(form, 'name'), phone: value(form, 'phone'), landAcres: Number(value(form, 'landAcres')), photos })); }}>
    <div className="fo-info">Register the lead farmer who keeps this machine in the village. Record each farmer’s work separately in Usage.</div>
    <fieldset className="fo-form-section"><legend>Lead farmer details</legend><Field label="Full name *"><input name="name" required placeholder="Farmer’s full name" /></Field><div className="fo-form-grid"><Field label="Mobile number *"><input name="phone" required type="tel" inputMode="tel" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" /></Field><Field label="Land owned / cultivated (acres) *"><input name="landAcres" required type="number" min="0.01" step="0.01" placeholder="e.g. 4.5" /></Field></div></fieldset>
    <PhotoPicker photos={photos} onChange={setPhotos} label="Farmer / handover photos" />
    <LocationFields initial={{ state: machine.state, district: machine.district, mandal: machine.mandal, village: typeof machine.location === 'string' ? machine.location : machine.location?.village, lat: machine.lat, lng: machine.lng }} />
    <Submit {...submit}>Save lead farmer & hand over machine</Submit>
  </form>;
}
export function UsageForm({ actor, machine, farmer, onSuccess }: { actor: UserProfile; machine: FieldMachine; farmer: LeadFarmer; onSuccess: () => void }) {
  const [kind, setKind] = useState<'lead' | 'fellow'>('lead'), [photos, setPhotos] = useState<string[]>([]), submit = useSubmit(onSuccess);
  return <form className="fo-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); void submit.run(() => recordFarmerUsage(actor, machine.id, { ...location(form), farmerKind: kind, farmerName: kind === 'lead' ? farmer.name : value(form, 'farmerName'), phone: kind === 'lead' ? farmer.phone : value(form, 'phone'), landAcres: Number(value(form, 'landAcres')), crop: value(form, 'crop'), operationDate: value(form, 'operationDate'), notes: value(form, 'notes'), photos })); }}>
    <fieldset className="fo-form-section"><legend>Who used the machine?</legend><div className="fo-segment"><button type="button" className={kind === 'lead' ? 'active' : ''} onClick={() => setKind('lead')}>Lead farmer</button><button type="button" className={kind === 'fellow' ? 'active' : ''} onClick={() => setKind('fellow')}>Fellow farmer</button></div>
      {kind === 'lead' ? <div className="fo-farmer-summary"><strong>{farmer.name}</strong><span>{farmer.village} · {farmer.phone}</span></div> : <div className="fo-form-grid"><Field label="Fellow farmer name *"><input required name="farmerName" placeholder="Full name" /></Field><Field label="Mobile number"><input name="phone" type="tel" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit mobile number" /></Field></div>}
    </fieldset>
    <fieldset className="fo-form-section"><legend>Work completed</legend><div className="fo-form-grid"><Field label="Usage date *"><input required name="operationDate" type="date" defaultValue={new Date().toLocaleDateString('en-CA')} max={new Date().toLocaleDateString('en-CA')} /></Field><Field label="Area worked (acres) *"><input required name="landAcres" type="number" min="0.01" step="0.01" placeholder="e.g. 2.5" /></Field></div><Field label="Crop sown / field crop *"><input required name="crop" list="field-crops" placeholder="Select or enter a crop" /><datalist id="field-crops">{['Paddy', 'Maize', 'Cotton', 'Soybean', 'Groundnut', 'Pulses', 'Wheat'].map(crop => <option key={crop}>{crop}</option>)}</datalist></Field><Field label="Work notes"><textarea name="notes" rows={3} placeholder="Field condition, machine performance, or other observations" /></Field></fieldset>
    <PhotoPicker photos={photos} onChange={setPhotos} label="Field / work photos" />
    <p className="fo-form-note">Record the location of this field visit. Fellow farmer visits need their own GPS coordinates.</p>
    <React.Fragment key={kind}><LocationFields initial={kind === 'lead' ? farmer : { ...farmer, lat: undefined, lng: undefined }} /></React.Fragment>
    <Submit {...submit}>Save usage log</Submit>
  </form>;
}
