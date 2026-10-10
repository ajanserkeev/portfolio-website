import { describe, expect, it } from 'vitest';
import fixtures from '../../scene/camera-fixtures.json';
import { cameraPose } from './camera-path';
import { tower } from './config';
import { computeFraming } from './framing';

const framing = computeFraming({ width: 390, height: 844 }, tower.camera, tower.level);
const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[1] ?? 0) - (b[1] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));

describe('cameraPose', () => {
  it('looks at the roof target at position 0', () => {
    expect(cameraPose(0, framing, tower).target).toEqual([0, tower.camera.targetHeight, 0]);
  });

  it('drops one level-height per level', () => {
    const pose = cameraPose(2, framing, tower);
    expect(pose.target[1]).toBeCloseTo(tower.camera.targetHeight - 2 * tower.level.height, 10);
  });

  it('stays exactly at the framing distance when standing at a level', () => {
    const pose = cameraPose(3, framing, tower);
    expect(distance(pose.position, pose.target)).toBeCloseTo(framing.distance, 9);
  });

  it('pulls back in the middle of a travel', () => {
    const pose = cameraPose(1.5, framing, tower);
    expect(distance(pose.position, pose.target)).toBeCloseTo(
      framing.distance * (1 + tower.camera.travelBulge),
      9,
    );
  });

  it('sits in front of and above the target', () => {
    const pose = cameraPose(1, framing, tower);
    expect(pose.position[2]).toBeGreaterThan(0);
    expect(pose.position[1]).toBeGreaterThan(pose.target[1]);
  });

  it('clamps out-of-range and NaN positions', () => {
    const last = tower.levels.length - 1;
    expect(cameraPose(-3, framing, tower)).toEqual(cameraPose(0, framing, tower));
    expect(cameraPose(99, framing, tower)).toEqual(cameraPose(last, framing, tower));
    expect(cameraPose(Number.NaN, framing, tower)).toEqual(cameraPose(0, framing, tower));
  });

  it('matches the shared fixtures used by the Python factory', () => {
    for (const fixture of fixtures.cases) {
      const caseFraming = computeFraming(fixture.viewport, tower.camera, tower.level);
      const pose = cameraPose(fixture.lift, caseFraming, tower);
      for (const [i, value] of pose.position.entries()) {
        expect(value).toBeCloseTo(fixture.position[i] ?? 0, 6);
      }
      for (const [i, value] of pose.target.entries()) {
        expect(value).toBeCloseTo(fixture.target[i] ?? 0, 6);
      }
    }
  });
});
