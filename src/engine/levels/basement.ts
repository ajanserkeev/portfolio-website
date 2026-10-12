import type { Object3D } from 'three';
import { bus as defaultBus, type TowerBus } from '../events';
import { TweenManager } from '../tween';

/** The people on this floor, as src/engine/cast/level-people.ts provides them. */
export interface BasementPeople {
  readonly actors: ReadonlyArray<{
    readonly root: Object3D;
    play(clip: string, fade?: number): void;
  }>;
}

export interface BasementControllerOptions {
  root: Object3D;
  bus?: TowerBus;
  people?: BasementPeople;
  onCapsuleArrival?: () => void;
}

export interface BasementController {
  readonly hasReceivedCapsule: boolean;
  readonly isReceiving: boolean;
  receiveCapsule(currentTimeSec?: number): void;
  update(timeSec: number): void;
  dispose(): void;
}

/** How long the founders wave at a capsule that just landed. */
const WAVE_SECONDS = 3;

export function createBasementController(options: BasementControllerOptions): BasementController {
  const { root } = options;
  const bus = options.bus ?? defaultBus;
  const people = options.people;
  const onCapsuleArrival = () => {
    greet();
    options.onCapsuleArrival?.();
  };

  const cradle = root.getObjectByName('dyn__dock__cradle') ?? root.getObjectByName('dyn__dock');
  const cradleRestY = cradle?.position.y ?? 0;

  const tweens = new TweenManager();

  let hasReceivedCapsule = false;
  let isReceiving = false;
  let lastTimeSec: number | undefined;
  let waveUntil: number | undefined;

  const founders = () =>
    (people?.actors ?? []).filter((actor) =>
      String(actor.root.userData.castMember ?? '').startsWith('founder'),
    );

  /** The founders look up from their keyboards and wave at the new request. */
  function greet(): void {
    for (const founder of founders()) founder.play('wave', 0.25);
    waveUntil = (lastTimeSec ?? 0) + WAVE_SECONDS;
  }

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

  const unbindLead = bus.on('lead:submitted', () => {
    receiveCapsule(lastTimeSec ?? 0);
  });

  const unbindCapsule = bus.on('capsule:selected', () => {
    receiveCapsule(lastTimeSec ?? 0);
  });

  const unbindHotspot = bus.on('hotspot:activated', (e) => {
    if (e.level === 'basement' && e.action === 'test-capsule') receiveCapsule(lastTimeSec ?? 0);
  });

  function update(timeSec: number): void {
    lastTimeSec = timeSec;
    tweens.update(timeSec);
    if (waveUntil !== undefined && timeSec >= waveUntil) {
      waveUntil = undefined;
      for (const founder of founders()) founder.play('type', 0.3);
    }
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
    update,
    dispose,
  };
}
