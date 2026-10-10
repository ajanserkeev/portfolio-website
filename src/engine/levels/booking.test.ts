import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TowerBus } from '../events';
import { createBookingController } from './booking';

function createMockBookingScene(): Group {
  const root = new Group();

  const boardRoot = new Group();
  boardRoot.name = 'dyn__board';
  const flap = new Mesh(undefined, new MeshBasicMaterial());
  flap.name = 'dyn__board__flap';
  boardRoot.add(flap);
  root.add(boardRoot);

  return root;
}

describe('createBookingController', () => {
  it('starts with default schedule rows and not flipping', () => {
    const root = createMockBookingScene();
    const ctrl = createBookingController({ root });

    expect(ctrl.rows.length).toBeGreaterThan(0);
    expect(ctrl.isFlipping).toBe(false);
  });

  it('triggers flip animation and updates rows when new slot is set', () => {
    const root = createMockBookingScene();
    const ctrl = createBookingController({ root });

    ctrl.setSlot('2026-10-24T14:00:00Z', 0.0);
    expect(ctrl.isFlipping).toBe(true);

    // During flipping, flap mesh rotates
    ctrl.update(0.1);
    const flap = root.getObjectByName('dyn__board__flap');
    if (!flap) throw new Error('missing flap');
    expect(flap.rotation.x).not.toBe(0);

    // After animation finishes (~1.0s)
    ctrl.update(1.2);
    expect(ctrl.isFlipping).toBe(false);
    expect(ctrl.rows.some((row) => row.includes('14:00') || row.includes('BOOKED'))).toBe(true);
  });

  it('responds to booking:confirmed event on bus', () => {
    const root = createMockBookingScene();
    const bus = new TowerBus();
    const ctrl = createBookingController({ root, bus });

    bus.emit({ type: 'booking:confirmed', slotIso: '2026-10-24T15:30:00Z' });
    expect(ctrl.isFlipping).toBe(true);

    ctrl.update(1.2);
    expect(ctrl.isFlipping).toBe(false);
    expect(ctrl.rows.some((row) => row.includes('15:30') || row.includes('BOOKED'))).toBe(true);
  });

  it('responds to hotspot activation on booking floor', () => {
    const root = createMockBookingScene();
    const bus = new TowerBus();
    const ctrl = createBookingController({ root, bus });

    bus.emit({ type: 'hotspot:activated', level: 'booking', action: 'open-booking' });
    expect(ctrl.isFlipping).toBe(true);
  });

  it('cleans up handlers on dispose', () => {
    const root = createMockBookingScene();
    const bus = new TowerBus();
    const ctrl = createBookingController({ root, bus });

    ctrl.dispose();
    bus.emit({ type: 'booking:confirmed', slotIso: '2026-10-24T10:00:00Z' });
    expect(ctrl.isFlipping).toBe(false);
  });
});
