import { Group, Mesh, MeshBasicMaterial } from 'three';
import { beforeEach, describe, expect, it } from 'vitest';
import { TowerBus, type TowerEventOf } from '../events';
import { createRoofController } from './roof';

function createMockRoofRoot(): Group {
  const root = new Group();

  const leverRoot = new Group();
  leverRoot.name = 'dyn__lever';

  const leverHandle = new Mesh(undefined, new MeshBasicMaterial());
  leverHandle.name = 'dyn__lever__handle';
  leverRoot.add(leverHandle);

  root.add(leverRoot);
  return root;
}

describe('RoofController', () => {
  let bus: TowerBus;

  beforeEach(() => {
    bus = new TowerBus();
  });

  it('animates lever rotation when toggle-agent hotspot is triggered', () => {
    const root = createMockRoofRoot();
    const leverHandle = root.getObjectByName('dyn__lever__handle');
    if (!leverHandle) throw new Error('leverHandle not found');

    const controller = createRoofController({
      root,
      bus,
    });

    expect(controller.isAgentEnabled).toBe(false);
    expect(leverHandle.rotation.x).toBeCloseTo(0, 2);

    // Trigger toggle
    controller.toggleAgent(0.0);
    expect(controller.isAgentEnabled).toBe(true);

    // Mid-animation at t = 0.25 (duration = 0.5s)
    controller.update(0.25);
    expect(leverHandle.rotation.x).not.toBe(0);

    // End of animation at t = 0.5
    controller.update(0.5);
    expect(leverHandle.rotation.x).toBeCloseTo(-0.6, 1);

    controller.dispose();
  });

  it('listens to hotspot:activated for toggle-agent and emits agent:enabled event', () => {
    const root = createMockRoofRoot();
    const emitted: Array<TowerEventOf<'agent:enabled'>> = [];
    bus.on('agent:enabled', (ev) => emitted.push(ev));

    const controller = createRoofController({ root, bus });

    bus.emit({ type: 'hotspot:activated', level: 'roof', action: 'toggle-agent' });

    expect(controller.isAgentEnabled).toBe(true);
    expect(emitted).toHaveLength(1);

    controller.dispose();
  });
});
