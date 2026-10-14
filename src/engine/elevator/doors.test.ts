import { describe, expect, it } from 'vitest';
import { createDoors } from './doors';

describe('createDoors', () => {
  it('starts closed and opens over openSeconds with an eased curve', () => {
    const doors = createDoors({ openSeconds: 0.6 });
    expect(doors.update(0)).toBe(0);
    doors.open();
    const quarter = doors.update(0.15);
    expect(quarter).toBeGreaterThan(0);
    expect(quarter).toBeLessThan(0.25); // ease-in: slower than linear at first
    expect(doors.update(0.15)).toBeCloseTo(0.5, 5);
    expect(doors.update(0.3)).toBe(1);
    expect(doors.update(1)).toBe(1);
  });

  it('closes from wherever they are', () => {
    const doors = createDoors({ openSeconds: 0.6 });
    doors.open();
    doors.update(0.3);
    doors.close();
    const next = doors.update(0.05);
    expect(next).toBeLessThan(0.5);
    expect(next).toBeGreaterThan(0.3);
    expect(doors.update(1)).toBe(0);
  });

  it('jumps straight to the target when instant (reduced motion)', () => {
    const doors = createDoors({ instant: true });
    doors.open();
    expect(doors.update(0)).toBe(1);
    doors.close();
    expect(doors.update(0)).toBe(0);
  });

  it('reports whether they are still moving', () => {
    const doors = createDoors({ openSeconds: 0.6 });
    expect(doors.moving).toBe(false);
    doors.open();
    expect(doors.moving).toBe(true);
    doors.update(1);
    expect(doors.moving).toBe(false);
  });
});
