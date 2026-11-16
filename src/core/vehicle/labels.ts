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
