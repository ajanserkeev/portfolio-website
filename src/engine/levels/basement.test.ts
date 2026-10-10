import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TowerBus } from '../events';
import { createBasementController } from './basement';

function createMockBasementScene(): Group {
  const root = new Group();

  const dockRoot = new Group();
  dockRoot.name = 'dyn__dock';
  const cradle = new Mesh(undefined, new MeshBasicMaterial());
  cradle.name = 'dyn__dock__cradle';
  dockRoot.add(cradle);
  root.add(dockRoot);

  for (const id of ['lead', 'creative', 'automation']) {
    const personRoot = new Group();
    personRoot.name = `dyn__${id}`;
    const head = new Mesh(undefined, new MeshBasicMaterial());
    head.name = `dyn__${id}__head`;
    personRoot.add(head);
    root.add(personRoot);
  }

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

  it('handles person selection and animates head nod', () => {
    const root = createMockBasementScene();
    let selectedPerson: string | undefined;
    const ctrl = createBasementController({
      root,
      onPersonSelect: (id) => {
        selectedPerson = id;
      },
    });

    const leadHead = root.getObjectByName('dyn__lead__head');
    if (!leadHead) throw new Error('missing lead head');

    ctrl.selectPerson('lead', 0.0);
    expect(selectedPerson).toBe('lead');

    ctrl.update(0.08);
    expect(leadHead.rotation.x).not.toBe(0);

    ctrl.update(0.3);
    expect(leadHead.rotation.x).toBeCloseTo(0, 2);
  });

  it('responds to view-person hotspots', () => {
    const root = createMockBasementScene();
    const bus = new TowerBus();
    let selectedPerson: string | undefined;
    createBasementController({
      root,
      bus,
      onPersonSelect: (id) => {
        selectedPerson = id;
      },
    });

    bus.emit({ type: 'hotspot:activated', level: 'basement', action: 'view-creative' });
    expect(selectedPerson).toBe('creative');
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
