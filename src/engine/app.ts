import { Color, DirectionalLight, HemisphereLight, Scene, WebGLRenderer } from 'three';
import { CameraRig } from './camera-rig';
import { tower } from './config';
import { bus } from './events';
import { median, sampleFrameIntervals } from './fps-probe';
import { greyboxSource } from './greybox';
import type { LevelSource } from './level-asset';
import { LevelManager } from './level-manager';
import { liftPosition, type Travel } from './lift';
import { RenderLoop } from './loop';
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

  const rig = new CameraRig(tower, { width: stage.clientWidth, height: stage.clientHeight });
  let travels: Travel[] = measureTravels(document);
  let lastGoal = liftPosition(window.scrollY, travels);

  const loop = new RenderLoop(renderFrame);
  const levels = new LevelManager(
    scene,
    options.source ?? greyboxSource,
    tower.levels.length,
    () => {
      const animated = levels.ready().some((i) => levels.asset(i)?.update !== undefined);
      loop.setContinuous('ambient', motion.ambient && animated);
      loop.invalidate();
    },
  );

  function renderFrame(dt: number, timeMs: number): void {
    const moving = rig.update(dt);
    levels.update(rig.position);
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
    const goal = liftPosition(window.scrollY, travels);
    lastGoal = goal;
    rig.setGoal(goal, motion.camera === 'cut');
    levels.update(goal);
    loop.setContinuous('camera', true);
    loop.invalidate();
  }

  function onStageResize(): void {
    renderer.setSize(stage.clientWidth, stage.clientHeight, false);
    rig.resize({ width: stage.clientWidth, height: stage.clientHeight });
    loop.invalidate();
  }

  /** Content reflowed (rotation, fonts): re-measure, and keep the visitor on the same floor. */
  function onLayoutChange(): void {
    // The old travels are stale after a reflow, so use the last goal computed before it.
    const before = Math.round(lastGoal);
    travels = measureTravels(document);
    const after = Math.round(liftPosition(window.scrollY, travels));
    if (after !== before) {
      const id = tower.levels[before]?.id;
      if (id) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
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
  levels.update(rig.position);
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
      loseContext: () => renderer.getContext().getExtension('WEBGL_lose_context')?.loseContext(),
    };
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
      renderer.dispose();
      renderer.domElement.remove();
      stage.dataset.state = 'poster';
      if (options.debug) delete window.__tower;
    },
  };
}
