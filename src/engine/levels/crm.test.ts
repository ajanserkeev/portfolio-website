import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { TowerBus } from '../events';
import { createCrmController, type DealStage } from './crm';

function createMockCrmScene(): Group {
  const root = new Group();

  const buttonRoot = new Group();
  buttonRoot.name = 'dyn__deal';
  const buttonCap = new Mesh(undefined, new MeshBasicMaterial());
  buttonCap.name = 'dyn__deal__cap';
  buttonRoot.add(buttonCap);
  root.add(buttonRoot);

  const stampRoot = new Group();
  stampRoot.name = 'dyn__stamp';
  const stampHead = new Mesh(undefined, new MeshBasicMaterial());
  stampHead.name = 'dyn__stamp__head';
  stampRoot.add(stampHead);
  root.add(stampRoot);

  const conveyorRoot = new Group();
  conveyorRoot.name = 'dyn__conveyor';
  const roller = new Mesh(undefined, new MeshBasicMaterial());
  roller.name = 'dyn__conveyor__roller';
  conveyorRoot.add(roller);
  root.add(conveyorRoot);

  return root;
}

describe('createCrmController', () => {
  it('starts in idle state with 0 hours saved', () => {
    const root = createMockCrmScene();
    const ctrl = createCrmController({ root });

    expect(ctrl.currentStage).toBe('idle');
    expect(ctrl.hoursSaved).toBe(0);
    expect(ctrl.isRunning).toBe(false);
  });

  it('runs deal through 5 stages and accumulates hours saved', () => {
    const root = createMockCrmScene();
    const recordedStages: DealStage[] = [];
    const recordedHours: number[] = [];

    const ctrl = createCrmController({
      root,
      onStageChange: (stage, hours) => {
        recordedStages.push(stage);
        recordedHours.push(hours);
      },
    });

    ctrl.runDeal(0.0);
    expect(ctrl.isRunning).toBe(true);
    expect(ctrl.currentStage).toBe('lead');
    expect(ctrl.hoursSaved).toBeGreaterThan(0);

    // Advance time through qualification stage (~0.8s)
    ctrl.update(0.8);
    expect(ctrl.currentStage).toBe('qualified');

    // Advance to manager stage (~1.6s)
    ctrl.update(1.6);
    expect(ctrl.currentStage).toBe('manager');

    // Advance to invoice stage (~2.4s)
    ctrl.update(2.4);
    expect(ctrl.currentStage).toBe('invoice');

    // Advance to paid stage (~3.2s)
    ctrl.update(3.2);
    expect(ctrl.currentStage).toBe('paid');
    expect(ctrl.hoursSaved).toBe(20);

    // After completion, resets to idle
    ctrl.update(4.0);
    expect(ctrl.currentStage).toBe('idle');
    expect(ctrl.isRunning).toBe(false);

    expect(recordedStages).toEqual(['lead', 'qualified', 'manager', 'invoice', 'paid', 'idle']);
    expect(recordedHours[recordedHours.length - 2]).toBe(20);
  });

  it('depresses button cap when deal starts', () => {
    const root = createMockCrmScene();
    const buttonCap = root.getObjectByName('dyn__deal__cap');
    if (!buttonCap) throw new Error('missing button cap');
    const initialY = buttonCap.position.y;

    const ctrl = createCrmController({ root });
    ctrl.runDeal(0.0);

    ctrl.update(0.05);
    expect(buttonCap.position.y).toBeLessThan(initialY);

    // Recovers after animation
    ctrl.update(0.3);
    expect(buttonCap.position.y).toBeCloseTo(initialY, 2);
  });

  it('drops stamp press during qualification stage', () => {
    const root = createMockCrmScene();
    const stampHead = root.getObjectByName('dyn__stamp__head');
    if (!stampHead) throw new Error('missing stamp head');
    const initialY = stampHead.position.y;

    const ctrl = createCrmController({ root });
    ctrl.runDeal(0.0);

    // Advance to qualification
    ctrl.update(0.8);
    // Stamp drops punchily
    ctrl.update(0.9);
    expect(stampHead.position.y).toBeLessThan(initialY);

    // Recovers back up
    ctrl.update(1.4);
    expect(stampHead.position.y).toBeCloseTo(initialY, 1);
  });

  it('rotates conveyor roller continuously and speeds up during deal', () => {
    const root = createMockCrmScene();
    const roller = root.getObjectByName('dyn__conveyor__roller');
    if (!roller) throw new Error('missing roller');

    const ctrl = createCrmController({ root });
    // Idle rotation
    ctrl.update(1.0);
    const idleAngle = roller.rotation.x;
    expect(idleAngle).toBeGreaterThan(0);

    // Deal running rotation
    ctrl.runDeal(1.0);
    ctrl.update(2.0);
    const activeDelta = roller.rotation.x - idleAngle;
    expect(activeDelta).toBeGreaterThan(idleAngle);
  });

  it('triggers deal on hotspot activation', () => {
    const root = createMockCrmScene();
    const bus = new TowerBus();
    const ctrl = createCrmController({ root, bus });

    bus.emit({ type: 'hotspot:activated', level: 'crm', action: 'run-deal' });
    expect(ctrl.isRunning).toBe(true);
    expect(ctrl.currentStage).toBe('lead');
  });

  it('triggers deal on bus deal:run event', () => {
    const root = createMockCrmScene();
    const bus = new TowerBus();
    const ctrl = createCrmController({ root, bus });

    bus.emit({ type: 'deal:run' });
    expect(ctrl.isRunning).toBe(true);
    expect(ctrl.currentStage).toBe('lead');
  });

  it('cleans up handlers on dispose', () => {
    const root = createMockCrmScene();
    const bus = new TowerBus();
    const ctrl = createCrmController({ root, bus });

    ctrl.dispose();
    bus.emit({ type: 'deal:run' });
    expect(ctrl.isRunning).toBe(false);
  });
});
