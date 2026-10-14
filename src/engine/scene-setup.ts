import type { Scene as SceneType } from 'three';
import { Color, DirectionalLight, HemisphereLight, Scene, WebGLRenderer } from 'three';
import type { CastLibrary } from './cast/cast-library';
import { countActors } from './debug-handle';
import type { Tier } from './tiers';
import { pixelRatioFor } from './tiers';

/** Renderer sized to the stage and a scene lit for the matcap/robot materials. */
export function createRendererAndScene(
  stage: HTMLElement,
  tier: Exclude<Tier, 'static'>,
): { renderer: WebGLRenderer; scene: Scene } {
  const renderer = new WebGLRenderer({
    antialias: tier === 'high',
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
  renderer.setSize(stage.clientWidth, stage.clientHeight, false);
  stage.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#f3ebdd');
  scene.add(new HemisphereLight('#fff7ea', '#b9a58c', 2.2));
  const sun = new DirectionalLight('#ffffff', 1.4);
  sun.position.set(-6, 10, 8);
  scene.add(sun);
  return { renderer, scene };
}

/**
 * `?shot=`: a still frame includes the people, so wait for the cast (they spawn when it resolves),
 * draw two more frames, then tell the capture script (data-shot-ready, data-shot-people).
 */
export function signalShotReady(
  scene: SceneType,
  cast: Promise<CastLibrary | null>,
  redraw: () => void,
): void {
  void cast.then(() => {
    redraw();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        document.documentElement.dataset.shotPeople = String(countActors(scene));
        document.documentElement.dataset.shotReady = 'true';
      }),
    );
  });
}
