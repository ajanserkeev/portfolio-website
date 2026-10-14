import type { Material, Mesh, Object3D, Texture } from 'three';

/** Someone on a floor who reacts to a tap: a person from the cast or a robot. */
export interface Tappable {
  /** Cast slot or robot name, e.g. `founder-lead`, `op-1`. */
  readonly id: string;
  readonly object: Object3D;
  react(): void;
}

export interface LevelAsset {
  readonly root: Object3D;
  /** Anchor nodes by name without the 'anchor__' prefix. */
  readonly anchors: ReadonlyMap<string, Object3D>;
  /** Invisible hit boxes for pointer interaction. */
  readonly hits: readonly Object3D[];
  /** People and robots that react to a tap (people appear once the cast has loaded). */
  readonly tappables?: readonly Tappable[];
  /** Per-frame animation of this level (robots and the like). */
  update?(timeSec: number): void;
  dispose(): void;
}

export type LevelSource = (index: number, signal: AbortSignal) => Promise<LevelAsset>;

function isTexture(value: unknown): value is Texture {
  return typeof value === 'object' && value !== null && (value as Texture).isTexture === true;
}

function disposeMaterial(material: Material, keep: ReadonlySet<object>): void {
  if (keep.has(material)) return;
  for (const value of Object.values(material)) {
    if (isTexture(value) && !keep.has(value)) value.dispose();
  }
  const uniforms = (material as { uniforms?: Record<string, { value: unknown }> }).uniforms;
  for (const uniform of Object.values(uniforms ?? {})) {
    if (isTexture(uniform.value) && !keep.has(uniform.value)) uniform.value.dispose();
  }
  material.dispose();
}

/** Frees GPU resources under `root`, except shared ones listed in `keep`. */
export function disposeObject3D(root: Object3D, keep: ReadonlySet<object> = new Set()): void {
  root.traverse((node) => {
    const mesh = node as Partial<Mesh>;
    if (mesh.geometry && !keep.has(mesh.geometry)) mesh.geometry.dispose();
    const material = mesh.material;
    const materials = material === undefined ? [] : Array.isArray(material) ? material : [material];
    for (const item of materials) disposeMaterial(item, keep);
  });
}

/** Uses `fallback` when `primary` fails (missing asset, network error). Aborts propagate. */
export function withFallback(primary: LevelSource, fallback: LevelSource): LevelSource {
  return async (index, signal) => {
    try {
      return await primary(index, signal);
    } catch (error) {
      if (signal.aborted) throw error;
      console.warn(`[tower] level ${index}: primary source failed, using fallback`, error);
      return fallback(index, signal);
    }
  };
}
