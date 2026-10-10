import {
  DataTexture,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  RGBAFormat,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
} from 'three';

export interface SharedTextures {
  matcap: Texture;
  screens: Texture;
  faces: Texture;
}

export interface SharedMaterials {
  matcap: MeshMatcapMaterial;
  screens: MeshBasicMaterial;
  glow: MeshBasicMaterial;
  faces: MeshBasicMaterial;
  /** Resources shared by all levels: never disposed together with one level. */
  keep: ReadonlySet<object>;
}

export function createSharedMaterials(textures: SharedTextures): SharedMaterials {
  const matcap = new MeshMatcapMaterial({ matcap: textures.matcap, vertexColors: true });
  const screens = new MeshBasicMaterial({ map: textures.screens });
  const glow = new MeshBasicMaterial({ vertexColors: true });
  const faces = new MeshBasicMaterial({ map: textures.faces });
  const keep = new Set<object>([
    matcap,
    screens,
    glow,
    faces,
    textures.matcap,
    textures.screens,
    textures.faces,
  ]);
  return { matcap, screens, glow, faces, keep };
}

export function whiteTexture(): Texture {
  const texture = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
  texture.needsUpdate = true;
  return texture;
}

/** Atlases use glTF UVs (flipY = false); the matcap is a regular image (flipY = true). */
export async function loadSharedTextures(
  urls: { matcap?: string; screens?: string; faces?: string },
  loader: Pick<TextureLoader, 'loadAsync'> = new TextureLoader(),
): Promise<SharedTextures> {
  const load = async (url: string | undefined, flipY: boolean): Promise<Texture> => {
    if (!url) return whiteTexture();
    try {
      const texture = await loader.loadAsync(url);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = flipY;
      texture.needsUpdate = true;
      return texture;
    } catch (error) {
      console.warn('[tower] shared texture failed, using white', url, error);
      return whiteTexture();
    }
  };
  const [matcap, screens, faces] = await Promise.all([
    load(urls.matcap, true),
    load(urls.screens, false),
    load(urls.faces, false),
  ]);
  return { matcap, screens, faces };
}
