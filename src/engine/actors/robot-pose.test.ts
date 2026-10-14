import { describe, expect, it } from 'vitest';
import { parseActivity, reactionPose, robotPose, seedFrom } from './robot-pose';

describe('reactionPose', () => {
  const base = robotPose(1, 1, 'typing');

  it('hops with both arms up and a happy face', () => {
    const pose = reactionPose(base, 0.5, false);
    expect(pose.hover).toBeGreaterThan(base.hover + 0.2);
    expect(pose.armL).toBeLessThan(-2);
    expect(pose.face).toBe('happy');
    expect(reactionPose(base, 0, false).hover).toBeCloseTo(base.hover);
  });

  it('shakes its head without a hop when annoyed', () => {
    const pose = reactionPose(base, 0.5, true);
    expect(pose.face).toBe('annoyed');
    expect(pose.hover).toBeCloseTo(base.hover);
  });
});

describe('robotPose', () => {
  it('is deterministic for the same time and seed', () => {
    expect(robotPose(3.21, 7, 'typing')).toEqual(robotPose(3.21, 7, 'typing'));
  });

  it('hovers within ±4 cm', () => {
    for (let t = 0; t < 20; t += 0.37) {
      expect(Math.abs(robotPose(t, 1, 'idle').hover)).toBeLessThanOrEqual(0.04 + 1e-12);
    }
  });

  it('blinks now and then but not all the time', () => {
    const faces = Array.from({ length: 400 }, (_, i) => robotPose(i * 0.05, 3, 'idle').face);
    const blinks = faces.filter((face) => face === 'blink').length;
    expect(blinks).toBeGreaterThan(0);
    expect(blinks).toBeLessThan(faces.length / 10);
  });

  it('raises both arms while typing', () => {
    const pose = robotPose(1, 2, 'typing');
    expect(pose.armL).toBeLessThan(-0.6);
    expect(pose.armR).toBeLessThan(-0.6);
  });
});

describe('parseActivity / seedFrom', () => {
  it('defaults unknown activities to idle', () => {
    expect(parseActivity('typing')).toBe('typing');
    expect(parseActivity('dancing')).toBe('idle');
    expect(parseActivity(undefined)).toBe('idle');
  });

  it('derives different stable seeds from names', () => {
    expect(seedFrom('dyn__op-1')).toBe(seedFrom('dyn__op-1'));
    expect(seedFrom('dyn__op-1')).not.toBe(seedFrom('dyn__op-2'));
  });
});
