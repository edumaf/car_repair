// Which line-art drawing to show for a car (garage, report header, share card — CLAUDE.md §13 "generic car
// silhouette by body class"). Works with vPIC body classes ("Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle
// (MPV)") and with our model database body types ("hatchback", "estate", "mpv"...).
export const BODY_KINDS = ['sedan', 'hatchback', 'suv', 'pickup', 'coupe', 'van'] as const;
export type BodyKind = (typeof BODY_KINDS)[number];

const RULES: [RegExp, BodyKind][] = [
  [/pick ?up|truck/i, 'pickup'],
  [/sport utility|\bsuv\b|crossover|off-?road/i, 'suv'],
  [/\bvan\b|minivan|\bmpv\b|multi-purpose|bus/i, 'van'],
  [/coupe|convertible|cabrio|roadster/i, 'coupe'],
  [/hatch|liftback|estate|wagon|\bkombi\b/i, 'hatchback'],
  [/sedan|saloon|notchback/i, 'sedan'],
];

/** First body string that matches wins; unknown → sedan. */
export function bodyKind(...bodies: (string | null | undefined)[]): BodyKind {
  for (const b of bodies) {
    if (!b) continue;
    for (const [re, kind] of RULES) if (re.test(b)) return kind;
  }
  return 'sedan';
}
