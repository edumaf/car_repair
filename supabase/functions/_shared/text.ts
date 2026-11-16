// Text helpers shared by the Edge Function contracts and the app. Pure TS, no imports.
// Relative imports in _shared use the .ts extension (Deno needs it; the app's tsconfig allows it).

/** Shortens to whole sentences when possible, so the app never shows text cut mid-word. */
export function clipSentences(s: unknown, max: number): unknown {
  if (typeof s !== 'string' || s.length <= max) return s;
  const head = s.slice(0, max);
  const end = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
  if (end >= 40) return head.slice(0, end + 1);
  const space = head.lastIndexOf(' ', max - 1);
  return `${head.slice(0, space > 40 ? space : max - 1).replace(/[\s,;:–-]+$/, '')}…`;
}
