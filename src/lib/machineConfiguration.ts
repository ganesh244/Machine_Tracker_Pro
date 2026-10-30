export interface MachineConfiguration { tines?:number; boxes?:number; autoSurvey?:boolean; powerSource?:string }
export const MACHINE_BRANDS:Record<string,string[]>={MCP:['National','Kamboj','Landforce'],'Laser land leveller':['Black Stallion','T&D']};
export function validateMachineConfiguration(type:string,brand:string,config?:MachineConfiguration){
 if(!config)return; // Older records and clients remain compatible.
 if(!MACHINE_BRANDS[type])throw new Error('Configuration is supported only for MCP and laser land leveller.');
 if(!MACHINE_BRANDS[type].includes(brand))throw new Error('Choose a listed brand for this machine type.');
 if(type==='MCP'){if(![9,11,13].includes(config.tines!)||![2,3].includes(config.boxes!)||config.autoSurvey!==undefined||config.powerSource!==undefined)throw new Error('Choose 9, 11 or 13 tines and 2 or 3 boxes for MCP.');}
 else if(typeof config.autoSurvey!=='boolean'||!['Tractor hydraulic','PTO pump'].includes(config.powerSource!)||config.tines!==undefined||config.boxes!==undefined)throw new Error('Choose auto-survey availability and hydraulic or PTO pump power.');
}
export function machineConfigurationLabel(config?:MachineConfiguration){if(!config)return 'Configuration not recorded';return config.tines?`${config.tines} tines · ${config.boxes} boxes (${config.boxes===3?'seed + fertilizer + wheat':'seed + fertilizer'})`:`${config.autoSurvey?'With':'Without'} auto-survey · ${config.powerSource}`;}
