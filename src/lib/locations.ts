// Verified 2026-10-27 against government directories. Existing saved locations
// remain selectable; presets do not rewrite historical data.
// https://www.telangana.gov.in/about/districts/
// https://igod.gov.in/sg/AP/E042/organizations
// https://sspensions.ap.gov.in/SSP/Home/KeyContacts
export const STATE_DISTRICTS:Record<string,readonly string[]>={
 Telangana:['Adilabad','Bhadradri Kothagudem','Hanumakonda','Hyderabad','Jagtial','Jangaon','Jayashankar Bhupalpally','Jogulamba Gadwal','Kamareddy','Karimnagar','Khammam','Kumuram Bheem','Mahabubabad','Mahabubnagar','Mancherial','Medak','Medchal-Malkajgiri','Mulugu','Nagarkurnool','Nalgonda','Narayanpet','Nirmal','Nizamabad','Peddapalli','Rajanna Sircilla','Rangareddy','Sangareddy','Siddipet','Suryapet','Vikarabad','Wanaparthy','Warangal','Yadadri Bhuvanagiri'],
 'Andhra Pradesh':['Alluri Sitharama Raju','Anakapalli','Ananthapuramu','Annamayya','Bapatla','Chittoor','Dr. B.R. Ambedkar Konaseema','East Godavari','Eluru','Guntur','Kakinada','Krishna','Kurnool','Markapuram','Nandyal','NTR','Palnadu','Parvathipuram Manyam','Polavaram','Prakasam','Sri Potti Sriramulu Nellore','Sri Sathya Sai','Srikakulam','Tirupati','Visakhapatnam','Vizianagaram','West Godavari','YSR Kadapa']
};
const sortedUnique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b));
export function stateOptions(existing:string[]=[]){return sortedUnique([...Object.keys(STATE_DISTRICTS),...existing]);}
export function districtOptions(state:string,existing:string[]=[]){return sortedUnique([...(STATE_DISTRICTS[state]||[]),...existing]);}
export function isPresetLocation(state:string,district:string){return !!STATE_DISTRICTS[state]?.includes(district);}
