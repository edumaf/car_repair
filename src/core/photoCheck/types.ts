// Photo-check contract shared by the app and /photo-check (CLAUDE.md §7.2). The server drops any
// finding code that isn't allowed for the photo type, so the app can trust these lists.
import type { PhotoCheckType } from '../types';

export const ALLOWED_FINDINGS: Readonly<Record<PhotoCheckType, readonly string[]>> = {
  tire: [
    'tread_low',
    'uneven_wear_inner',
    'uneven_wear_outer',
    'cupping',
    'sidewall_bulge',
    'sidewall_cracking',
    'mismatched_brands',
    'dot_code_visible',
  ],
  rust: ['surface_rust', 'bubbling_paint', 'perforation', 'fresh_undercoating'],
  paint_panel: ['color_mismatch', 'overspray', 'uneven_gap', 'dent', 'deep_scratch', 'hail_damage'],
  dashboard_lights: [],
  engine_bay: ['wet_oil_leak', 'coolant_residue', 'corrosion', 'damaged_hoses', 'missing_covers_or_parts', 'unusually_clean'],
  fluid: ['milky_residue', 'very_dark_fluid', 'sludge', 'low_level_visible'],
  interior_damage: ['water_stain', 'silt_or_mud', 'rusty_seat_rails', 'heavy_wear', 'mold_mildew'],
  underbody: ['frame_kink_or_weld', 'heavy_rust_scaling', 'active_leak', 'missing_catalytic_converter', 'damaged_exhaust'],
  vin_plate: ['tamper_signs'],
  odometer: [],
  document: [],
};

export const ALLOWED_LIGHTS = [
  'check_engine',
  'check_engine_flashing',
  'airbag',
  'abs',
  'battery',
  'oil_pressure',
  'coolant_temperature',
  'brake_system',
  'tpms',
  'traction_control',
  'power_steering',
  'hybrid_system',
  'ev_battery',
  'dpf',
  'def',
] as const;
export type DashboardLight = (typeof ALLOWED_LIGHTS)[number];

export const TITLE_BRAND_WORDS = ['salvage', 'rebuilt', 'flood', 'lemon', 'junk', 'non-repairable'] as const;

export interface PhotoFinding {
  code: string;
  confidence: 'high' | 'medium' | 'low';
  /** Plain English, ≤ 140 chars: where in the photo. */
  description: string;
}

export interface PhotoCheckResult {
  quality: { ok: boolean; retake_tip: string | null };
  findings: PhotoFinding[];
  lights: DashboardLight[];
  transcriptions: {
    vin_text?: string | null;
    odometer_value?: number | null;
    odometer_unit?: 'mi' | 'km' | null;
    dot_code?: string | null;
    title_brand_words?: string[];
  };
  notes_for_user: string;
}

export interface PhotoCheckRequest {
  /** Local file URI of a 1280 px, re-encoded (EXIF-free) JPEG. */
  imageUri: string;
  photoType: PhotoCheckType;
  car: { year: number | null; make: string | null; model: string | null; powertrain: string };
}
