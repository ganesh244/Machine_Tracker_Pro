import type { QRBatchDetails } from './fieldOperations.js';
export function qrBatchName(details: QRBatchDetails) {
 return [details.state, details.district, details.year, details.season].filter(Boolean).join(' · ') || 'General QR batch';
}
export function qrBatchPrefix(details: QRBatchDetails, batchId: string, fallbackYear = new Date().getFullYear()) {
 const state = details.state === 'Telangana' ? 'TS' : details.state === 'Andhra Pradesh' ? 'AP' : 'GEN';
 const district = details.district ? ({Nizamabad:'NZB',Sangareddy:'SRD'}[details.district] || details.district.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)) : '';
 const season = details.season ? ({Kharif:'KH',Rabi:'RB','Zaid / Summer':'SU',Other:'OT'}[details.season] || '') : '';
 return [state,district,'DRF',details.year || fallbackYear,season,batchId.slice(0,8).toUpperCase()].filter(Boolean).join('-');
}
