import { describe, expect, it } from 'vitest';
import { settleHashAnchor } from './hash-anchor';

type Listener = () => void;

function setup(hash: string) {
  const scrolled: string[] = [];
  const listeners = new Map<string, Set<Listener>>();
  const frames: Array<() => void> = [];
  let fontsReady: () => void = () => {};
  const win = {
    location: { hash },
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    addEventListener: (type: string, fn: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, fn: Listener) => listeners.get(type)?.delete(fn),
  };
  const doc = {
    defaultView: win,
    fonts: { ready: new Promise<void>((resolve) => (fontsReady = resolve)) },
    getElementById: (id: string) => ({
      scrollIntoView: () => scrolled.push(id),
    }),
  };
  const flush = async () => {
    fontsReady();
    await Promise.resolve();
    await Promise.resolve();
    while (frames.length > 0) frames.shift()?.();
  };
  const fire = (type: string) => {
    for (const fn of listeners.get(type) ?? []) fn();
  };
  return { doc: doc as unknown as Document, scrolled, flush, fire };
}

describe('settleHashAnchor', () => {
  it('re-aligns the hash target once fonts are ready and the layout has settled', async () => {
    const { doc, scrolled, flush } = setup('#crm');
    settleHashAnchor(doc);
    expect(scrolled).toEqual([]);
    await flush();
    expect(scrolled).toEqual(['crm']);
  });

  it('leaves the page alone when the visitor already scrolled by hand', async () => {
    const { doc, scrolled, flush, fire } = setup('#crm');
    settleHashAnchor(doc);
    fire('wheel');
    await flush();
    expect(scrolled).toEqual([]);
  });

  it('does nothing without a hash', async () => {
    const { doc, scrolled, flush } = setup('');
    settleHashAnchor(doc);
    await flush();
    expect(scrolled).toEqual([]);
  });
});
