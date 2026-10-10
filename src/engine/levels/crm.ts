import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

export type DealStage = 'idle' | 'lead' | 'qualified' | 'manager' | 'invoice' | 'paid';

export const DEAL_STAGES: readonly DealStage[] = [
  'lead',
  'qualified',
  'manager',
  'invoice',
  'paid',
] as const;

export interface CrmControllerOptions {
  root: Object3D;
  bus?: TowerBus;
  onStageChange?: (stage: DealStage, hoursSaved: number) => void;
}

export interface CrmController {
  readonly currentStage: DealStage;
  readonly hoursSaved: number;
  readonly isRunning: boolean;
  runDeal(currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

export function createCrmController(options: CrmControllerOptions): CrmController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;
  const onStageChange = options.onStageChange;

  const buttonCap = root.getObjectByName('dyn__deal__cap') ?? root.getObjectByName('dyn__deal');
  const stampHead = root.getObjectByName('dyn__stamp__head') ?? root.getObjectByName('dyn__stamp');
  const roller =
    root.getObjectByName('dyn__conveyor__roller') ?? root.getObjectByName('dyn__conveyor');

  const buttonRestY = buttonCap?.position.y ?? 0;
  const stampRestY = stampHead?.position.y ?? 0;

  const tweens = new TweenManager();

  let currentStage: DealStage = 'idle';
  let hoursSaved = 0;
  let isRunning = false;
  let startTimeSec: number | undefined;
  let lastTimeSec: number | undefined;

  function setStage(stage: DealStage, hours: number): void {
    if (currentStage === stage) return;
    currentStage = stage;
    hoursSaved = hours;
    onStageChange?.(stage, hours);
  }

  function triggerButtonAnimation(currentTimeSec: number): void {
    if (!buttonCap) return;
    buttonCap.position.y = buttonRestY;
    tweens.add(
      {
        from: buttonRestY,
        to: buttonRestY - 0.05,
        durationSec: 0.08,
        ease: 'easeInOutQuad',
        onUpdate: (y) => {
          buttonCap.position.y = y;
        },
        onComplete: () => {
          tweens.add(
            {
              from: buttonRestY - 0.05,
              to: buttonRestY,
              durationSec: 0.14,
              ease: 'easeOutQuad',
              onUpdate: (y) => {
                buttonCap.position.y = y;
              },
            },
            currentTimeSec + 0.08,
          );
        },
      },
      currentTimeSec,
    );
  }

  function triggerStampAnimation(currentTimeSec: number): void {
    if (!stampHead) return;
    tweens.add(
      {
        from: stampRestY,
        to: stampRestY - 0.35,
        durationSec: 0.12,
        ease: 'easeInOutQuad',
        onUpdate: (y) => {
          stampHead.position.y = y;
        },
        onComplete: () => {
          tweens.add(
            {
              from: stampRestY - 0.35,
              to: stampRestY,
              durationSec: 0.28,
              ease: 'easeOutBounce',
              onUpdate: (y) => {
                stampHead.position.y = y;
              },
            },
            currentTimeSec + 0.12,
          );
        },
      },
      currentTimeSec,
    );
  }

  function runDeal(currentTimeSec = 0): void {
    isRunning = true;
    startTimeSec = currentTimeSec;
    setStage('lead', 2);
    triggerButtonAnimation(currentTimeSec);
  }

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'crm' && e.action === 'run-deal') {
      runDeal(lastTimeSec ?? 0);
    }
  });

  const unbindDeal = bus.on('deal:run', () => {
    runDeal(lastTimeSec ?? 0);
  });

  function update(timeSec: number): void {
    const dt =
      lastTimeSec === undefined ? 0.016 : Math.max(0, Math.min(0.2, timeSec - lastTimeSec));
    const speed = isRunning ? 4.0 : 1.2;
    if (roller) {
      roller.rotation.x += speed * dt;
    }
    lastTimeSec = timeSec;

    tweens.update(timeSec);

    if (isRunning && startTimeSec !== undefined) {
      const elapsed = timeSec - startTimeSec;
      if (elapsed >= 3.95) {
        setStage('idle', hoursSaved);
        isRunning = false;
        startTimeSec = undefined;
      } else if (elapsed >= 3.15) {
        setStage('paid', 20);
      } else if (elapsed >= 2.35) {
        setStage('invoice', 14);
      } else if (elapsed >= 1.55) {
        setStage('manager', 9);
      } else if (elapsed >= 0.75) {
        if (currentStage !== 'qualified') {
          setStage('qualified', 5);
          triggerStampAnimation(timeSec);
        }
      }
    }
  }

  function dispose(): void {
    unbindHotspot();
    unbindDeal();
    tweens.stopAll();
  }

  return {
    get currentStage() {
      return currentStage;
    },
    get hoursSaved() {
      return hoursSaved;
    },
    get isRunning() {
      return isRunning;
    },
    runDeal,
    update,
    dispose,
  };
}
