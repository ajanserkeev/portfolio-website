import type { Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { createReactionTimer, createTapCounter } from '../interaction/reactions';
import { faceUvOffset } from './faces';
import { parseActivity, type RobotActivity, reactionPose, robotPose } from './robot-pose';

/** How long a tapped robot reacts, and how many taps in a row it takes to annoy it. */
const REACTION_SECONDS = 1.2;
const ANNOYED_AT = 5;
const TAP_WINDOW_SECONDS = 4;
/** Longest gap one frame may advance a reaction by (the floor may have been idle). */
const MAX_STEP_SECONDS = 0.1;

/** Robot roots carry extras.role === 'robot' (set by the factory's build_robot). */
export function findRobots(root: Object3D): Object3D[] {
  const robots: Object3D[] = [];
  root.traverse((node) => {
    if (/^dyn__[a-z0-9-]+$/.test(node.name) && node.userData.role === 'robot') robots.push(node);
  });
  return robots;
}

export class RobotActor {
  private readonly root: Object3D;
  private readonly baseY: number;
  private readonly seed: number;
  private readonly activity: RobotActivity;
  private readonly head: Object3D | undefined;
  private readonly armL: Object3D | undefined;
  private readonly armR: Object3D | undefined;
  private readonly faceTexture: Texture | null;
  private readonly faceMaterial: MeshBasicMaterial | null;
  private readonly reaction = createReactionTimer(REACTION_SECONDS);
  private readonly taps = createTapCounter(TAP_WINDOW_SECONDS);
  private annoyed = false;
  private lastTime: number | undefined;

  constructor(root: Object3D, faces: MeshBasicMaterial, seed: number) {
    this.root = root;
    this.baseY = root.position.y;
    this.seed = seed;
    this.activity = parseActivity(root.userData.activity);
    const part = (name: string) => root.getObjectByName(`${root.name}__${name}`);
    this.head = part('head');
    this.armL = part('arm-l');
    this.armR = part('arm-r');
    const face = part('face') as Mesh | undefined;
    if (face && faces.map) {
      // Clones share the image (Texture.source), so this costs no extra GPU memory.
      this.faceTexture = faces.map.clone();
      this.faceMaterial = faces.clone();
      this.faceMaterial.map = this.faceTexture;
      face.material = this.faceMaterial;
    } else {
      this.faceTexture = null;
      this.faceMaterial = null;
    }
  }

  /** A tap: hop and smile; the fifth tap in a row gets an annoyed look instead. */
  react(nowSeconds: number = performance.now() / 1000): void {
    this.annoyed = this.taps.tap(nowSeconds) >= ANNOYED_AT;
    this.reaction.trigger();
  }

  update(timeSec: number): void {
    const step = this.lastTime === undefined ? 0 : timeSec - this.lastTime;
    this.lastTime = timeSec;
    this.reaction.update(Math.min(Math.max(step, 0), MAX_STEP_SECONDS));
    const own = robotPose(timeSec, this.seed, this.activity);
    const pose = this.reaction.active
      ? reactionPose(own, this.reaction.progress, this.annoyed)
      : own;
    this.root.position.y = this.baseY + pose.hover;
    if (this.head) {
      this.head.rotation.y = pose.headYaw;
      this.head.rotation.x = pose.headPitch;
    }
    if (this.armL) this.armL.rotation.x = pose.armL;
    if (this.armR) this.armR.rotation.x = pose.armR;
    if (this.faceTexture) {
      const offset = faceUvOffset(pose.face);
      this.faceTexture.offset.set(offset.x, offset.y);
    }
  }

  dispose(): void {
    this.faceMaterial?.dispose();
    this.faceTexture?.dispose();
  }
}
