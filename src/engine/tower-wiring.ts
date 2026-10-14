import type { AmbientManager } from './ambient';
import type { CapsulePool } from './capsules/capsule-pool';
import type { CapsuleChannel } from './capsules/types';
import { bus as defaultBus, type PainId, type TowerBus } from './events';

/** Capsule colour for each pain picked on the roof. */
const PAIN_CHANNEL: Record<PainId, CapsuleChannel> = {
  'lost-leads': 'whatsapp',
  'manual-routine': 'telegram',
  'need-site': 'default',
  'need-booking': 'instagram',
  browsing: 'default',
};

export interface WiringDeps {
  ambient: Pick<AmbientManager, 'markActivity'>;
  capsules: Pick<CapsulePool, 'setPersonalCapsule' | 'launchCapsule'>;
  liftPosition(): number;
  /** Wake the render loop for a few frames. */
  invalidate(): void;
  /** A hotspot fired: let the floors animate even if ambient motion is off. */
  onInteraction(): void;
  bus?: TowerBus;
}

/** Bus events that move things in the tower: capsules, interaction windows. Returns unbind. */
export function wireTowerEvents(deps: WiringDeps): () => void {
  const bus = deps.bus ?? defaultBus;
  const wake = () => {
    deps.ambient.markActivity();
    deps.invalidate();
  };
  const offs = [
    bus.on('capsule:selected', (e) => {
      const channel = PAIN_CHANNEL[e.pain] ?? 'default';
      deps.capsules.setPersonalCapsule(deps.liftPosition(), channel);
      deps.capsules.launchCapsule({ channel });
      wake();
    }),
    // Any hotspot (3D click or its DOM twin) wakes the loop so the floor's animation plays.
    bus.on('hotspot:activated', (e) => {
      deps.onInteraction();
      if (e.action === 'sort-demo') {
        deps.capsules.launchCapsule({ channel: 'default', durationSec: 2.0 });
      }
      wake();
    }),
    bus.on('deal:run', () => {
      deps.capsules.launchCapsule({ channel: 'default', durationSec: 2.0 });
      wake();
    }),
    bus.on('chat:user-message', () => {
      deps.capsules.launchCapsule({ channel: 'telegram', durationSec: 2.0 });
      wake();
    }),
  ];
  return () => {
    for (const off of offs) off();
  };
}
