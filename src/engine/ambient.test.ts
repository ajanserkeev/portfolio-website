import { MeshBasicMaterial } from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAmbientManager } from './ambient';
import type { MotionPolicy } from './tiers';

describe('AmbientManager', () => {
  let glowMaterial: MeshBasicMaterial;
  const fullMotion: MotionPolicy = { camera: 'smooth', ambient: true };
  const reducedMotion: MotionPolicy = { camera: 'cut', ambient: false };

  beforeEach(() => {
    glowMaterial = new MeshBasicMaterial({ vertexColors: true });
    glowMaterial.color.setRGB(1, 1, 1);
  });

  describe('reduced motion policy', () => {
    it('disables ambient life when ambient is false', () => {
      const cb = vi.fn();
      const manager = createAmbientManager({
        motion: reducedMotion,
        glowMaterial,
      });
      manager.setAnimated(true);
      manager.register(cb);

      expect(manager.active).toBe(false);

      const updated = manager.update(100);
      expect(updated).toBe(false);
      expect(cb).not.toHaveBeenCalled();
      expect(glowMaterial.color.r).toBe(1);
      expect(glowMaterial.color.g).toBe(1);
      expect(glowMaterial.color.b).toBe(1);
    });

    it('resets glow material and turns inactive when switching to reduced motion', () => {
      const onActiveChange = vi.fn();
      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
        onActiveChange,
      });
      manager.setAnimated(true);
      expect(manager.active).toBe(true);
      expect(onActiveChange).toHaveBeenCalledWith(true);

      // Run an update to alter glow color
      manager.update(500);
      expect(glowMaterial.color.r).not.toBe(1);

      // Switch to reduced motion
      manager.setMotion(reducedMotion);
      expect(manager.active).toBe(false);
      expect(onActiveChange).toHaveBeenCalledWith(false);
      expect(glowMaterial.color.r).toBe(1);
      expect(glowMaterial.color.g).toBe(1);
      expect(glowMaterial.color.b).toBe(1);
    });

    it('reacts to media query change event', () => {
      let triggerChange: (matches: boolean) => void = () => {};
      const fakeMediaQuery = {
        matches: false,
        addEventListener: (_event: string, fn: (e: { matches: boolean }) => void) => {
          triggerChange = (matches: boolean) => fn({ matches });
        },
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList;

      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
        mediaQuery: fakeMediaQuery,
      });
      manager.setAnimated(true);
      expect(manager.active).toBe(true);

      // Trigger reduced motion media query event
      triggerChange(true);
      expect(manager.active).toBe(false);
      expect(glowMaterial.color.r).toBe(1);
    });
  });

  describe('idle throttling to 30 FPS', () => {
    it('runs at full rate while active', () => {
      const cb = vi.fn();
      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
        idleAfterMs: 3000,
        idleFps: 30,
      });
      manager.setAnimated(true);
      manager.register(cb);

      manager.markActivity(0);

      // 60 FPS updates: every ~16ms
      expect(manager.update(16)).toBe(true);
      expect(manager.update(32)).toBe(true);
      expect(manager.update(48)).toBe(true);
      expect(cb).toHaveBeenCalledTimes(3);
      expect(manager.isIdle).toBe(false);
    });

    it('throttles to 30 FPS after inactivity', () => {
      const cb = vi.fn();
      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
        idleAfterMs: 3000,
        idleFps: 30,
      });
      manager.setAnimated(true);
      manager.register(cb);

      manager.markActivity(0);

      // Advance past idle threshold
      const idleTime = 4000;
      expect(manager.update(idleTime)).toBe(true);
      expect(manager.isIdle).toBe(true);

      // 16ms later: closer than 33.3ms (1000 / 30) -> should be throttled
      expect(manager.update(idleTime + 16)).toBe(false);
      expect(cb).toHaveBeenCalledTimes(1);

      // 34ms after last update -> should pass
      expect(manager.update(idleTime + 35)).toBe(true);
      expect(cb).toHaveBeenCalledTimes(2);
    });

    it('exits idle immediately when visitor activity is marked', () => {
      const cb = vi.fn();
      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
        idleAfterMs: 3000,
        idleFps: 30,
      });
      manager.setAnimated(true);
      manager.register(cb);

      manager.markActivity(0);
      expect(manager.update(4000)).toBe(true);
      expect(manager.isIdle).toBe(true);

      // Mark activity at 4010
      manager.markActivity(4010);
      expect(manager.isIdle).toBe(false);

      // Update at 4016 (only 16ms after 4000) should now pass because not idle!
      expect(manager.update(4016)).toBe(true);
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('LED blinking and pulse', () => {
    it('modulates glow material color when active', () => {
      const manager = createAmbientManager({
        motion: fullMotion,
        glowMaterial,
      });
      manager.setAnimated(true);

      manager.update(0);
      const r0 = glowMaterial.color.r;

      manager.update(500);
      const r500 = glowMaterial.color.r;

      // Color should vary over time
      expect(r0).toBeGreaterThan(0);
      expect(r500).toBeGreaterThan(0);
      expect(r0).not.toBe(r500);
    });
  });
});
