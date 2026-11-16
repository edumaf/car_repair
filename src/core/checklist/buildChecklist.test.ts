import { CHECKLIST_ITEMS } from '../data/seed';
import { buildChecklist, flattenChecklist, progress } from './buildChecklist';

const ids = (pt: 'gas' | 'diesel' | 'hybrid' | 'ev') => flattenChecklist(buildChecklist({ powertrain: pt }, [])).map((e) => e.item.id);

describe('buildChecklist', () => {
  it('filters by powertrain: "all" items always apply', () => {
    const gas = ids('gas');
    const ev = ids('ev');
    expect(gas).toContain('oil_level_condition');
    expect(gas).not.toContain('ev_battery_health');
    expect(gas).not.toContain('hybrid_battery_health');
    expect(gas).not.toContain('diesel_smoke_dpf');
    expect(ev).toContain('ev_battery_health');
    expect(ev).toContain('ev_charging');
    expect(ev).not.toContain('oil_level_condition');
    expect(ev).not.toContain('transmission_shifts');
    expect(ids('hybrid')).toEqual(expect.arrayContaining(['hybrid_battery_health', 'ev_charging', 'oil_level_condition']));
    expect(ids('diesel')).toEqual(expect.arrayContaining(['diesel_smoke_dpf', 'clutch_feel']));
    for (const pt of ['gas', 'diesel', 'hybrid', 'ev'] as const) {
      for (const item of CHECKLIST_ITEMS.filter((i) => i.powertrain.includes('all'))) expect(ids(pt)).toContain(item.id);
    }
  });

  it('keeps sections in order and drops empty ones', () => {
    const gas = buildChecklist({ powertrain: 'gas' }, []);
    const orders = gas.map((s) => s.section.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(gas.map((s) => s.section.id)).not.toContain('hybrid_ev');
    expect(buildChecklist({ powertrain: 'ev' }, []).map((s) => s.section.id)).toContain('hybrid_ev');
  });

  it('puts known problem areas first within a section and flags them; other items keep data order', () => {
    const plain = buildChecklist({ powertrain: 'gas' }, []).find((s) => s.section.id === 'test_drive')!;
    const flagged = buildChecklist({ powertrain: 'gas' }, ['transmission', 'brakes']).find((s) => s.section.id === 'test_drive')!;
    expect(plain.entries.every((e) => !e.knownProblemArea)).toBe(true);
    const order = flagged.entries.map((e) => e.item.id);
    expect(order.slice(0, 3)).toEqual(['transmission_shifts', 'clutch_feel', 'brakes_drive']);
    expect(flagged.entries.slice(0, 3).every((e) => e.knownProblemArea)).toBe(true);
    const rest = flagged.entries.slice(3).map((e) => e.item.id);
    expect(rest).toEqual(plain.entries.map((e) => e.item.id).filter((id) => !order.slice(0, 3).includes(id)));
  });

  it('never flags items without a complaint group', () => {
    const docs = buildChecklist({ powertrain: 'gas' }, ['engine']).find((s) => s.section.id === 'documents')!;
    expect(docs.entries.find((e) => e.item.id === 'vin_match')?.knownProblemArea).toBe(false);
    expect(docs.entries[0].item.id).toBe('timing_belt_due');
  });
});

describe('progress', () => {
  it('counts ok/problem/not_sure as checked; skip only as touched', () => {
    const entries = flattenChecklist(buildChecklist({ powertrain: 'ev' }, []));
    const [a, b, c, d] = entries.map((e) => e.item.id);
    expect(progress(entries, { [a]: 'ok', [b]: 'problem', [c]: 'skip', [d]: 'not_sure' })).toEqual({
      checked: 3,
      touched: 4,
      total: entries.length,
    });
  });
});
