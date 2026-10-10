import { normalizeTravels, type Travel } from './lift';

/** Height of 100svh in px: stable while mobile browser bars show and hide. */
export function stableViewportHeight(doc: Document): number {
  const probe = doc.createElement('div');
  probe.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
  doc.body.append(probe);
  const height = probe.getBoundingClientRect().height;
  probe.remove();
  return height > 0 ? height : (doc.defaultView?.innerHeight ?? 0);
}

/**
 * Travel k runs while the spacer of level k + 1 passes the `anchor` line of the viewport
 * (0.6 = 60% from the top): the lift leaves as the previous text scrolls away.
 */
export function measureTravels(doc: Document, anchor = 0.6): Travel[] {
  const viewport = stableViewportHeight(doc);
  const scrollY = doc.defaultView?.scrollY ?? 0;
  const spacers = Array.from(doc.querySelectorAll<HTMLElement>('[data-lift-travel]'));
  return normalizeTravels(
    spacers.map((spacer) => {
      const rect = spacer.getBoundingClientRect();
      const top = rect.top + scrollY;
      return { start: top - anchor * viewport, end: top + rect.height - anchor * viewport };
    }),
  );
}
