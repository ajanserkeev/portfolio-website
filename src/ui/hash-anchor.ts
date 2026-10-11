const INTERACTIONS = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

/**
 * A deep link (`/#crm`) is scrolled into place by the browser before web fonts and late layout
 * land, and can end up hundreds of pixels off. Once fonts are ready and two frames have been
 * laid out, align the target again, unless the visitor has already started scrolling.
 */
export function settleHashAnchor(doc: Document): void {
  const win = doc.defaultView;
  const id = win?.location.hash.slice(1);
  if (!win || !id) return;

  let interacted = false;
  const onInteract = () => {
    interacted = true;
  };
  for (const type of INTERACTIONS) win.addEventListener(type, onInteract, { passive: true });

  void doc.fonts.ready.then(() => {
    win.requestAnimationFrame(() =>
      win.requestAnimationFrame(() => {
        for (const type of INTERACTIONS) win.removeEventListener(type, onInteract);
        if (interacted) return;
        doc.getElementById(decodeURIComponent(id))?.scrollIntoView({
          block: 'start',
          behavior: 'instant',
        });
      }),
    );
  });
}
