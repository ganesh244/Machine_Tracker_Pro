import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Planter, UserProfile, HierarchicalLocation } from '../../types';
import { Loader2, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

export const PublicScanFlow = ({ machineId }: { machineId: string }) => {
  const [planter, setPlanter] = useState<Planter | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Form states
  const [cfJf, setCfJf] = useState('');
  const [initialOperator, setInitialOperator] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [cropType, setCropType] = useState('');
  const [acresCovered, setAcresCovered] = useState('');
  const [fuelConsumed, setFuelConsumed] = useState('');
  const [weatherNotes, setWeatherNotes] = useState('');
  const [usageStartDate, setUsageStartDate] = useState('');
  const [usageEndDate, setUsageEndDate] = useState('');
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
        } else {
          setError('Machine not found.');
        }

        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(d => d.data() as UserProfile);
        setUsers(usersList);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [machineId]);

  const getLocation = () => {
    setGettingLocation(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGettingLocation(false);
        },
        (err) => {
          setError('Failed to get location. Please enable location services.');
          setGettingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setGettingLocation(false);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gps) { setError('Location is required'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const loc: HierarchicalLocation = { district, mandal, village, gps };
      const updates = {
        status: 'idle' as const,
        operatingStatus: 'idle' as const,
        cfJf,
        initialOperator,
        currentCustodian: cfJf,
        registrationDate: new Date().toISOString(),
        location: loc
      };
      
      await updateDoc(doc(db, 'planters', machineId), updates);
      
      // Add initial usage log for onboarding
      await addDoc(collection(db, 'planters', machineId, 'usageLogs'), {
        type: 'onboarding',
        timestamp: new Date().toISOString(),
        cfJf,
        initialOperator,
        location: loc,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gps) { setError('Location is required'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      const loc: HierarchicalLocation = { district, mandal, village, gps };
      
      const logEntry = {
        type: 'handover',
        timestamp: new Date().toISOString(),
        farmerName,
        cfJf,
        cropType,
        acresCovered: parseFloat(acresCovered) || 0,
        fuelConsumed: parseFloat(fuelConsumed) || 0,
        weatherNotes,
        usageStartDate,
        usageEndDate,
        location: loc,
        handoverTo: cfJf
      };

      await addDoc(collection(db, 'planters', machineId, 'usageLogs'), logEntry);
      
      await updateDoc(doc(db, 'planters', machineId), {
        currentCustodian: cfJf,
        location: loc,
        status: 'in_use',
        operatingStatus: 'operating',
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-600" /></div>;
  if (error && !planter) return <div className="flex h-screen items-center justify-center bg-slate-50 p-6 text-center text-red-600">{error}</div>;
  if (!planter) return null;

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

  const isOnboarding = planter.status === 'registered_unused';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center items-start">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-2xl font-serif">{isOnboarding ? 'Machine Onboarding' : 'Machine Handover'}</h1>
          <p className="text-sm text-slate-400 mt-1">{planter.id} • {planter.machineType || planter.type}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={isOnboarding ? handleSubmitOnboarding : handleSubmitHandover} className="space-y-5">
            {isOnboarding ? (
              <>
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Acres</label>
                    <input required type="number" step="0.1" value={acresCovered} onChange={e => setAcresCovered(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                    <input required type="date" value={usageStartDate} onChange={e => setUsageStartDate(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                    <input required type="date" value={usageEndDate} onChange={e => setUsageEndDate(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Fuel Consumed (L)</label>
                  <input type="number" step="0.1" value={fuelConsumed} onChange={e => setFuelConsumed(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Weather Notes</label>
                  <input type="text" value={weatherNotes} onChange={e => setWeatherNotes(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Sunny, Light rain" />
                </div>
              </>
            )}

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
