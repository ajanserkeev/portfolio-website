import { describe, expect, it } from 'vitest';
import { TowerBus, type TowerEventOf } from '../engine/events';
import { initFloorActions } from './floor-actions-dom';

type Listener = (event: unknown) => void;

function fakeDocument(scrolled: string[]) {
  const listeners = new Map<string, Set<Listener>>();
  const doc = {
    addEventListener: (type: string, fn: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, fn: Listener) => listeners.get(type)?.delete(fn),
    querySelector: (selector: string) => ({
      scrollIntoView: () => scrolled.push(selector),
    }),
  } as unknown as Document;
  const click = (attrs: Record<string, string> | null) => {
    const button = attrs && { getAttribute: (name: string) => attrs[name] ?? null };
    for (const fn of listeners.get('click') ?? []) fn({ target: { closest: () => button } });
  };
  return { doc, click };
}

describe('initFloorActions', () => {
  it('emits exactly one hotspot event per click and stops after dispose', () => {
    const bus = new TowerBus();
    const seen: Array<TowerEventOf<'hotspot:activated'>> = [];
    bus.on('hotspot:activated', (e) => seen.push(e));
    const vibrations: number[] = [];
    const { doc, click } = fakeDocument([]);

    const dispose = initFloorActions(doc, { bus, vibrate: (ms) => vibrations.push(ms) });
    click({ 'data-hotspot': 'run-deal', 'data-level': 'crm' });
    expect(seen).toEqual([{ type: 'hotspot:activated', level: 'crm', action: 'run-deal' }]);
    expect(vibrations).toEqual([10]);

    dispose();
    click({ 'data-hotspot': 'run-deal', 'data-level': 'crm' });
    expect(seen).toHaveLength(1);
  });

  it('ignores clicks outside action buttons', () => {
    const bus = new TowerBus();
    const seen: unknown[] = [];
    bus.on('hotspot:activated', (e) => seen.push(e));
    const { doc, click } = fakeDocument([]);
    initFloorActions(doc, { bus, vibrate: () => {} });
    click(null);
    expect(seen).toEqual([]);
  });

  it('scrolls to the booking widget when the booking action fires, from DOM or 3D', () => {
    const bus = new TowerBus();
    const scrolled: string[] = [];
    const { doc } = fakeDocument(scrolled);
    initFloorActions(doc, { bus, vibrate: () => {} });
    bus.emit({ type: 'hotspot:activated', level: 'booking', action: 'open-booking' });
    expect(scrolled).toEqual(['#booking .level__widget']);
  });
});
