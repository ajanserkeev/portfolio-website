import { type Object3D, SRGBColorSpace, type Texture, TextureLoader } from 'three';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { findRobots, RobotActor } from './actors/robot';
import { seedFrom } from './actors/robot-pose';
import type { CastLibrary } from './cast/cast-library';
import { castPlacements } from './cast/casting';
import { populateLevel } from './cast/level-people';
import { levelBaseY, type TowerConfig, tower } from './config';
import { prepareLevel } from './glb-level';
import { disposeObject3D, type LevelSource } from './level-asset';
import { createBasementController } from './levels/basement';
import { createBookingController } from './levels/booking';
import { createCrmController } from './levels/crm';
import { createRoofController } from './levels/roof';
import { createWorkshopController } from './levels/workshop';
import { createBakedMaterial } from './materials/baked';
import type { SharedMaterials } from './materials/shared';

export interface LevelFiles {
  glb: string;
  lightmap: string;
}

/** Pairs '<id>.glb' with '<id>.lightmap.webp' from an import.meta.glob result. */
export function levelFilesFromGlob(urls: Record<string, string>): Map<string, LevelFiles> {
  const glbs = new Map<string, string>();
  const lightmaps = new Map<string, string>();
  for (const [path, url] of Object.entries(urls)) {
    const file = path.split('/').pop() ?? '';
    const lightmap = /^([a-z0-9-]+)\.lightmap\.webp$/.exec(file);
    const glb = /^([a-z0-9-]+)\.glb$/.exec(file);
    if (lightmap?.[1]) lightmaps.set(lightmap[1], url);
    else if (glb?.[1]) glbs.set(glb[1], url);
  }
  const files = new Map<string, LevelFiles>();
  for (const [id, glb] of glbs) {
    const lightmap = lightmaps.get(id);
    if (lightmap) files.set(id, { glb, lightmap });
  }
  return files;
}

export interface GlbLoaders {
  loadGltf(url: string): Promise<{ scene: Object3D }>;
  loadTexture(url: string): Promise<Texture>;
}

export function defaultLoaders(): GlbLoaders {
  const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textures = new TextureLoader();
  return { loadGltf: (url) => gltf.loadAsync(url), loadTexture: (url) => textures.loadAsync(url) };
}

/** People for the floors (contract 3.2.1). `onReady` fires when they appear on a floor. */
export interface CastHooks {
  library: Promise<CastLibrary | null>;
  onReady?: () => void;
}

const NO_CAST: CastHooks = { library: Promise.resolve(null) };

export function createGlbSource(
  files: ReadonlyMap<string, LevelFiles>,
  shared: SharedMaterials,
  loaders: GlbLoaders = defaultLoaders(),
  cfg: TowerConfig = tower,
  cast: CastHooks = NO_CAST,
): LevelSource {
  return async (index, signal) => {
    const id = cfg.levels[index]?.id;
    const entry = id ? files.get(id) : undefined;
    if (!id || !entry) throw new Error(`no built assets for level ${id ?? index}`);
    const [gltf, lightmap] = await Promise.all([
      loaders.loadGltf(entry.glb),
      loaders.loadTexture(entry.lightmap),
    ]);
    const root = gltf.scene;
    if (signal.aborted) {
      disposeObject3D(root, shared.keep);
      lightmap.dispose();
      throw new Error(`level ${id} aborted`);
    }
    lightmap.colorSpace = SRGBColorSpace;
    lightmap.flipY = false;
    lightmap.needsUpdate = true;
    root.name = `level.${id}`;
    root.position.y = levelBaseY(index, cfg);
    root.userData.source = 'glb';
    const baked = createBakedMaterial(lightmap);
    const { anchors, hits } = prepareLevel(root, baked, shared);
    const robots = findRobots(root);
    const actors = robots.map((robot) => new RobotActor(robot, shared.faces, seedFrom(robot.name)));
    const robotTaps = robots.map((robot, i) => ({
      id: robot.name.replace(/^dyn__/, ''),
      object: robot,
      react: () => actors[i]?.react(),
    }));
    const people = populateLevel(anchors, cast.library, cast.onReady);
    const roofCtrl = id === 'roof' ? createRoofController({ root }) : undefined;
    const crmCtrl = id === 'crm' ? createCrmController({ root }) : undefined;
    const bookingCtrl = id === 'booking' ? createBookingController({ root }) : undefined;
    const workshopCtrl = id === 'workshop' ? createWorkshopController({ root }) : undefined;
    const basementCtrl = id === 'basement' ? createBasementController({ root, people }) : undefined;
    const hasUpdate =
      actors.length > 0 ||
      castPlacements(anchors).length > 0 ||
      roofCtrl !== undefined ||
      crmCtrl !== undefined ||
      bookingCtrl !== undefined ||
      workshopCtrl !== undefined ||
      basementCtrl !== undefined;

    return {
      root,
      anchors,
      hits,
      get tappables() {
        return [...robotTaps, ...people.tappables];
      },
      update: hasUpdate
        ? (timeSec: number) => {
            for (const actor of actors) actor.update(timeSec);
            people.update(timeSec);
            roofCtrl?.update(timeSec);
            crmCtrl?.update(timeSec);
            bookingCtrl?.update(timeSec);
            workshopCtrl?.update(timeSec);
            basementCtrl?.update(timeSec);
          }
        : undefined,
      dispose: () => {
        roofCtrl?.dispose();
        crmCtrl?.dispose();
        bookingCtrl?.dispose();
        workshopCtrl?.dispose();
        basementCtrl?.dispose();
        for (const actor of actors) actor.dispose();
        // People share geometry with the cast library: detach them before disposing the floor.
        people.dispose();
        disposeObject3D(root, shared.keep);
        baked.dispose();
        lightmap.dispose();
      },
    };
  };
}
