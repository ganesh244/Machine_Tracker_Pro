import { isLocalDemo, readLocalFile } from '../../lib/demo';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, where } from '../../lib/data';
import { db } from '../../firebase';
import { Planter, UserProfile, HierarchicalLocation } from '../../types';
import { Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../ui/Toast';

export const PublicScanFlow = ({ machineId }: { machineId: string }) => {
  const [planter, setPlanter] = useState<Planter | null>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { success: toastSuccess, error: toastError } = useToast();

  // Form states
  const [machineType, setMachineType] = useState('');
  const [cfJf, setCfJf] = useState('');
  const [initialOperator, setInitialOperator] = useState('');
  
  const [farmerName, setFarmerName] = useState('');
  const [cropType, setCropType] = useState('');
  const [acresCovered, setAcresCovered] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [district, setDistrict] = useState('');
  const [mandal, setMandal] = useState('');
  const [village, setVillage] = useState('');
  const [gps, setGps] = useState<{lat: number, lng: number} | null>(null);
  
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, 'planters', machineId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPlanter(docSnap.data() as Planter);
        }

        const usersSnap = await getDocs(collection(db, 'publicProfiles'));
        const usersList = usersSnap.docs.map(d => d.data() as UserProfile);
        setUsers(usersList);
      } catch (e: any) {
        toastError('Error', e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [machineId, toastError]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | undefined> => {
    if (isLocalDemo) return readLocalFile(file);
    try {
      const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (cloudName && uploadPreset) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `farmmech/usage/${machineId}`);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const data = await res.json();
          return data.secure_url;
        }
      }
    } catch (e) {
      console.error('Photo upload failed:', e);
    }
    return undefined;
  };

  const getLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGettingLocation(false);
        },
        (err) => {
          toastError('Location Error', 'Failed to get location. Please enable location services.');
          setGettingLocation(false);
        }
      );
    } else {
      toastError('Location Error', 'Geolocation is not supported by your browser.');
      setGettingLocation(false);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gps) { toastError('Validation Error', 'Location is required'); return; }
    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (photo) {
        imageUrl = await uploadPhoto(photo) || '';
      }

      const loc: HierarchicalLocation = { district, mandal, village, gps };
      
      const newPlanter: Partial<Planter> = {
        id: machineId,
        machineType,
        status: 'registered_unused',
        cfJf,
        initialOperator,
        currentCustodian: initialOperator,
        registrationDate: new Date().toISOString(),
        location: loc,
        lastReading: 0,
        lastUpdated: new Date().toISOString(),
        currentHolderId: cfJf,
        currentHolderRole: 'cf'
      };
      
      await setDoc(doc(db, 'planters', machineId), newPlanter);
      
      await addDoc(collection(db, 'planters', machineId, 'usageLogs'), {
        type: 'onboarding',
        timestamp: new Date().toISOString(),
        farmerName: initialOperator,
        initialOperator, // MachineDetail relies on this
        cfJf,
        handoverTo: initialOperator,
        location: loc,
        imageUrl: imageUrl || null
      });

      toastSuccess('Success', 'Machine onboarded successfully!');
      setSuccess(true);
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gps) { toastError('Validation Error', 'Location is required'); return; }
    setIsSubmitting(true);
    try {
      let imageUrl = '';
      if (photo) {
        imageUrl = await uploadPhoto(photo) || '';
      }

      const loc: HierarchicalLocation = { district, mandal, village, gps };
      const now = new Date().toISOString();

      // Close previous open usage log
      const logsQuery = query(collection(db, 'planters', machineId, 'usageLogs'), orderBy('timestamp', 'desc'), limit(1));
      const logsSnap = await getDocs(logsQuery);
      let handoverFrom = '';
      if (!logsSnap.empty) {
        const lastLog = logsSnap.docs[0];
        const lastLogData = lastLog.data();
        handoverFrom = lastLogData.handoverTo || lastLogData.farmerName || '';
        if (!lastLogData.usageEndDate) {
          await updateDoc(doc(db, 'planters', machineId, 'usageLogs', lastLog.id), {
            usageEndDate: now
          });
        }
      }

      // Create new handover log
      const logEntry = {
        type: 'handover',
        timestamp: now,
        farmerName,
        cfJf,
        cropType,
        acresCovered: parseFloat(acresCovered) || 0,
        fuelConsumed: parseFloat(fuelConsumed) || 0,
        weatherNotes,
        usageStartDate: now,
        handoverFrom,
        handoverTo: farmerName,
        location: loc,
        imageUrl: imageUrl || null
      };

      await addDoc(collection(db, 'planters', machineId, 'usageLogs'), logEntry);
      
      // Update machine status
      await updateDoc(doc(db, 'planters', machineId), {
        currentCustodian: farmerName,
        cfJf: cfJf, // Also update cfJf on handover
        location: loc,
        status: 'in_use',
        lastUpdated: now
      });

      toastSuccess('Success', 'Machine handover completed!');
      setSuccess(true);
    } catch (err: any) {
      toastError('Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-lg border border-slate-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-serif text-slate-800 mb-2">Success!</h2>
          <p className="text-slate-500 mb-8">Machine data has been updated.</p>
          <button onClick={() => window.location.reload()} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">Done</button>
        </div>
      </div>
    );
  }

  const isOnboarding = planter === null;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center items-start">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-2xl font-serif">{isOnboarding ? 'Machine Onboarding' : 'Machine Handover'}</h1>
          <p className="text-sm text-slate-400 mt-1">{machineId} {planter && `• ${planter.machineType || planter.type}`}</p>
        </div>

        <div className="p-6">
          {!isOnboarding && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Current Status</p>
              <div className="flex flex-col gap-1">
                <p className="text-sm"><span className="font-semibold">Custodian:</span> {planter.currentCustodian || 'Unassigned'}</p>
                <p className="text-sm"><span className="font-semibold">Status:</span> {planter.status?.replace('_', ' ')}</p>
              </div>
            </div>
          )}

          <form onSubmit={isOnboarding ? handleSubmitOnboarding : handleSubmitHandover} className="space-y-5">
            {isOnboarding ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Machine Type</label>
                  <select required value={machineType} onChange={e => setMachineType(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select Type</option>
                    <option value="Tractor">Tractor</option>
                    <option value="Harvester">Harvester</option>
                    <option value="Planter">Planter</option>
                    <option value="Seeder">Seeder</option>
                    <option value="Sprayer">Sprayer</option>
                    <option value="Cultivator">Cultivator</option>
                    <option value="Rotavator">Rotavator</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Initial Operator</label>
                  <input required type="text" value={initialOperator} onChange={e => setInitialOperator(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Farmer Name</label>
                  <input required type="text" value={farmerName} onChange={e => setFarmerName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Crop Type</label>
                    <select required value={cropType} onChange={e => setCropType(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500">
                      <option value="">Select</option>
                      <option value="Cotton">Cotton</option>
                      <option value="Maize">Maize</option>
                      <option value="Soybean">Soybean</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Acres to cover</label>
                    <input required type="number" step="0.1" value={acresCovered} onChange={e => setAcresCovered(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Weather Notes</label>
                  <input type="text" value={weatherNotes} onChange={e => setWeatherNotes(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Sunny, Light rain" />
                </div>
              </>
            )}

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Photo (Optional)</label>
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm" />
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">{isOnboarding ? 'Assign CF/JF' : 'Handover To (CF/JF)'}</label>
              <select required value={cfJf} onChange={e => setCfJf(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select User</option>
                {users.map(u => (
                  <option key={u.uid} value={u.uid}>{u.displayName} ({u.role})</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Location Data</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input required type="text" placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} className="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-sm" />
                  <input required type="text" placeholder="Mandal" value={mandal} onChange={e => setMandal(e.target.value)} className="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-sm" />
                </div>
                <input required type="text" placeholder="Village" value={village} onChange={e => setVillage(e.target.value)} className="w-full p-2.5 bg-white rounded-lg border border-slate-200 text-sm" />
                
                <div className="flex items-center gap-3">
                  <button type="button" onClick={getLocation} disabled={gettingLocation} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                    {gettingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                    {gps ? 'Update GPS' : 'Get GPS'}
                  </button>
                  {gps && <div className="text-xs text-emerald-600 font-bold flex-1 text-center">✓ Captured</div>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
              {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
