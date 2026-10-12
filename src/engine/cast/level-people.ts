import type { Object3D } from 'three';
import { seedFrom } from '../actors/robot-pose';
import { type Actor, createActor } from './actor';
import type { CastLibrary } from './cast-library';
import { castPlacements } from './casting';

/** The people standing on one floor. */
export interface LevelPeople {
  readonly actors: readonly Actor[];
  /** Absolute clock in seconds, as the level's update() receives it. */
  update(timeSeconds: number): void;
  /** Stops the mixers and detaches the people; their geometry belongs to the cast library. */
  dispose(): void;
}

/** Longest gap one frame may advance the clips by (tab switches, idle throttling). */
const MAX_STEP_SECONDS = 0.1;

/**
 * Spawns a person at every `anchor__cast__*` once the cast has loaded. The floor does not wait for
 * it: people appear a moment later, and a floor without a cast simply stays empty.
 */
export function populateLevel(
  anchors: ReadonlyMap<string, Object3D>,
  library: Promise<CastLibrary | null>,
  onReady?: () => void,
): LevelPeople {
  const placements = castPlacements(anchors);
  const actors: Actor[] = [];
  let disposed = false;
  let last: number | undefined;

  if (placements.length > 0) {
    void library.then((cast) => {
      if (!cast || disposed) return;
      for (const placement of placements) {
        const person = cast.spawn(placement.character);
        if (!person) continue;
        placement.node.add(person);
        actors.push(
          createActor(person, cast.clips, {
            clip: placement.clip,
            speed: placement.speed,
            phase: seedFrom(placement.slot) / 1000,
          }),
        );
      }
      onReady?.();
    });
  }

  return {
    actors,
    update(timeSeconds) {
      const step =
        last === undefined ? 0 : Math.min(Math.max(timeSeconds - last, 0), MAX_STEP_SECONDS);
      last = timeSeconds;
      for (const actor of actors) actor.update(step);
    },
    dispose() {
      disposed = true;
      for (const actor of actors) {
        actor.dispose();
        actor.root.removeFromParent();
      }
      actors.length = 0;
    },
  };
}
