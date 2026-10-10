import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

export interface RoofControllerOptions {
  root: Object3D;
  bus?: TowerBus;
}

export interface RoofController {
  readonly isAgentEnabled: boolean;
  toggleAgent(currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

const LEVER_PULL_ANGLE = -0.6; // Radians to tilt back

export function createRoofController(options: RoofControllerOptions): RoofController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;

  const leverHandle =
    root.getObjectByName('dyn__lever__handle') ?? root.getObjectByName('dyn__lever');

  const tweens = new TweenManager();
  let agentEnabled = false;

  function toggleAgent(currentTimeSec = 0): void {
    agentEnabled = !agentEnabled;
    const targetAngle = agentEnabled ? LEVER_PULL_ANGLE : 0;
    const currentAngle = leverHandle?.rotation.x ?? 0;

    tweens.stopAll();
    tweens.add(
      {
        from: currentAngle,
        to: targetAngle,
        durationSec: 0.45,
        ease: 'easeOutBounce',
        onUpdate: (angle) => {
          if (leverHandle) leverHandle.rotation.x = angle;
        },
      },
      currentTimeSec,
    );

    if (agentEnabled) {
      bus.emit({ type: 'agent:enabled' });
    }
  }

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'roof' && e.action === 'toggle-agent') {
      toggleAgent();
    }
  });

  function update(timeSec: number): void {
    tweens.update(timeSec);
  }

  function dispose(): void {
    unbindHotspot();
    tweens.stopAll();
  }

  return {
    get isAgentEnabled() {
      return agentEnabled;
    },
    toggleAgent,
    update,
    dispose,
  };
}
