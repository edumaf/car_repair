import { bodyKind } from './bodyKind';

describe('bodyKind', () => {
  it.each([
    ['Sedan/Saloon', 'sedan'],
    ['Hatchback/Liftback/Notchback', 'hatchback'],
    ['Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)', 'suv'],
    ['Pickup', 'pickup'],
    ['Crew Cab Pickup Truck', 'pickup'],
    ['Minivan', 'van'],
    ['Cargo Van', 'van'],
    ['Coupe', 'coupe'],
    ['Convertible/Cabriolet', 'coupe'],
    ['Wagon', 'hatchback'],
    ['estate', 'hatchback'],
    ['mpv', 'van'],
    ['suv', 'suv'],
  ])('%s → %s', (body, kind) => expect(bodyKind(body)).toBe(kind));

  it('falls back to the next body, then to sedan', () => {
    expect(bodyKind(null, 'hatchback')).toBe('hatchback');
    expect(bodyKind('Incomplete', undefined)).toBe('sedan');
    expect(bodyKind()).toBe('sedan');
  });
});
