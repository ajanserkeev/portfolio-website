import { describe, expect, it } from 'vitest';
import type { TowerEvent } from '../events';
import { createArrivalTracker, createFloorAnnouncer, createLiftAnnouncer } from './arrival';

describe('createArrivalTracker', () => {
  it('reports a floor once when the lift stops on it', () => {
    const arrival = createArrivalTracker();
    expect(arrival.update(1.6, false)).toBeNull();
    expect(arrival.update(2.004, false)).toBeNull();
    expect(arrival.update(2, true)).toBe(2);
    expect(arrival.update(2, true)).toBeNull();
  });

  it('ignores floors the lift only passes through', () => {
    const arrival = createArrivalTracker();
    for (const position of [0.5, 1, 1.5, 2, 2.5, 3, 3.5]) {
      expect(arrival.update(position, false)).toBeNull();
    }
  });

  it('reports the same floor again after the lift left it', () => {
    const arrival = createArrivalTracker();
    arrival.update(2, true);
    arrival.update(2.4, false);
    expect(arrival.update(2, true)).toBe(2);
  });
});

describe('createFloorAnnouncer', () => {
  it('names each floor as the lift comes within reach of it, passing or stopping', () => {
    const announce = createFloorAnnouncer();
    expect(announce.update(0)).toBe(0);
    expect(announce.update(0.5)).toBeNull();
    expect(announce.update(0.97)).toBe(1);
    expect(announce.update(1.02)).toBeNull();
  });
});

describe('createLiftAnnouncer', () => {
  it('emits level:reached while passing and lift:arrived only on a stop', () => {
    const events: TowerEvent[] = [];
    const announce = createLiftAnnouncer(['roof', 'agents', 'crm'], (event) => events.push(event));
    announce(1, false);
    announce(2, true);
    expect(events).toEqual([
      { type: 'level:reached', level: 'agents' },
      { type: 'level:reached', level: 'crm' },
      { type: 'lift:arrived', level: 'crm' },
    ]);
  });
});
