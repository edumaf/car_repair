// The user's region (CLAUDE.md scope change §6): decides units, which country data links to show, and whether
// repair-cost ranges are shown (only where we have price data: the US for now).
export type Region = 'us' | 'uk' | 'ro' | 'eu' | 'other';

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ro', label: 'Romania' },
  { value: 'eu', label: 'Other Europe' },
  { value: 'other', label: 'Rest of world' },
];

const EU = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'SK',
  'SI',
  'ES',
  'SE',
  'NO',
  'CH',
  'IS',
  'MD',
  'RS',
  'UA',
  'AL',
  'BA',
  'ME',
  'MK',
]);

/** "en-US" → us, "ro-RO" → ro, "de-DE" → eu … ; unknown → other. */
export function regionFromLocale(locale: string | undefined | null): Region {
  const country = (locale ?? '').split(/[-_]/)[1]?.toUpperCase();
  if (!country) return 'other';
  if (country === 'US' || country === 'PR') return 'us';
  if (country === 'GB' || country === 'UK') return 'uk';
  if (country === 'RO') return 'ro';
  return EU.has(country) ? 'eu' : 'other';
}

function deviceLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

let region: Region = regionFromLocale(deviceLocale());
const listeners = new Set<(r: Region) => void>();

export const getRegion = (): Region => region;
export function setRegion(next: Region): void {
  if (next === region) return;
  region = next;
  listeners.forEach((l) => l(region));
}
export function onRegionChange(l: (r: Region) => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Repair-cost ranges are US prices; only show them where they apply. */
export const showRepairCosts = (r: Region = region): boolean => r === 'us';
export const defaultMileageUnit = (r: Region = region): 'mi' | 'km' => (r === 'us' || r === 'uk' ? 'mi' : 'km');

/** Official vehicle-history pages the user can open for their country (no data is pulled into the app). */
export function historyLinks(r: Region = region): { label: string; url: string; note: string }[] {
  if (r === 'uk')
    return [
      {
        label: 'Check MOT history (GOV.UK)',
        url: 'https://www.gov.uk/check-mot-history',
        note: 'Free: past mileage readings and failed tests, by number plate.',
      },
    ];
  if (r === 'ro')
    return [
      {
        label: 'Vehicle history on RAR (Registrul Auto Român)',
        url: 'https://www.rarom.ro',
        note: 'RAR offers mileage and damage history by VIN (Auto-Pass is paid).',
      },
    ];
  return [];
}

/** Currency used for car prices in listings: Romanian listings are usually in euros. */
export function currencySymbol(r: Region = region): string {
  return { us: '$', uk: '£', ro: '€', eu: '€', other: '' }[r];
}

/** "€8,500" / "$15,900" / "8,500" (no symbol for "other"). */
export function money(n: number, r: Region = region): string {
  const sym = currencySymbol(r);
  return `${sym}${Math.round(n).toLocaleString('en-US')}`;
}
