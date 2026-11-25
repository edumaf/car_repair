/**
 * Scroll offset that centers an item (e.g. the current section chip) in a horizontal strip, without scrolling past
 * either end. All values in points.
 */
export function centerOffset(item: { x: number; width: number }, viewport: number, content: number): number {
  const max = Math.max(0, content - viewport);
  return Math.min(max, Math.max(0, item.x + item.width / 2 - viewport / 2));
}
