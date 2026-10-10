import type { Material, Mesh, Object3D } from 'three';
import type { SharedMaterials } from './materials/shared';

/** Assigns runtime materials by node name (contract 3.2) and collects anchors and hit boxes. */
export function prepareLevel(
  root: Object3D,
  baked: Material,
  shared: SharedMaterials,
): { anchors: Map<string, Object3D>; hits: Object3D[] } {
  const anchors = new Map<string, Object3D>();
  const hits: Object3D[] = [];
  root.traverse((node) => {
    const name = node.name;
    if (name.startsWith('anchor__')) {
      anchors.set(name.slice('anchor__'.length), node);
      return;
    }
    if (name.startsWith('hit__')) {
      node.visible = false;
      hits.push(node);
      return;
    }
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    if (name === 'static') mesh.material = baked;
    else if (name === 'screens') mesh.material = shared.screens;
    else if (name === 'glow') mesh.material = shared.glow;
    else if (name.startsWith('dyn__') && name.endsWith('__face')) mesh.material = shared.faces;
    else if (name.startsWith('dyn__')) mesh.material = shared.matcap;
  });
  return { anchors, hits };
}
