import { bus } from '../engine/events';

export type SoundEffect = 'click' | 'chime' | 'whoosh' | 'hum';

const STORAGE_KEY = 'tower_sound_enabled';

export interface SoundManager {
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  toggle(): boolean;
  play(effect: SoundEffect): void;
}

export function createSoundManager(): SoundManager {
  let enabled = false;

  try {
    if (typeof sessionStorage !== 'undefined') {
      enabled = sessionStorage.getItem(STORAGE_KEY) === 'true';
    }
  } catch {
    enabled = false;
  }

  let ctx: AudioContext | null = null;

  function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!ctx) {
      try {
        ctx = new AudioCtx();
      } catch {
        ctx = null;
      }
    }

    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  function setEnabled(val: boolean) {
    enabled = val;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, val ? 'true' : 'false');
      }
    } catch {}

    if (val) {
      getAudioContext();
    }
  }

  function play(effect: SoundEffect) {
    if (!enabled) return;
    const context = getAudioContext();
    if (!context) return;

    try {
      const now = context.currentTime;

      if (effect === 'click') {
        // High crisp micro-click
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else if (effect === 'chime') {
        // Dual harmonic elevator chime (C5 & E5)
        for (const freq of [523.25, 659.25]) {
          const osc = context.createOscillator();
          const gain = context.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
          osc.connect(gain);
          gain.connect(context.destination);
          osc.start(now);
          osc.stop(now + 0.5);
        }
      } else if (effect === 'whoosh') {
        // Pneumatic capsule whoosh
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (effect === 'hum') {
        // Low mechanical hum
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(65, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio errors should never crash UI
    }
  }

  return {
    isEnabled: () => enabled,
    setEnabled,
    toggle: () => {
      const next = !enabled;
      setEnabled(next);
      if (next) play('chime');
      return next;
    },
    play,
  };
}

export const sound = createSoundManager();

// Link sound manager to bus events if running in browser
if (typeof window !== 'undefined') {
  bus.on('level:reached', () => sound.play('chime'));
  bus.on('capsule:selected', () => sound.play('whoosh'));
  bus.on('hotspot:activated', () => sound.play('click'));
}
