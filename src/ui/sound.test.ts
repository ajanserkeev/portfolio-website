import { beforeEach, describe, expect, it } from 'vitest';
import { createSoundManager } from './sound';

describe('SoundManager', () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
    } catch {}
  });

  it('is disabled by default', () => {
    const sound = createSoundManager();
    expect(sound.isEnabled()).toBe(false);
  });

  it('can be enabled and toggled, persisting state in sessionStorage', () => {
    const sound = createSoundManager();
    expect(sound.toggle()).toBe(true);
    expect(sound.isEnabled()).toBe(true);

    try {
      expect(sessionStorage.getItem('tower_sound_enabled')).toBe('true');
    } catch {}

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
    try {
      sessionStorage.setItem('tower_sound_enabled', 'true');
    } catch {}
    const sound = createSoundManager();
    expect(sound.isEnabled()).toBe(true);
  });
});
