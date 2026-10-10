import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { tower } from '../config';
import { createCapsulePool, MAX_CAPSULES } from './capsule-pool';

describe('CapsulePool', () => {
  it('creates an InstancedMesh with at most 64 instances', () => {
    const pool = createCapsulePool(tower);
    expect(pool.mesh.isInstancedMesh).toBe(true);
    expect(pool.mesh.instanceMatrix.count).toBeLessThanOrEqual(MAX_CAPSULES);
    expect(pool.mesh.count).toBeGreaterThanOrEqual(1); // personal capsule active
    pool.dispose();
  });

  it('positions personal capsule (index 0) along tube coordinates matching lift', () => {
    const pool = createCapsulePool(tower);

    // lift = 0 (roof): floor Y = 0, capsule Y = 1.5
    pool.setPersonalCapsule(0);

    const mat = new Matrix4();
    pool.mesh.getMatrixAt(0, mat);

    const pos = new Vector3();
    pos.setFromMatrixPosition(mat);

    expect(pos.x).toBeCloseTo(tower.tube.x, 2);
    expect(pos.z).toBeCloseTo(tower.tube.z, 2);
    expect(pos.y).toBeCloseTo(1.5, 2);

    // lift = 2 (crm): floor Y = -8, capsule Y = -6.5
    pool.setPersonalCapsule(2);
    pool.mesh.getMatrixAt(0, mat);
    pos.setFromMatrixPosition(mat);

    expect(pos.x).toBeCloseTo(tower.tube.x, 2);
    expect(pos.z).toBeCloseTo(tower.tube.z, 2);
    expect(pos.y).toBeCloseTo(-8 + 1.5, 2);

    pool.dispose();
  });

  it('launches a transient capsule that moves from fromY to toY and completes', () => {
    const pool = createCapsulePool(tower);

    pool.launchCapsule(
      {
        channel: 'telegram',
        fromY: 0,
        toY: -10,
        durationSec: 2.0,
      },
      0.0,
    );

    expect(pool.activeCount).toBe(2); // personal (1) + transient (1)

    // at t = 1.0 (50% progress): Y should be around -5.0
    pool.update(1.0);

    const mat = new Matrix4();
    pool.mesh.getMatrixAt(1, mat);
    const pos = new Vector3();
    pos.setFromMatrixPosition(mat);

    expect(pos.y).toBeCloseTo(-5.0, 1);
    expect(pool.activeCount).toBe(2);

    // at t = 2.0 (100% progress): transient capsule finished and removed
    pool.update(2.0);
    expect(pool.activeCount).toBe(1);

    pool.dispose();
  });

  it('updates personal capsule channel color', () => {
    const pool = createCapsulePool(tower);
    pool.setPersonalCapsule(1, 'whatsapp');

    // Instance color buffer exists
    expect(pool.mesh.instanceColor).toBeDefined();

    pool.dispose();
  });
});
