import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSoundManager } from './sound';

describe('SoundManager', () => {
  // Our own storage: Node 25+ has a built-in sessionStorage, Node 24 (CI) does not.
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      clear: () => data.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is disabled by default', () => {
    const sound = createSoundManager();
    expect(sound.isEnabled()).toBe(false);
  });

  it('can be enabled and toggled, persisting state in sessionStorage', () => {
    const sound = createSoundManager();
    expect(sound.toggle()).toBe(true);
    expect(sound.isEnabled()).toBe(true);

    expect(sessionStorage.getItem('tower_sound_enabled')).toBe('true');

    expect(sound.toggle()).toBe(false);
    expect(sound.isEnabled()).toBe(false);
  });

  it('does not throw when play() is called while disabled', () => {
    const sound = createSoundManager();
    expect(() => sound.play('click')).not.toThrow();
    expect(() => sound.play('chime')).not.toThrow();
    expect(() => sound.play('whoosh')).not.toThrow();
  });

  it('restores enabled state from sessionStorage', () => {
    sessionStorage.setItem('tower_sound_enabled', 'true');
    const sound = createSoundManager();
    expect(sound.isEnabled()).toBe(true);
  });
});
