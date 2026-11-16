// Display names for complaint groups (keys of _meta.complaint_keyword_groups in inspection_checklist.json).
export const COMPLAINT_GROUP_LABEL: Record<string, string> = {
  engine: 'Engine',
  transmission: 'Transmission',
  brakes: 'Brakes',
  steering: 'Steering',
  suspension: 'Suspension',
  electrical: 'Electrical',
  airbags: 'Airbags',
  structure: 'Body structure & latches',
  fuel: 'Fuel system',
  tires_wheels: 'Tires & wheels',
  climate: 'Climate & equipment',
  lighting_visibility: 'Lights & visibility',
  hybrid_ev: 'Hybrid / EV system',
  driver_assist: 'Driver assistance',
};

export const complaintGroupLabel = (group: string): string =>
  COMPLAINT_GROUP_LABEL[group] ?? group.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * NHTSA recall components look like "FUEL SYSTEM, GASOLINE:DELIVERY:FUEL PUMP" or "SEAT BELTS:FRONT:ANCHORAGE".
 * Show the system and the most specific part: "Fuel system: fuel pump", "Seat belts: anchorage".
 * Several components are separated by a comma without a space; they're joined with " · ".
 */
export function recallComponentLabel(component: string): string {
  const label = (c: string) => {
    const path = c
      .split(':')
      .map((p) => p.trim())
      .filter(Boolean);
    if (path.length === 0) return '';
    const system = sentence(path[0].split(',')[0].trim());
    return path.length === 1 ? system : `${system}: ${path[path.length - 1].toLowerCase()}`;
  };
  const labels = component
    .split(/,(?!\s)/)
    .map(label)
    .filter(Boolean);
  return [...new Set(labels)].join(' · ') || 'Component not listed';
}

const POWERTRAIN_LABEL = { gas: 'Gas', diesel: 'Diesel', hybrid: 'Hybrid', ev: 'Electric' } as const;
export const powertrainLabel = (p: keyof typeof POWERTRAIN_LABEL) => POWERTRAIN_LABEL[p];
