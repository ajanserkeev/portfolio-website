import { describe, expect, it } from 'vitest';
import { decidePin, readUsedHints, rememberHint } from './pins';

const event = { level: 'crm' as const, action: 'run-deal', x: 400, y: 300, visible: true };

describe('decidePin', () => {
  it('shows the chip above the object while the lift stands and the object is in view', () => {
    expect(decidePin(event, { used: new Set(), covered: false, width: 800, height: 600 })).toEqual({
      show: true,
      x: 400,
      y: 300,
    });
  });

  it('hides it while the lift moves, once the action was used, or under the text', () => {
    const view = { width: 800, height: 600 };
    expect(
      decidePin({ ...event, visible: false }, { used: new Set(), covered: false, ...view }).show,
    ).toBe(false);
    expect(decidePin(event, { used: new Set(['run-deal']), covered: false, ...view }).show).toBe(
      false,
    );
    expect(decidePin(event, { used: new Set(), covered: true, ...view }).show).toBe(false);
  });

  it('hides it when the object is off screen', () => {
    const state = { used: new Set<string>(), covered: false, width: 800, height: 600 };
    expect(decidePin({ ...event, x: -10 }, state).show).toBe(false);
    expect(decidePin({ ...event, y: 640 }, state).show).toBe(false);
  });
});

describe('used hints in sessionStorage', () => {
  it('round-trips and survives broken or blocked storage', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    rememberHint(storage, 'run-deal');
    rememberHint(storage, 'toggle-agent');
    expect([...readUsedHints(storage)].sort()).toEqual(['run-deal', 'toggle-agent']);
    data.set('tower:hints-used', '{broken');
    expect(readUsedHints(storage).size).toBe(0);
    const blocked = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(readUsedHints(blocked).size).toBe(0);
    expect(() => rememberHint(blocked, 'x')).not.toThrow();
  });
});
