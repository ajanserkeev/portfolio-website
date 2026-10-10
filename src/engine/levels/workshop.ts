import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

export type WorkshopStage = 'wireframe' | 'code' | 'prod';

export const WORKSHOP_STAGES: readonly WorkshopStage[] = ['wireframe', 'code', 'prod'] as const;

const STAGE_X_OFFSETS: Record<WorkshopStage, number> = {
  wireframe: -0.28,
  code: 0.0,
  prod: 0.28,
};

export interface WorkshopControllerOptions {
  root: Object3D;
  bus?: TowerBus;
  onStageChange?: (stage: WorkshopStage) => void;
}

export interface WorkshopController {
  readonly currentStage: WorkshopStage;
  readonly stageIndex: number;
  setStage(stage: WorkshopStage, currentTimeSec?: number): void;
  nextStage(currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

export function createWorkshopController(options: WorkshopControllerOptions): WorkshopController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;
  const onStageChange = options.onStageChange;

  const handle = root.getObjectByName('dyn__slider__handle') ?? root.getObjectByName('dyn__slider');

  const tweens = new TweenManager();

  let currentStage: WorkshopStage = 'code';
  let lastTimeSec: number | undefined;

  function setStage(stage: WorkshopStage, currentTimeSec = 0): void {
    currentStage = stage;
    const targetX = STAGE_X_OFFSETS[stage];
    const currentX = handle?.position.x ?? 0;

    tweens.stopAll();
    tweens.add(
      {
        from: currentX,
        to: targetX,
        durationSec: 0.35,
        ease: 'easeInOutQuad',
        onUpdate: (x) => {
          if (handle) {
            handle.position.x = x;
          }
        },
      },
      currentTimeSec,
    );

    onStageChange?.(stage);
  }

  function nextStage(currentTimeSec = 0): void {
    const currentIndex = WORKSHOP_STAGES.indexOf(currentStage);
    const nextIndex = (currentIndex + 1) % WORKSHOP_STAGES.length;
    const next = WORKSHOP_STAGES[nextIndex] ?? 'code';
    setStage(next, currentTimeSec);
  }

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'workshop') {
      nextStage(lastTimeSec ?? 0);
    }
  });

  function update(timeSec: number): void {
    lastTimeSec = timeSec;
    tweens.update(timeSec);
  }

  function dispose(): void {
    unbindHotspot();
    tweens.stopAll();
  }

  return {
    get currentStage() {
      return currentStage;
    },
    get stageIndex() {
      return WORKSHOP_STAGES.indexOf(currentStage);
    },
    setStage,
    nextStage,
    update,
    dispose,
  };
}
