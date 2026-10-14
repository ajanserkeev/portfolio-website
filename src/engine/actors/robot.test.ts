import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { faceUvOffset } from './faces';
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

describe('RobotActor.react', () => {
  const faces = new MeshBasicMaterial({ map: new Texture() });
  const faceOffset = (root: Object3D) =>
    ((root.getObjectByName('dyn__op-1__face') as Mesh).material as MeshBasicMaterial).map?.offset;

  it('hops for 1.2 s when tapped, then goes back to work', () => {
    const root = robot();
    const actor = new RobotActor(root, faces, 1);
    actor.update(10);
    const restY = root.position.y;
    actor.react(100);
    for (const t of [10.1, 10.2, 10.3, 10.4, 10.5, 10.6]) actor.update(t);
    expect(root.position.y).toBeGreaterThan(restY + 0.1);
    expect(faceOffset(root)?.toArray()).toEqual([faceUvOffset('happy').x, faceUvOffset('happy').y]);
    for (let t = 10.7; t < 12; t += 0.1) actor.update(t);
    expect(Math.abs(root.position.y - restY)).toBeLessThan(0.1);
  });

  it('gets annoyed on the fifth tap in a row', () => {
    const root = robot();
    const actor = new RobotActor(root, faces, 1);
    for (const now of [100, 100.5, 101, 101.5, 102]) actor.react(now);
    actor.update(0);
    actor.update(0.1);
    expect(faceOffset(root)?.toArray()).toEqual([
      faceUvOffset('annoyed').x,
      faceUvOffset('annoyed').y,
    ]);
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
