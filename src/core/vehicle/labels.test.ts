import { complaintGroupLabel, recallComponentLabel } from './labels';

describe('recallComponentLabel', () => {
  it.each([
    ['FUEL SYSTEM, GASOLINE:DELIVERY:FUEL PUMP', 'Fuel system: fuel pump'],
    ['SEAT BELTS:FRONT:ANCHORAGE', 'Seat belts: anchorage'],
    ['AIR BAGS:FRONTAL', 'Air bags: frontal'],
    ['ELECTRICAL SYSTEM', 'Electrical system'],
    ['STEERING:ELECTRIC POWER ASSIST SYSTEM:MOTOR,STEERING:ELECTRIC POWER ASSIST SYSTEM:SOFTWARE', 'Steering: motor · Steering: software'],
    ['', 'Component not listed'],
  ])('%s → %s', (input, out) => expect(recallComponentLabel(input)).toBe(out));
});

describe('complaintGroupLabel', () => {
  it('labels known and unknown groups', () => {
    expect(complaintGroupLabel('tires_wheels')).toBe('Tires & wheels');
    expect(complaintGroupLabel('new_group')).toBe('New group');
  });
});
