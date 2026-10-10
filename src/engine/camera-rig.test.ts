import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { cameraPose } from './camera-path';
import { CameraRig } from './camera-rig';
import { tower } from './config';
import { computeFraming } from './framing';

const viewport = { width: 390, height: 844 };

describe('CameraRig', () => {
  it('starts looking at the roof', () => {
    const rig = new CameraRig(tower, viewport);
    const pose = cameraPose(0, computeFraming(viewport, tower.camera, tower.level), tower);
    const toTarget = new Vector3(...pose.target).sub(rig.camera.position).normalize();
    const looking = rig.camera.getWorldDirection(new Vector3());
    expect(looking.dot(toTarget)).toBeCloseTo(1, 6);
  });

  it('glides toward the goal and then settles exactly', () => {
    const rig = new CameraRig(tower, viewport);
    rig.setGoal(2);
    expect(rig.update(0.016)).toBe(true);
    expect(rig.position).toBeGreaterThan(0);
    let steps = 0;
    while (rig.update(0.016) && steps < 600) steps += 1;
    expect(rig.position).toBe(2);
    expect(rig.settled).toBe(true);
    expect(rig.update(0.016)).toBe(false);
  });

  it('cuts straight to the goal when asked', () => {
    const rig = new CameraRig(tower, viewport);
    rig.setGoal(3, true);
    expect(rig.position).toBe(3);
  });

  it('is frame-rate independent', () => {
    const a = new CameraRig(tower, viewport);
    const b = new CameraRig(tower, viewport);
    a.setGoal(2);
    b.setGoal(2);
    a.update(0.008);
    a.update(0.008);
    b.update(0.016);
    expect(a.position).toBeCloseTo(b.position, 9);
  });

  it('applies the portrait view offset on resize', () => {
    const rig = new CameraRig(tower, { width: 1440, height: 900 });
    rig.resize(viewport);
    expect(rig.camera.aspect).toBeCloseTo(390 / 844, 10);
    expect(rig.camera.view?.offsetY ?? 0).toBeGreaterThan(0);
  });

  it('drops the view offset in centered (shot) mode', () => {
    const rig = new CameraRig(tower, viewport);
    expect(rig.camera.view?.enabled).toBe(true);
    rig.setCentered(true);
    expect(rig.camera.view?.enabled ?? false).toBe(false);
  });
});
