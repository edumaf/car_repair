// Navigation aid for the year/make/model picker: common US-market makes are listed first.
// This is UI ordering only, not a fact about any car; the full NHTSA list is always searchable.
export const POPULAR_MAKES = [
  'TOYOTA',
  'HONDA',
  'FORD',
  'CHEVROLET',
  'NISSAN',
  'HYUNDAI',
  'KIA',
  'JEEP',
  'SUBARU',
  'GMC',
  'RAM',
  'DODGE',
  'VOLKSWAGEN',
  'MAZDA',
  'TESLA',
  'BMW',
  'MERCEDES-BENZ',
  'LEXUS',
  'AUDI',
  'BUICK',
  'CADILLAC',
  'CHRYSLER',
  'ACURA',
  'INFINITI',
  'MITSUBISHI',
  'VOLVO',
  'LINCOLN',
  'MINI',
  'PORSCHE',
  'LAND ROVER',
  'GENESIS',
  'JAGUAR',
  'FIAT',
  'ALFA ROMEO',
];

/** Popular makes present in `all` (in popularity order), then everything else alphabetically. */
export function orderMakes(all: readonly string[]): { popular: string[]; others: string[] } {
  const set = new Set(all.map((m) => m.toUpperCase()));
  const popular = POPULAR_MAKES.filter((m) => set.has(m));
  const pop = new Set(popular);
  return { popular, others: all.filter((m) => !pop.has(m.toUpperCase())) };
}
