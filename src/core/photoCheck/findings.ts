// Plain-English names for photo-check finding codes, and a client-side guard that drops anything the server
// shouldn't have sent (codes not allowed for the photo type, unknown lights). CLAUDE.md §7.2.
import type { PhotoCheckType } from '../types';
import { ALLOWED_FINDINGS, ALLOWED_LIGHTS, type DashboardLight, type PhotoCheckResult } from './types';

export const FINDING_LABEL: Record<string, string> = {
  tread_low: 'Low tread',
  uneven_wear_inner: 'Inner edge worn more',
  uneven_wear_outer: 'Outer edge worn more',
  cupping: 'Cupped (scalloped) wear',
  sidewall_bulge: 'Bulge in the sidewall',
  sidewall_cracking: 'Cracks in the sidewall',
  mismatched_brands: 'Mismatched tire brands',
  dot_code_visible: 'Tire date code visible',
  surface_rust: 'Surface rust',
  bubbling_paint: 'Paint bubbling (rust underneath)',
  perforation: 'Rust holes',
  fresh_undercoating: 'Fresh undercoating',
  color_mismatch: 'Paint color doesn’t match',
  overspray: 'Paint overspray',
  uneven_gap: 'Uneven panel gap',
  dent: 'Dent',
  deep_scratch: 'Deep scratch',
  hail_damage: 'Hail damage',
  wet_oil_leak: 'Wet oil',
  coolant_residue: 'Coolant residue',
  corrosion: 'Corrosion',
  damaged_hoses: 'Damaged hoses',
  missing_covers_or_parts: 'Missing covers or parts',
  unusually_clean: 'Unusually clean engine bay',
  milky_residue: 'Milky residue',
  very_dark_fluid: 'Very dark fluid',
  sludge: 'Sludge',
  low_level_visible: 'Fluid level looks low',
  water_stain: 'Water stains',
  silt_or_mud: 'Silt or mud',
  rusty_seat_rails: 'Rusty seat rails',
  heavy_wear: 'Heavy wear',
  mold_mildew: 'Mold or mildew',
  frame_kink_or_weld: 'Kinked or welded frame',
  heavy_rust_scaling: 'Heavy rust scaling',
  active_leak: 'Active leak',
  missing_catalytic_converter: 'Catalytic converter missing',
  damaged_exhaust: 'Damaged exhaust',
  tamper_signs: 'Signs of tampering',
};

export const findingLabel = (code: string): string => FINDING_LABEL[code] ?? code.replace(/_/g, ' ');

/** Codes that are information, not problems (e.g. "tire date code visible"). */
export const INFO_FINDINGS = new Set(['dot_code_visible']);

export function sanitizePhotoResult(result: PhotoCheckResult, photoType: PhotoCheckType): PhotoCheckResult {
  const allowed = new Set(ALLOWED_FINDINGS[photoType]);
  const lights = new Set<string>(ALLOWED_LIGHTS);
  return {
    ...result,
    findings: result.findings.filter((f) => allowed.has(f.code)).map((f) => ({ ...f, description: f.description.slice(0, 140) })),
    lights: photoType === 'dashboard_lights' ? (result.lights.filter((l) => lights.has(l)) as DashboardLight[]) : [],
    notes_for_user: (result.notes_for_user ?? '').slice(0, 240),
  };
}
