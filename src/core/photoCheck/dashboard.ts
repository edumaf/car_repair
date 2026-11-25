// Maps warning lights seen in a dashboard photo to checklist suggestions (CLAUDE.md §7.4).
// Suggestions are never answers: the user confirms or dismisses each one (§2.3).
import type { Severity } from '../types';
import type { DashboardLight } from './types';

export interface LightSuggestion {
  itemId: string;
  light: DashboardLight;
  severity: Severity;
}

const CRITICAL: DashboardLight[] = ['oil_pressure', 'coolant_temperature', 'brake_system', 'check_engine_flashing'];
const MAJOR: DashboardLight[] = ['check_engine', 'abs', 'battery', 'power_steering', 'hybrid_system', 'ev_battery', 'dpf', 'def'];
const NOTE_ONLY: DashboardLight[] = ['tpms', 'traction_control'];

export function mapDashboardLights(
  lights: readonly DashboardLight[],
  applicableItemIds: ReadonlySet<string>,
): {
  suggestions: LightSuggestion[];
  /** Lights that may be normal right after start: ask the user to re-check after 10 seconds. */
  recheck: DashboardLight[];
  /** Red lights: show "stop driving and don't buy without a mechanic's check" (§2.5). */
  stopDriving: boolean;
} {
  const suggestions: LightSuggestion[] = [];
  const add = (itemId: string, light: DashboardLight, severity: Severity) => {
    if (applicableItemIds.has(itemId) && !suggestions.some((s) => s.itemId === itemId && s.light === light)) {
      suggestions.push({ itemId, light, severity });
    }
  };
  for (const light of lights) {
    if (CRITICAL.includes(light)) {
      add('dash_lights_startup', light, 'critical');
      if (light === 'coolant_temperature') add('temp_gauge', light, 'critical');
    } else if (light === 'airbag') {
      add('airbag_light', light, 'critical');
    } else if (MAJOR.includes(light)) {
      add('dash_lights_startup', light, 'major');
    }
  }
  return {
    suggestions,
    recheck: lights.filter((l) => NOTE_ONLY.includes(l)),
    stopDriving: lights.some((l) => l === 'oil_pressure' || l === 'coolant_temperature' || l === 'brake_system'),
  };
}

export const LIGHT_LABEL: Record<DashboardLight, string> = {
  check_engine: 'Check engine',
  check_engine_flashing: 'Flashing check engine',
  airbag: 'Airbag',
  abs: 'ABS',
  battery: 'Battery / charging',
  oil_pressure: 'Oil pressure',
  coolant_temperature: 'Engine temperature',
  brake_system: 'Brake system',
  tpms: 'Tire pressure',
  traction_control: 'Traction control',
  power_steering: 'Power steering',
  hybrid_system: 'Hybrid system',
  ev_battery: 'EV battery',
  dpf: 'Diesel particulate filter',
  def: 'Diesel exhaust fluid',
};
