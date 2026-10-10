import { describe, expect, it } from 'vitest';
import { formatHud } from './debug-hud';

describe('formatHud', () => {
  it('shows the numbers testers need on one line', () => {
    expect(
      formatHud({
        fps: 59.6,
        tier: 'high',
        position: 2.345,
        ready: [1, 2, 3],
        drawCalls: 24,
        triangles: 41_234,
      }),
    ).toBe('fps 60 · tier high · lift 2.35 · levels 1,2,3 · calls 24 · tris 41.2k');
  });

  it('shows a dash when no level is ready', () => {
    expect(
      formatHud({ fps: 0, tier: 'lite', position: 0, ready: [], drawCalls: 0, triangles: 0 }),
    ).toContain('levels —');
  });
});
