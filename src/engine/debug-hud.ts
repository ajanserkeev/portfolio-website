import type { TowerDebug } from './debug-handle';

export interface HudStats {
  fps: number;
  tier: string;
  position: number;
  ready: readonly number[];
  drawCalls: number;
  triangles: number;
}

export function formatHud(stats: HudStats): string {
  return [
    `fps ${Math.round(stats.fps)}`,
    `tier ${stats.tier}`,
    `lift ${stats.position.toFixed(2)}`,
    `levels ${stats.ready.join(',') || '—'}`,
    `calls ${stats.drawCalls}`,
    `tris ${(stats.triangles / 1000).toFixed(1)}k`,
  ].join(' · ');
}

/** Small overlay for device testing (?debug=1). FPS counts rendered frames, so scroll while measuring. */
export function mountDebugHud(
  parent: HTMLElement,
  read: () => TowerDebug | undefined = () => window.__tower,
): () => void {
  const element = document.createElement('div');
  element.style.cssText =
    'position:fixed;left:8px;bottom:8px;z-index:9;padding:4px 8px;border-radius:6px;' +
    'background:rgba(28,27,34,.85);color:#f3ebdd;font:12px/1.4 ui-monospace,monospace;pointer-events:none';
  parent.append(element);
  let lastFrames = read()?.frames ?? 0;
  let lastTime = performance.now();
  const timer = window.setInterval(() => {
    const tower = read();
    if (!tower) return;
    const now = performance.now();
    const fps = ((tower.frames - lastFrames) * 1000) / Math.max(1, now - lastTime);
    lastFrames = tower.frames;
    lastTime = now;
    element.textContent = formatHud({
      fps,
      tier: tower.tier,
      position: tower.position,
      ready: tower.ready,
      drawCalls: tower.drawCalls,
      triangles: tower.triangles,
    });
  }, 500);
  return () => {
    window.clearInterval(timer);
    element.remove();
  };
}
