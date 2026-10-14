import type { Scene, WebGLRenderer } from 'three';
import type { LevelManager } from './level-manager';
import type { Tier } from './tiers';

/** `window.__tower` with `?debug=1`: engine state for the HUD, e2e tests and support. */
export interface TowerDebug {
  readonly position: number;
  readonly tier: Exclude<Tier, 'static'>;
  readonly ready: number[];
  readonly drawCalls: number;
  readonly triangles: number;
  readonly frames: number;
  /** People from the cast currently in the scene. */
  readonly actors: number;
  readonly sources: Record<number, string>;
  /** The 3D lift: how open its doors are (0…1) and where the cabin floor is. */
  readonly lift: { doors: number; cabinY: number };
  loseContext(): void;
}

declare global {
  interface Window {
    __tower?: TowerDebug;
  }
}

export interface DebugSources {
  renderer: WebGLRenderer;
  scene: Scene;
  position(): number;
  tier(): Exclude<Tier, 'static'>;
  levels: Pick<LevelManager, 'ready' | 'asset'>;
  frames(): number;
  lift(): { doors: number; cabinY: number };
}

/** People from the cast in `scene` (each spawned root carries userData.castMember). */
export function countActors(scene: Scene): number {
  let count = 0;
  scene.traverse((node) => {
    if (node.userData.castMember) count += 1;
  });
  return count;
}

export function installDebugHandle(s: DebugSources): () => void {
  window.__tower = {
    get position() {
      return s.position();
    },
    get tier() {
      return s.tier();
    },
    get ready() {
      return s.levels.ready();
    },
    get drawCalls() {
      return s.renderer.info.render.calls;
    },
    get triangles() {
      return s.renderer.info.render.triangles;
    },
    get frames() {
      return s.frames();
    },
    get actors() {
      return countActors(s.scene);
    },
    get sources() {
      return Object.fromEntries(
        s.levels
          .ready()
          .map((i) => [i, String(s.levels.asset(i)?.root.userData.source ?? 'greybox')]),
      );
    },
    get lift() {
      return s.lift();
    },
    loseContext: () => s.renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
  };
  void import('./debug-hud').then(({ mountDebugHud }) => mountDebugHud(document.body));
  return () => {
    delete window.__tower;
  };
}
