import { Color, DirectionalLight, HemisphereLight, Scene, WebGLRenderer } from 'three';
import { levelFiles, textureUrl } from './assets';
import { CameraRig } from './camera-rig';
import { tower } from './config';
import { bus } from './events';
import { median, sampleFrameIntervals } from './fps-probe';
import { createGlbSource } from './glb-source';
import { greyboxSource } from './greybox';
import { createHotspotManager } from './interaction/hotspots';
import { type LevelSource, withFallback } from './level-asset';
import { LevelManager } from './level-manager';
import { liftPosition, type Travel } from './lift';
import { RenderLoop } from './loop';
import { createSharedMaterials, loadSharedTextures } from './materials/shared';
import { measureTravels } from './scroll-binding';
import { adjustTierByFps, type MotionPolicy, pixelRatioFor, type Tier } from './tiers';

export type LiveTier = Exclude<Tier, 'static'>;

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

export interface TowerDebug {
  readonly position: number;
  readonly tier: LiveTier;
  readonly ready: number[];
  readonly drawCalls: number;
  readonly triangles: number;
  readonly frames: number;
  readonly sources: Record<number, string>;
  loseContext(): void;
}

declare global {
  interface Window {
    __tower?: TowerDebug;
  }
}

export async function startTower(options: StartOptions): Promise<TowerHandle> {
  const { stage, motion } = options;
  let tier = options.tier;
  let frames = 0;
  let live = false;
  let reached = -1;
  let destroyed = false;

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

  if (window.location.hash) {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
  }

  const rig = new CameraRig(tower, { width: stage.clientWidth, height: stage.clientHeight });
  if (options.shot !== undefined) {
    rig.setCentered(true);
    rig.setGoal(options.shot, true);
  }
  let travels: Travel[] = measureTravels(document);
  let lastGoal = options.shot ?? liftPosition(window.scrollY, travels);

  const shared = createSharedMaterials(
    await loadSharedTextures({
      matcap: textureUrl('matcap'),
      screens: textureUrl('screens'),
      faces: textureUrl('faces'),
    }),
  );
  const source = options.source ?? withFallback(createGlbSource(levelFiles, shared), greyboxSource);

  const loop = new RenderLoop(renderFrame);
  const hotspots = createHotspotManager({
    canvas: renderer.domElement,
    camera: rig.camera,
    bus,
  });
  const unbindDomHotspots = hotspots.bindDom(document);

  const levels = new LevelManager(scene, source, tower.levels.length, () => {
    for (let i = 0; i < tower.levels.length; i++) {
      const levelId = tower.levels[i]?.id;
      if (!levelId) continue;
      const asset = levels.asset(i);
      if (asset) {
        hotspots.registerLevel(levelId, asset.hits);
      } else {
        hotspots.unregisterLevel(levelId);
      }
    }
    const animated = levels.ready().some((i) => levels.asset(i)?.update !== undefined);
    loop.setContinuous('ambient', motion.ambient && animated);
    loop.invalidate();
  });

  function renderFrame(dt: number, timeMs: number): void {
    const moving = rig.update(dt);
    levels.update(rig.position, lastGoal, options.shot !== undefined ? 0 : 1);
    if (motion.ambient) {
      for (const index of levels.ready()) levels.asset(index)?.update?.(timeMs / 1000);
    }
    renderer.render(scene, rig.camera);
    frames += 1;
    bus.emit({ type: 'lift:moved', position: rig.position });
    announceLevel();
    if (!moving) loop.setContinuous('camera', false);
    if (!live && levels.ready().includes(Math.round(rig.position))) {
      live = true;
      stage.dataset.state = 'live';
      if (options.probeFps) void probe();
      if (options.shot !== undefined) {
        loop.invalidate(2);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            document.documentElement.dataset.shotReady = 'true';
          }),
        );
      }
    }
  }

  function announceLevel(): void {
    const nearest = Math.round(rig.position);
    if (nearest === reached || Math.abs(rig.position - nearest) > 0.05) return;
    reached = nearest;
    const id = tower.levels[nearest]?.id;
    if (id) bus.emit({ type: 'level:reached', level: id });
  }

  async function probe(): Promise<void> {
    for (let attempt = 0; attempt < 2 && !destroyed; attempt += 1) {
      loop.setContinuous('probe', true);
      const intervals = await sampleFrameIntervals(60);
      loop.setContinuous('probe', false);
      if (destroyed) return;
      const next = adjustTierByFps(tier, median(intervals));
      if (next === tier) return;
      if (next === 'static') {
        options.onFallback();
        return;
      }
      tier = next;
      renderer.setPixelRatio(pixelRatioFor(tier, window.devicePixelRatio));
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      document.documentElement.dataset.tier = tier;
      bus.emit({ type: 'tier:changed', tier });
      loop.invalidate();
    }
  }

  function onScroll(): void {
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

  function onVisibility(): void {
    if (document.hidden) loop.stop();
    else {
      loop.start();
      loop.invalidate();
    }
  }

  function onContextLost(event: Event): void {
    event.preventDefault();
    options.onFallback();
  }

  const stageObserver = new ResizeObserver(onStageResize);
  const layoutObserver = new ResizeObserver(onLayoutChange);
  stageObserver.observe(stage);
  const main = document.querySelector('main.tower');
  if (main) layoutObserver.observe(main);
  window.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);

  rig.setGoal(lastGoal, true);
  levels.update(rig.position, lastGoal, options.shot !== undefined ? 0 : 1);
  loop.start();
  loop.invalidate();

  if (options.debug) {
    window.__tower = {
      get position() {
        return rig.position;
      },
      get tier() {
        return tier;
      },
      get ready() {
        return levels.ready();
      },
      get drawCalls() {
        return renderer.info.render.calls;
      },
      get triangles() {
        return renderer.info.render.triangles;
      },
      get frames() {
        return frames;
      },
      get sources() {
        return Object.fromEntries(
          levels
            .ready()
            .map((i) => [i, String(levels.asset(i)?.root.userData.source ?? 'greybox')]),
        );
      },
      loseContext: () => renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
    };
    void import('./debug-hud').then(({ mountDebugHud }) => mountDebugHud(document.body));
  }

  return {
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      loop.stop();
      stageObserver.disconnect();
      layoutObserver.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      levels.dispose();
      for (const item of shared.keep) (item as { dispose?: () => void }).dispose?.();
      unbindDomHotspots();
      hotspots.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.dataset.state = 'poster';
      if (options.debug) delete window.__tower;
    },
  };
}
