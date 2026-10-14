import { AnimationClip, Bone, Group, NumberKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { createActor } from './actor';

/** A one-bone rig: 'idle' leans the torso to x = 1 over a second, 'wave' to x = -1. */
function rig() {
  const root = new Group();
  const torso = new Bone();
  torso.name = 'torso';
  root.add(torso);
  const clip = (name: string, to: number) =>
    new AnimationClip(name, 1, [new NumberKeyframeTrack('torso.position[x]', [0, 1], [0, to])]);
  const clips = new Map([
    ['idle', clip('idle', 1)],
    ['wave', clip('wave', -1)],
  ]);
  return { root, torso, clips };
}

describe('createActor', () => {
  it('poses the first frame at once, then plays the clip as time passes', () => {
    const { root, torso, clips } = rig();
    const actor = createActor(root, clips, { clip: 'idle', speed: 1, phase: 0 });
    expect(torso.position.x).toBeCloseTo(0);
    actor.update(0.5);
    expect(torso.position.x).toBeCloseTo(0.5);
  });

  it('runs faster with a higher speed and starts at its phase', () => {
    const { root, torso, clips } = rig();
    const actor = createActor(root, clips, { clip: 'idle', speed: 2, phase: 0.25 });
    expect(torso.position.x).toBeCloseTo(0.25);
    actor.update(0.25);
    expect(torso.position.x).toBeCloseTo(0.75);
  });

  it('switches clips and falls back to idle for an unknown clip', () => {
    const { root, torso, clips } = rig();
    const actor = createActor(root, clips, { clip: 'dance', speed: 1, phase: 0 });
    actor.update(0.5);
    expect(torso.position.x).toBeCloseTo(0.5);
    actor.play('wave');
    actor.update(0.5);
    expect(torso.position.x).toBeCloseTo(-0.5);
    expect(actor.clip).toBe('wave');
  });

  it('stops moving after dispose', () => {
    const { root, torso, clips } = rig();
    const actor = createActor(root, clips, { clip: 'idle', speed: 1, phase: 0 });
    actor.update(0.2);
    actor.dispose();
    const x = torso.position.x;
    actor.update(0.5);
    expect(torso.position.x).toBe(x);
  });

  it('reacts with a clip for a while, then returns to its own clip', () => {
    const { root, clips } = rig();
    const actor = createActor(root, clips, { clip: 'idle', speed: 1, phase: 0 });
    actor.react('wave', 2);
    expect(actor.clip).toBe('wave');
    actor.update(1.5);
    // A second tap extends the wave rather than starting another one.
    actor.react('wave', 2);
    actor.update(1.5);
    expect(actor.clip).toBe('wave');
    actor.update(0.6);
    expect(actor.clip).toBe('idle');
  });

  it('lets the floor take over in the middle of a reaction', () => {
    const { root, clips } = rig();
    const actor = createActor(root, clips, { clip: 'wave', speed: 1, phase: 0 });
    actor.react('idle', 2);
    actor.play('wave');
    expect(actor.clip).toBe('wave');
    actor.update(3);
    expect(actor.clip).toBe('wave');
  });
});
