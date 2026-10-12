import { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { castPlacements } from './casting';

function anchor(extras: Record<string, unknown>, x = 0, yawRad = 0): Object3D {
  const node = new Object3D();
  node.position.set(x, 0, 1);
  node.rotation.y = yawRad;
  node.userData = extras;
  return node;
}

describe('castPlacements', () => {
  it('reads people from cast__ anchors only, with their clip, speed and facing', () => {
    const anchors = new Map<string, Object3D>([
      [
        'cast__desk-1',
        anchor({ character: 'founder-lead', clip: 'type', speed: 1.2 }, 2, Math.PI / 2),
      ],
      ['station-op-1', anchor({ character: 'ignored' })],
    ]);
    const [placement, ...rest] = castPlacements(anchors);
    expect(rest).toEqual([]);
    expect(placement?.slot).toBe('desk-1');
    expect(placement?.character).toBe('founder-lead');
    expect(placement?.clip).toBe('type');
    expect(placement?.speed).toBe(1.2);
    expect(placement?.node.position.x).toBe(2);
  });

  it('defaults to idle at normal speed', () => {
    const [placement] = castPlacements(new Map([['cast__guest', anchor({ character: 'guest' })]]));
    expect(placement?.clip).toBe('idle');
    expect(placement?.speed).toBe(1);
  });

  it('skips a slot without a character instead of throwing', () => {
    expect(castPlacements(new Map([['cast__empty', anchor({})]]))).toEqual([]);
  });
});
