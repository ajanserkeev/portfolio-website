import {
  type AnimationClip,
  type Bone,
  type Material,
  type Mesh,
  MeshMatcapMaterial,
  type Object3D,
  type SkinnedMesh,
  type Texture,
} from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';

/** The people of src/assets/cast.glb (contract 3.2.1), loaded once and cloned per placement. */
export interface CastLibrary {
  readonly clips: ReadonlyMap<string, AnimationClip>;
  readonly characters: readonly string[];
  /** A new person (shares geometry, material and clips with every other copy), or null. */
  spawn(character: string): Object3D | null;
  dispose(): void;
}

const MEMBER = /^cast__([a-z0-9-]+)$/;

/**
 * `cast__<id>` skeletons by id. GLTFLoader renames repeated node names (`torso_1`…); the clips
 * address the original names and each clone has its own mixer, so the suffixes are dropped.
 */
export function castTemplates(scene: Object3D): Map<string, Object3D> {
  const templates = new Map<string, Object3D>();
  for (const node of scene.children) {
    const id = MEMBER.exec(node.name)?.[1];
    if (!id) continue;
    node.traverse((child) => {
      if ((child as Bone).isBone) child.name = child.name.replace(/_\d+$/, '');
    });
    templates.set(id, node);
  }
  return templates;
}

/** Loads the cast; resolves to null (and logs) if the file is missing, so floors work without people. */
export async function loadCastLibrary(url: string, matcap: Texture): Promise<CastLibrary | null> {
  try {
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
    const templates = castTemplates(gltf.scene);
    const meshes: SkinnedMesh[] = [];
    gltf.scene.traverse((node) => {
      if ((node as SkinnedMesh).isSkinnedMesh) meshes.push(node as SkinnedMesh);
    });
    // One material for everyone: the palette texture (faces, clothes) lit like the robots.
    const map = (meshes[0]?.material as Material & { map?: Texture | null })?.map ?? null;
    const material = new MeshMatcapMaterial({ matcap, map });
    for (const mesh of meshes) {
      (mesh.material as Material).dispose();
      mesh.material = material;
      mesh.frustumCulled = false; // skinned bounds do not follow the pose
    }
    const clips = new Map(gltf.animations.map((clip) => [clip.name, clip]));
    return {
      clips,
      characters: [...templates.keys()],
      spawn(character) {
        const template = templates.get(character);
        if (!template) return null;
        const person = clone(template);
        person.userData.castMember = character;
        return person;
      },
      dispose() {
        for (const mesh of meshes) (mesh as Mesh).geometry.dispose();
        material.dispose();
        map?.dispose();
      },
    };
  } catch (error) {
    console.warn('[tower] cast unavailable, floors run without people', error);
    return null;
  }
}
