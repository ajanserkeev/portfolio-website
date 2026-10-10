export interface SectionBox {
  index: number;
  top: number;
  bottom: number;
}

/** Index of the section containing the document-space `line`, clamped to the first/last section. */
export function floorAtLine(sections: readonly SectionBox[], line: number): number {
  if (sections.length === 0) return 0;
  for (const section of sections) {
    if (line >= section.top && line < section.bottom) return section.index;
  }
  const first = sections[0];
  return first && line < first.top ? first.index : (sections.at(-1)?.index ?? 0);
}

/**
 * Keeps the visitor on the same floor when the layout reflows (rotation, resize). Works in every
 * tier, so it does not depend on the browser's scroll anchoring (Safari has none).
 */
export function initFloorKeeper(doc: Document): () => void {
  const win = doc.defaultView;
  const main = doc.querySelector<HTMLElement>('main.tower');
  if (!win || !main) return () => {};

  const boxes = (): SectionBox[] =>
    Array.from(doc.querySelectorAll<HTMLElement>('section.level[data-index]')).map((section) => {
      const rect = section.getBoundingClientRect();
      return {
        index: Number(section.dataset.index),
        top: rect.top + win.scrollY,
        bottom: rect.bottom + win.scrollY,
      };
    });
  const floorNow = () => floorAtLine(boxes(), win.scrollY + win.innerHeight / 2);

  let current = floorNow();
  let width = win.innerWidth;
  let height = main.offsetHeight;

  const onScroll = () => {
    // While the width is changing the layout is mid-reflow: keep the floor we had.
    if (win.innerWidth === width) current = floorNow();
  };

  const observer = new ResizeObserver(() => {
    if (main.offsetHeight === height && win.innerWidth === width) return;
    height = main.offsetHeight;
    width = win.innerWidth;
    if (floorNow() !== current) {
      const id = doc.querySelector<HTMLElement>(`section.level[data-index="${current}"]`)?.dataset
        .level;
      if (id) doc.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    current = floorNow();
  });

  win.addEventListener('scroll', onScroll, { passive: true });
  observer.observe(main);
  return () => {
    win.removeEventListener('scroll', onScroll);
    observer.disconnect();
  };
}
