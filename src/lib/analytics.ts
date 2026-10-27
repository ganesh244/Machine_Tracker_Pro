import { canManageMachine, type FieldMachine, type FieldUsage } from './fieldOperations';
import type { UserProfile } from '../types';
export type Geography = 'village' | 'mandal' | 'district' | 'state';
export const defaultGeography = (role: UserProfile['role']): Geography => role === 'cf' || role === 'jcf' ? 'village' : role === 'area_manager' ? 'mandal' : role === 'district_manager' || role === 'state_manager' ? 'district' : 'state';
export function machineTypeName(machine: FieldMachine) {
  const name = (machine.machineType || machine.type || 'Unspecified').trim().replace(/\s+/g, ' ') || 'Unspecified';
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['mcp', 'multicropplanter'].includes(key)) return 'MCP';
  if (['drumseeder', 'drumseeders'].includes(key)) return 'Drum seeder';
  if (['laserlandleveller', 'laserlandleveler'].includes(key)) return 'Laser land leveller';
  return name;
}
export function machineState(machine: FieldMachine) {
  if (machine.status === 'maintenance' || machine.operatingStatus === 'maintenance') return 'Maintenance';
  if (machine.operatingStatus === 'operating' || machine.status === 'in_use') return 'Running';
  return 'Idle';
}
export function buildAnalytics(actor: UserProfile, users: UserProfile[], inputMachines: FieldMachine[], inputUsage: FieldUsage[], from = '', to = '', geography: Geography = defaultGeography(actor.role)) {
  const machines = inputMachines.filter(machine => canManageMachine(actor, machine, users));
  const ids = new Set(machines.map(machine => machine.id));
  const usages = inputUsage.filter(usage => ids.has(usage.machineId) && (!from || usage.operationDate >= from) && (!to || usage.operationDate <= to));
  const acres = (rows: FieldUsage[]) => rows.reduce((sum, usage) => sum + (Number.isFinite(usage.landAcres) && usage.landAcres > 0 ? usage.landAcres : 0), 0);
  const byMachine = machines.map(machine => { const rows = usages.filter(usage => usage.machineId === machine.id); return { machine, acres: acres(rows), visits: rows.length, status: machineState(machine) }; }).sort((a, b) => b.acres - a.acres || b.visits - a.visits || a.machine.id.localeCompare(b.machine.id));
  const typeGroups = new Map<string, { name: string; total: number; running: number; idle: number; maintenance: number; acres: number; visits: number }>();
  byMachine.forEach(row => {
    const name = machineTypeName(row.machine), key = name.toLowerCase();
    const group = typeGroups.get(key) || { name, total: 0, running: 0, idle: 0, maintenance: 0, acres: 0, visits: 0 };
    group.total += 1; group.acres += row.acres; group.visits += row.visits;
    if (row.status === 'Running') group.running += 1;
    else if (row.status === 'Maintenance') group.maintenance += 1;
    else group.idle += 1;
    typeGroups.set(key, group);
  });
  const machineTypes = [...typeGroups.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const aggregate = (key: (usage: FieldUsage) => string) => {
    const groups = new Map<string, { name: string; rows: FieldUsage[] }>();
    usages.forEach(usage => { const name = (key(usage) || '').trim() || 'Unspecified', id = name.toLocaleLowerCase(); const group = groups.get(id) || { name, rows: [] }; group.rows.push(usage); groups.set(id, group); });
    return [...groups.values()].map(group => ({ name: group.name, acres: acres(group.rows), visits: group.rows.length, machines: new Set(group.rows.map(row => row.machineId)).size })).sort((a, b) => b.acres - a.acres || a.name.localeCompare(b.name));
  };
  const geographicKey = (usage: FieldUsage) => [usage[geography], ...(geography === 'village' ? [usage.mandal, usage.district, usage.state] : geography === 'mandal' ? [usage.district, usage.state] : geography === 'district' ? [usage.state] : [])].filter(Boolean).join(' · ');
  const activeMachines = byMachine.filter(row => row.visits > 0).length;
  return { machines, usages, byMachine, machineTypes, topMachines: byMachine.filter(row => row.visits > 0).slice(0, 5), crops: aggregate(usage => usage.crop), places: aggregate(geographicKey), totalAcres: acres(usages), visits: usages.length, running: byMachine.filter(row => row.status === 'Running').length, idle: byMachine.filter(row => row.status === 'Idle').length, maintenance: byMachine.filter(row => row.status === 'Maintenance').length, activeMachines, neverUsed: byMachine.filter(row => !inputUsage.some(usage => usage.machineId === row.machine.id)).length, pendingFarmers: machines.filter(machine => !machine.leadFarmerId).length, leadVisits: usages.filter(row => row.farmerKind === 'lead').length, fellowVisits: usages.filter(row => row.farmerKind === 'fellow').length };
}
