import type { Mesh, MeshBasicMaterial, Object3D, Texture } from 'three';
import { faceUvOffset } from './faces';
import { parseActivity, type RobotActivity, robotPose } from './robot-pose';

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

  update(timeSec: number): void {
    const pose = robotPose(timeSec, this.seed, this.activity);
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
