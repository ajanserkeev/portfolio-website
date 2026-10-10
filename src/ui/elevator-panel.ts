import { tower } from '../engine/config';
import { bus } from '../engine/events';
import { activeLevelIndex, needleAngleDeg } from './elevator';

/** Highlights the current floor and turns the dial. Follows the lift in 3D, the sections in static mode. */
export function initElevatorPanel(doc: Document): () => void {
  const panel = doc.querySelector<HTMLElement>('[data-elevator]');
  if (!panel) return () => {};
  const links = Array.from(panel.querySelectorAll<HTMLAnchorElement>('[data-elevator-link]'));
  const total = tower.levels.length;
  let current = -1;

  const render = (position: number) => {
    panel.style.setProperty('--needle', `${needleAngleDeg(position, total)}deg`);
    const active = activeLevelIndex(position, total);
    if (active === current) return;
    current = active;
    links.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const off = bus.on('lift:moved', (event) => render(event.position));

  const ratios = new Map<number, number>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        ratios.set(Number((entry.target as HTMLElement).dataset.index), entry.intersectionRatio);
      }
      if (doc.documentElement.dataset.tier !== 'static') return;
      let best = 0;
      let bestRatio = -1;
      for (const [index, ratio] of ratios) {
        if (ratio > bestRatio) {
          best = index;
          bestRatio = ratio;
        }
      }
      render(best);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );
  for (const section of doc.querySelectorAll<HTMLElement>('section.level[data-index]')) {
    observer.observe(section);
  }

  render(0);
  return () => {
    off();
    observer.disconnect();
  };
}
