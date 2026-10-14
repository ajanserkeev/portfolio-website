import { createAmbientManager } from './ambient';
import { castUrl, levelFiles, textureUrl } from './assets';
import { CameraRig } from './camera-rig';
import { createCapsulePool } from './capsules/capsule-pool';
import { type CastLibrary, loadCastLibrary } from './cast/cast-library';
import { LEVEL_IDS, tower } from './config';
import { installDebugHandle } from './debug-handle';
import { createLiftAnnouncer } from './elevator/arrival';
import { bus } from './events';
import { createGlbSource } from './glb-source';
import { greyboxSource } from './greybox';
import { createHotspotManager, syncLevelHits } from './interaction/hotspots';
import { type LevelSource, withFallback } from './level-asset';
import { LevelManager } from './level-manager';
import { liftPosition, type Travel } from './lift';
import { RenderLoop } from './loop';
import { createSharedMaterials, loadSharedTextures } from './materials/shared';
import { bindPage } from './page-bindings';
import { createRendererAndScene, signalShotReady } from './scene-setup';
import { measureTravels } from './scroll-binding';
import { probeTier } from './tier-probe';
import { type MotionPolicy, pixelRatioFor, type Tier } from './tiers';
import { wireTowerEvents } from './tower-wiring';

export type LiveTier = Exclude<Tier, 'static'>;

/** Long enough for the longest floor sequence (the CRM deal runs about 4 s). */
const INTERACTION_MS = 4500;

export interface StartOptions {
  stage: HTMLElement;
  tier: LiveTier;
  motion: MotionPolicy;
  /** Measure FPS after the first frame and downgrade if needed. Off when the tier was forced. */
  probeFps: boolean;
  debug: boolean;
  /** 3D must stop (context lost, too slow): the caller switches the page to static mode. */
  onFallback: () => void;
  source?: LevelSource;
  shot?: number;
}

export interface TowerHandle {
  destroy(): void;
}

export async function startTower(options: StartOptions): Promise<TowerHandle> {
  const { stage, motion } = options;
  let tier = options.tier;
  let frames = 0;
  let live = false;
  let destroyed = false;
  /** Until this time the floors animate even when ambient motion is off (reduced motion, idle). */
  let interactionUntilMs = 0;

  const { renderer, scene } = createRendererAndScene(stage, tier);
  const announceFloors = createLiftAnnouncer(LEVEL_IDS, (event) => bus.emit(event));

  // Deep links are aligned by src/ui/hash-anchor.ts once the layout settles.
  const rig = new CameraRig(tower, { width: stage.clientWidth, height: stage.clientHeight });
  if (options.shot !== undefined) {
    rig.setCentered(true);
    rig.setGoal(options.shot, true);
  }
  let travels: Travel[] = measureTravels(document);
  let lastGoal = options.shot ?? liftPosition(window.scrollY, travels);

  const textures = await loadSharedTextures({
    matcap: textureUrl('matcap'),
    screens: textureUrl('screens'),
    faces: textureUrl('faces'),
  });
  const shared = createSharedMaterials(textures);
  // The cast loads alongside the first floor; people step in when it arrives.
  const castLibrary: Promise<CastLibrary | null> = castUrl
    ? loadCastLibrary(castUrl, textures.matcap)
    : Promise.resolve(null);
  const source =
    options.source ??
    withFallback(
      createGlbSource(levelFiles, shared, undefined, undefined, {
        library: castLibrary,
        onReady: () => loop.invalidate(2),
      }),
      greyboxSource,
    );

  const loop = new RenderLoop(renderFrame);
  const ambient = createAmbientManager({
    motion,
    glowMaterial: shared.glow,
    mediaQuery:
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : undefined,
    onActiveChange: (active) => {
      loop.setContinuous('ambient', active);
      loop.invalidate();
    },
  });
  const hotspots = createHotspotManager({
    canvas: renderer.domElement,
    camera: rig.camera,
    bus,
  });

  const capsules = createCapsulePool(tower, shared.matcap);
  scene.add(capsules.mesh);

  const unbindEvents = wireTowerEvents({
    ambient,
    capsules,
    liftPosition: () => rig.position,
    invalidate: () => loop.invalidate(2),
    onInteraction: () => {
      interactionUntilMs = performance.now() + INTERACTION_MS;
      loop.setContinuous('interaction', true);
    },
  });

  const levels = new LevelManager(scene, source, tower.levels.length, () => {
    syncLevelHits(hotspots, LEVEL_IDS, (i) => levels.asset(i)?.hits);
    const animated = levels.ready().some((i) => levels.asset(i)?.update !== undefined);
    ambient.setAnimated(animated);
    loop.invalidate();
  });

  function renderFrame(dt: number, timeMs: number): void {
    const moving = rig.update(dt);
    levels.update(rig.position, lastGoal, options.shot !== undefined ? 0 : 1);
    ambient.update(timeMs);
    const interacting = timeMs < interactionUntilMs;
    if (ambient.active || interacting) {
      for (const index of levels.ready()) levels.asset(index)?.update?.(timeMs / 1000);
    }
    if (!interacting) loop.setContinuous('interaction', false);
    capsules.update(timeMs / 1000, rig.position);
    renderer.render(scene, rig.camera);
    frames += 1;
    bus.emit({ type: 'lift:moved', position: rig.position });
    announceFloors(rig.position, !moving);
    if (!moving) loop.setContinuous('camera', false);
    if (!live && levels.ready().includes(Math.round(rig.position))) {
      live = true;
      stage.dataset.state = 'live';
      if (options.probeFps) void probe();
      if (options.shot !== undefined) signalShotReady(scene, castLibrary, () => loop.invalidate(2));
    }
  }

  function probe(): Promise<void> {
    return probeTier({
      loop,
      tier: () => tier,
      stopped: () => destroyed,
      fallback: options.onFallback,
      apply(next) {
        tier = next;
        renderer.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
        renderer.setSize(stage.clientWidth, stage.clientHeight, false);
        document.documentElement.dataset.tier = tier;
        bus.emit({ type: 'tier:changed', tier });
        loop.invalidate();
      },
    });
  }

  function onScroll(): void {
    ambient.markActivity();
    if (options.shot !== undefined) return;
    const goal = liftPosition(window.scrollY, travels);
    lastGoal = goal;
    rig.setGoal(goal, motion.camera === 'cut');
    levels.update(rig.position, goal);
    loop.setContinuous('camera', true);
    loop.invalidate();
  }

  function onStageResize(): void {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    rig.resize({ width: stage.clientWidth, height: stage.clientHeight });
    loop.invalidate();
  }

  /** Content reflowed (rotation, fonts): re-measure. src/ui/floor-keeper.ts keeps the floor. */
  function onLayoutChange(): void {
    travels = measureTravels(document);
    onScroll();
  }

  const unbindPage = bindPage(document, stage, renderer.domElement, {
    onScroll,
    onStageResize,
    onLayoutChange,
    onVisibility(hidden) {
      if (hidden) loop.stop();
      else {
        loop.start();
        loop.invalidate();
      }
    },
    onContextLost: options.onFallback,
  });

  rig.setGoal(lastGoal, true);
  levels.update(rig.position, lastGoal, options.shot !== undefined ? 0 : 1);
  loop.start();
  loop.invalidate();

  const uninstallDebug = options.debug
    ? installDebugHandle({
        renderer,
        scene,
        position: () => rig.position,
        tier: () => tier,
        ready: () => levels.ready(),
        frames: () => frames,
        sources: () =>
          Object.fromEntries(
            levels
              .ready()
              .map((i) => [i, String(levels.asset(i)?.root.userData.source ?? 'greybox')]),
          ),
      })
    : () => {};

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      unbindPage();
      levels.dispose();
      void castLibrary.then((library) => library?.dispose());
      ambient.dispose();
      for (const item of shared.keep) (item as { dispose?: () => void }).dispose?.();
      unbindEvents();
      hotspots.dispose();
      capsules.mesh.removeFromParent();
      capsules.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.dataset.state = 'poster';
      uninstallDebug();
    },
  };
}
