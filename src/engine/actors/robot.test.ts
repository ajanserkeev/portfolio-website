import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { findRobots, RobotActor } from './robot';

function robot(name = 'dyn__op-1') {
  const root = new Group();
  root.name = name;
  root.userData = { role: 'robot', activity: 'typing' };
  for (const part of ['body', 'head', 'arm-l', 'arm-r']) {
    const node = new Object3D();
    node.name = `${name}__${part}`;
    root.add(node);
  }
  const face = new Mesh(new BoxGeometry(), new MeshBasicMaterial());
  face.name = `${name}__face`;
  root.getObjectByName(`${name}__head`)?.add(face);
  return root;
}

describe('RobotActor', () => {
  const faces = new MeshBasicMaterial({ map: new Texture() });

  it('moves the head and arms over time', () => {
    const root = robot();
    const actor = new RobotActor(root, faces, 1);
    actor.update(0.5);
    const armBefore = root.getObjectByName('dyn__op-1__arm-l')?.rotation.x;
    actor.update(0.6);
    expect(root.getObjectByName('dyn__op-1__arm-l')?.rotation.x).not.toBe(armBefore);
  });

  it('gives each robot its own face texture over the shared image', () => {
    const root = robot();
    new RobotActor(root, faces, 1);
    const face = root.getObjectByName('dyn__op-1__face') as Mesh;
    const material = face.material as MeshBasicMaterial;
    expect(material).not.toBe(faces);
    expect(material.map).not.toBe(faces.map);
    expect(material.map?.source).toBe(faces.map?.source);
  });
});

describe('findRobots', () => {
  it('finds robot roots by their extras', () => {
    const level = new Group();
    level.add(robot('dyn__op-1'), robot('dyn__op-2'));
    const prop = new Group();
    prop.name = 'dyn__lever';
    level.add(prop);
    expect(findRobots(level).map((r) => r.name)).toEqual(['dyn__op-1', 'dyn__op-2']);
  });
});
