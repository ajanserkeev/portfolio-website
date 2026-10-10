import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TowerBus } from '../events';
import { createWorkshopController } from './workshop';

function createMockWorkshopScene(): Group {
  const root = new Group();

  const sliderRoot = new Group();
  sliderRoot.name = 'dyn__slider';
  const handle = new Mesh(undefined, new MeshBasicMaterial());
  handle.name = 'dyn__slider__handle';
  sliderRoot.add(handle);
  root.add(sliderRoot);

  return root;
}

describe('createWorkshopController', () => {
  it('starts in code stage with slider at center', () => {
    const root = createMockWorkshopScene();
    const ctrl = createWorkshopController({ root });

    expect(ctrl.currentStage).toBe('code');
    expect(ctrl.stageIndex).toBe(1);
  });

  it('transitions stage and animates slider handle', () => {
    const root = createMockWorkshopScene();
    const ctrl = createWorkshopController({ root });
    const handle = root.getObjectByName('dyn__slider__handle');
    if (!handle) throw new Error('missing handle');

    ctrl.setStage('prod', 0.0);
    expect(ctrl.currentStage).toBe('prod');

    ctrl.update(0.1);
    expect(handle.position.x).toBeGreaterThan(0);

    ctrl.update(0.4);
    expect(handle.position.x).toBeCloseTo(0.28, 2);
  });

  it('cycles stages on nextStage', () => {
    const root = createMockWorkshopScene();
    const ctrl = createWorkshopController({ root });

    expect(ctrl.currentStage).toBe('code');
    ctrl.nextStage();
    expect(ctrl.currentStage).toBe('prod');
    ctrl.nextStage();
    expect(ctrl.currentStage).toBe('wireframe');
    ctrl.nextStage();
    expect(ctrl.currentStage).toBe('code');
  });

  it('advances stage on hotspot activation', () => {
    const root = createMockWorkshopScene();
    const bus = new TowerBus();
    const ctrl = createWorkshopController({ root, bus });

    bus.emit({ type: 'hotspot:activated', level: 'workshop', action: 'next-stage' });
    expect(ctrl.currentStage).toBe('prod');
  });

  it('cleans up handlers on dispose', () => {
    const root = createMockWorkshopScene();
    const bus = new TowerBus();
    const ctrl = createWorkshopController({ root, bus });

    ctrl.dispose();
    bus.emit({ type: 'hotspot:activated', level: 'workshop', action: 'next-stage' });
    expect(ctrl.currentStage).toBe('code');
  });
});
