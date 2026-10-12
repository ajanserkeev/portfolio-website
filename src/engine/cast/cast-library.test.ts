import { Bone, Group, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { castTemplates } from './cast-library';

function member(id: string, suffix: string): Object3D {
  const armature = new Group();
  armature.name = `cast__${id}`;
  for (const name of ['root', 'torso', 'arm-left']) {
    const bone = new Bone();
    bone.name = `${name}${suffix}`;
    armature.add(bone);
  }
  const mesh = new Object3D();
  mesh.name = `cast__${id}__mesh`;
  armature.add(mesh);
  return armature;
}

describe('castTemplates', () => {
  it('finds every member and restores bone names GLTFLoader made unique', () => {
    const scene = new Group();
    scene.add(member('founder', ''), member('guest', '_1'));
    const templates = castTemplates(scene);
    expect([...templates.keys()]).toEqual(['founder', 'guest']);
    const bones: string[] = [];
    templates.get('guest')?.traverse((node) => {
      if ((node as Bone).isBone) bones.push(node.name);
    });
    expect(bones).toEqual(['root', 'torso', 'arm-left']);
  });

  it('ignores the mesh nodes and anything outside the contract', () => {
    const scene = new Group();
    const stray = new Object3D();
    stray.name = 'Icosphere';
    scene.add(member('founder', ''), stray);
    expect([...castTemplates(scene).keys()]).toEqual(['founder']);
  });
});
