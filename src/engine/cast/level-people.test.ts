import { AnimationClip, Bone, Group, NumberKeyframeTrack, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import type { CastLibrary } from './cast-library';
import { populateLevel } from './level-people';

function fakeLibrary(): CastLibrary {
  const clip = new AnimationClip('idle', 1, [
    new NumberKeyframeTrack('torso.position[x]', [0, 1], [0, 1]),
  ]);
  return {
    clips: new Map([['idle', clip]]),
    characters: ['guest'],
    spawn(character) {
      if (character !== 'guest') return null;
      const person = new Group();
      const torso = new Bone();
      torso.name = 'torso';
      person.add(torso);
      return person;
    },
    dispose() {},
  };
}

function anchors(): Map<string, Object3D> {
  const slot = new Object3D();
  slot.userData = { character: 'guest' };
  const ghost = new Object3D();
  ghost.userData = { character: 'nobody' };
  return new Map([
    ['cast__sofa', slot],
    ['cast__ghost', ghost],
  ]);
}

describe('populateLevel', () => {
  it('spawns known people at their anchors once the cast arrives', async () => {
    let ready = 0;
    const map = anchors();
    const people = populateLevel(map, Promise.resolve(fakeLibrary()), () => {
      ready += 1;
    });
    expect(people.actors).toHaveLength(0);
    await Promise.resolve();
    await Promise.resolve();
    expect(people.actors).toHaveLength(1);
    expect(map.get('cast__sofa')?.children).toHaveLength(1);
    expect(ready).toBe(1);
  });

  it('advances the clips by the time between updates', async () => {
    const people = populateLevel(anchors(), Promise.resolve(fakeLibrary()));
    await Promise.resolve();
    await Promise.resolve();
    const torso = people.actors[0]?.root.children[0];
    const start = torso?.position.x ?? 0;
    people.update(10);
    people.update(10.05);
    // The clip loops every second and maps time to x one to one.
    expect(torso?.position.x ?? 0).toBeCloseTo((start + 0.05) % 1);
  });

  it('caps one step at 0.1 s so a long pause does not jump the pose', async () => {
    const people = populateLevel(anchors(), Promise.resolve(fakeLibrary()));
    await Promise.resolve();
    await Promise.resolve();
    const torso = people.actors[0]?.root.children[0];
    const start = torso?.position.x ?? 0;
    people.update(10);
    people.update(70);
    expect(torso?.position.x ?? 0).toBeCloseTo((start + 0.1) % 1);
  });

  it('works without a cast and removes people on dispose', async () => {
    expect(populateLevel(anchors(), Promise.resolve(null)).actors).toHaveLength(0);
    const map = anchors();
    const people = populateLevel(map, Promise.resolve(fakeLibrary()));
    await Promise.resolve();
    await Promise.resolve();
    people.dispose();
    expect(map.get('cast__sofa')?.children).toHaveLength(0);
    expect(people.actors).toHaveLength(0);
  });

  it('does not spawn into a level disposed before the cast arrived', async () => {
    const map = anchors();
    const people = populateLevel(map, Promise.resolve(fakeLibrary()));
    people.dispose();
    await Promise.resolve();
    await Promise.resolve();
    expect(map.get('cast__sofa')?.children).toHaveLength(0);
  });
});
