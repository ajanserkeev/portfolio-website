import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

export interface BasementControllerOptions {
  root: Object3D;
  bus?: TowerBus;
  onCapsuleArrival?: () => void;
  onPersonSelect?: (personId: string) => void;
}

export interface BasementController {
  readonly hasReceivedCapsule: boolean;
  readonly isReceiving: boolean;
  receiveCapsule(currentTimeSec?: number): void;
  selectPerson(personId: string, currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

export function createBasementController(options: BasementControllerOptions): BasementController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;
  const onCapsuleArrival = options.onCapsuleArrival;
  const onPersonSelect = options.onPersonSelect;

  const cradle = root.getObjectByName('dyn__dock__cradle') ?? root.getObjectByName('dyn__dock');
  const cradleRestY = cradle?.position.y ?? 0;

  const tweens = new TweenManager();

  let hasReceivedCapsule = false;
  let isReceiving = false;
  let lastTimeSec: number | undefined;

  function receiveCapsule(currentTimeSec = 0): void {
    isReceiving = true;
    if (cradle) {
      cradle.position.y = cradleRestY;
      tweens.add(
        {
          from: cradleRestY,
          to: cradleRestY - 0.08,
          durationSec: 0.1,
          ease: 'easeInOutQuad',
          onUpdate: (y) => {
            cradle.position.y = y;
          },
          onComplete: () => {
            tweens.add(
              {
                from: cradleRestY - 0.08,
                to: cradleRestY,
                durationSec: 0.35,
                ease: 'easeOutBounce',
                onUpdate: (y) => {
                  cradle.position.y = y;
                },
                onComplete: () => {
                  isReceiving = false;
                  hasReceivedCapsule = true;
                  onCapsuleArrival?.();
                },
              },
              currentTimeSec + 0.1,
            );
          },
        },
        currentTimeSec,
      );
    } else {
      isReceiving = false;
      hasReceivedCapsule = true;
      onCapsuleArrival?.();
    }
  }

  function selectPerson(personId: string, currentTimeSec = 0): void {
    onPersonSelect?.(personId);
    const head = root.getObjectByName(`dyn__${personId}__head`);
    if (head) {
      tweens.add(
        {
          from: 0,
          to: 0.25,
          durationSec: 0.1,
          ease: 'easeInOutQuad',
          onUpdate: (rot) => {
            head.rotation.x = rot;
          },
          onComplete: () => {
            tweens.add(
              {
                from: 0.25,
                to: 0,
                durationSec: 0.18,
                ease: 'easeOutQuad',
                onUpdate: (rot) => {
                  head.rotation.x = rot;
                },
              },
              currentTimeSec + 0.1,
            );
          },
        },
        currentTimeSec,
      );
    }
  }

  const unbindLead = bus.on('lead:submitted', () => {
    receiveCapsule(lastTimeSec ?? 0);
  });

  const unbindCapsule = bus.on('capsule:selected', () => {
    receiveCapsule(lastTimeSec ?? 0);
  });

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'basement') {
      if (e.action === 'test-capsule') {
        receiveCapsule(lastTimeSec ?? 0);
      } else if (e.action.startsWith('view-')) {
        const id = e.action.slice('view-'.length);
        selectPerson(id, lastTimeSec ?? 0);
      }
    }
  });

  function update(timeSec: number): void {
    lastTimeSec = timeSec;
    tweens.update(timeSec);
  }

  function dispose(): void {
    unbindLead();
    unbindCapsule();
    unbindHotspot();
    tweens.stopAll();
  }

  return {
    get hasReceivedCapsule() {
      return hasReceivedCapsule;
    },
    get isReceiving() {
      return isReceiving;
    },
    receiveCapsule,
    selectPerson,
    update,
    dispose,
  };
}
