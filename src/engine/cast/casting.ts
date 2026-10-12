import type { Object3D } from 'three';

/** A person a level asks for: an `anchor__cast__<slot>` node and its extras (contract 3.2.1). */
export interface CastPlacement {
  slot: string;
  /** Id from art/cast.json. */
  character: string;
  clip: string;
  speed: number;
  /** The anchor node: the person is added as its child and inherits its position and facing. */
  node: Object3D;
}

const PREFIX = 'cast__';

export function castPlacements(anchors: ReadonlyMap<string, Object3D>): CastPlacement[] {
  const placements: CastPlacement[] = [];
  for (const [name, node] of anchors) {
    if (!name.startsWith(PREFIX)) continue;
    const extras = node.userData as { character?: unknown; clip?: unknown; speed?: unknown };
    if (typeof extras.character !== 'string' || extras.character === '') continue;
    placements.push({
      slot: name.slice(PREFIX.length),
      character: extras.character,
      clip: typeof extras.clip === 'string' && extras.clip !== '' ? extras.clip : 'idle',
      speed: typeof extras.speed === 'number' && extras.speed > 0 ? extras.speed : 1,
      node,
    });
  }
  return placements;
}
