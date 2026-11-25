import { mapDashboardLights } from './dashboard';

const ALL = new Set(['dash_lights_startup', 'airbag_light', 'temp_gauge']);

describe('mapDashboardLights (CLAUDE.md §7.4)', () => {
  it.each([
    [['oil_pressure'], [['dash_lights_startup', 'critical']]],
    [
      ['coolant_temperature'],
      [
        ['dash_lights_startup', 'critical'],
        ['temp_gauge', 'critical'],
      ],
    ],
    [['brake_system'], [['dash_lights_startup', 'critical']]],
    [['check_engine_flashing'], [['dash_lights_startup', 'critical']]],
    [['airbag'], [['airbag_light', 'critical']]],
    [['check_engine'], [['dash_lights_startup', 'major']]],
    [['abs'], [['dash_lights_startup', 'major']]],
    [['def'], [['dash_lights_startup', 'major']]],
    [['tpms'], []],
    [['traction_control'], []],
  ] as const)('%j', (lights, expected) => {
    const r = mapDashboardLights(lights, ALL);
    expect(r.suggestions.map((s) => [s.itemId, s.severity])).toEqual(expected);
  });

  it('asks to re-check tpms/traction lights and flags red lights', () => {
    const r = mapDashboardLights(['tpms', 'oil_pressure', 'traction_control'], ALL);
    expect(r.recheck).toEqual(['tpms', 'traction_control']);
    expect(r.stopDriving).toBe(true);
    expect(mapDashboardLights(['check_engine'], ALL).stopDriving).toBe(false);
  });

  it('skips items that do not apply (e.g. no temp gauge on an EV)', () => {
    const r = mapDashboardLights(['coolant_temperature'], new Set(['dash_lights_startup']));
    expect(r.suggestions.map((s) => s.itemId)).toEqual(['dash_lights_startup']);
  });
});
