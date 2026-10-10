import type { Page } from '@playwright/test';

export interface TowerState {
  position: number;
  tier: string;
  ready: number[];
  drawCalls: number;
  triangles: number;
  frames: number;
}

export function towerState(page: Page): Promise<TowerState | null> {
  return page.evaluate(() => {
    const t = (window as unknown as { __tower?: TowerState }).__tower;
    return t
      ? {
          position: t.position,
          tier: t.tier,
          ready: [...t.ready],
          drawCalls: t.drawCalls,
          triangles: t.triangles,
          frames: t.frames,
        }
      : null;
  });
}

export async function liftAt(page: Page): Promise<number> {
  return (await towerState(page))?.position ?? -1;
}
