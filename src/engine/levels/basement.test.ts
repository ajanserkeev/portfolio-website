import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TowerBus } from '../events';
import { createBasementController } from './basement';

function fakePeople(ids: string[]) {
  const log = new Map<string, string[]>(ids.map((id) => [id, []]));
  const actors = ids.map((id) => {
    const root = new Group();
    root.userData.castMember = id;
    return { root, play: (clip: string) => log.get(id)?.push(clip) };
  });
  return { actors, played: (id: string) => log.get(id) ?? [] };
}

function createMockBasementScene(): Group {
  const root = new Group();

  const dockRoot = new Group();
  dockRoot.name = 'dyn__dock';
  const cradle = new Mesh(undefined, new MeshBasicMaterial());
  cradle.name = 'dyn__dock__cradle';
  dockRoot.add(cradle);
  root.add(dockRoot);

  return root;
}

describe('createBasementController', () => {
  it('starts in ready state without capsule', () => {
    const root = createMockBasementScene();
    const ctrl = createBasementController({ root });

    expect(ctrl.hasReceivedCapsule).toBe(false);
    expect(ctrl.isReceiving).toBe(false);
  });

  it('animates dock cradle and sets received state on capsule arrival', () => {
    const root = createMockBasementScene();
    let arrivalReported = false;
    const ctrl = createBasementController({
      root,
      onCapsuleArrival: () => {
        arrivalReported = true;
      },
    });

    const cradle = root.getObjectByName('dyn__dock__cradle');
    if (!cradle) throw new Error('missing cradle');
    const initialY = cradle.position.y;

    ctrl.receiveCapsule(0.0);
    expect(ctrl.isReceiving).toBe(true);

    ctrl.update(0.05);
    expect(cradle.position.y).toBeLessThan(initialY);

    ctrl.update(0.5);
    expect(ctrl.isReceiving).toBe(false);
    expect(ctrl.hasReceivedCapsule).toBe(true);
    expect(arrivalReported).toBe(true);
    expect(cradle.position.y).toBeCloseTo(initialY, 2);
  });

  it('triggers capsule arrival on lead:submitted bus event', () => {
    const root = createMockBasementScene();
    const bus = new TowerBus();
    const ctrl = createBasementController({ root, bus });

    bus.emit({ type: 'lead:submitted', source: 'form' });
    expect(ctrl.isReceiving).toBe(true);
  });

  it('triggers capsule arrival on test-capsule hotspot', () => {
    const root = createMockBasementScene();
    const bus = new TowerBus();
    const ctrl = createBasementController({ root, bus });

    bus.emit({ type: 'hotspot:activated', level: 'basement', action: 'test-capsule' });
    expect(ctrl.isReceiving).toBe(true);
  });

  it('makes the founders wave when the capsule lands, then back to typing', () => {
    const root = createMockBasementScene();
    const people = fakePeople(['founder-lead', 'founder-creative', 'guest']);
    const ctrl = createBasementController({ root, people });

    ctrl.receiveCapsule(0);
    ctrl.update(0.05);
    ctrl.update(0.6);
    expect(people.played('founder-lead')).toEqual(['wave']);
    expect(people.played('founder-creative')).toEqual(['wave']);
    expect(people.played('guest')).toEqual([]);

    ctrl.update(2.0);
    expect(people.played('founder-lead')).toEqual(['wave']);
    ctrl.update(3.7);
    expect(people.played('founder-lead')).toEqual(['wave', 'type']);
  });

  it('cleans up handlers on dispose', () => {
    const root = createMockBasementScene();
    const bus = new TowerBus();
    const ctrl = createBasementController({ root, bus });

    ctrl.dispose();
    bus.emit({ type: 'lead:submitted', source: 'chat' });
    expect(ctrl.isReceiving).toBe(false);
  });
});
