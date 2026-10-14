import type { Material, Object3D } from 'three';
import { needleAngleDeg } from '../../ui/elevator';
import { createDoors } from './doors';
import { buildElevatorModel, type ElevatorDims, type ElevatorModel } from './elevator-model';

export interface ElevatorController {
  /** 0 shut … 1 open. */
  readonly openness: number;
  /** Moves the cabin, the doors and the needle; returns true while the doors are sliding. */
  update(dtSeconds: number, position: number, settled: boolean): boolean;
}

/** How close to a whole floor the lift must stand for the doors to open. */
const AT_FLOOR = 0.01;

export function createElevator(
  model: ElevatorModel,
  options: Omit<ElevatorDims, 'shaft'> & { instant?: boolean },
): ElevatorController {
  const doors = createDoors({ instant: options.instant });
  let openness = 0;
  return {
    get openness() {
      return openness;
    },
    update(dtSeconds, position, settled) {
      model.cabin.position.y = -position * options.levelHeight;
      const atFloor = settled && Math.abs(position - Math.round(position)) < AT_FLOOR;
      if (atFloor) doors.open();
      else doors.close();
      openness = doors.update(dtSeconds);
      const slide = model.doorRest + model.doorTravel * openness;
      model.doorLeft.position.x = -slide;
      model.doorRight.position.x = slide;
      // The needle points up at rest: -90° (roof) turns it left, +90° (basement) right.
      model.needle.rotation.z = (-needleAngleDeg(position, options.levels) * Math.PI) / 180;
      return doors.moving;
    },
  };
}

/** Builds the lift, adds the shaft and the cabin to `scene` and drives them. */
export function mountElevator(
  scene: Object3D,
  dims: ElevatorDims,
  material: Material,
  instant: boolean,
): ElevatorController & {
  readonly cabinY: number;
  showLevels: ElevatorModel['showLevels'];
  dispose(): void;
} {
  const model = buildElevatorModel(dims, material);
  scene.add(model.shaft, model.cabin);
  const controller = createElevator(model, { ...dims, instant });
  return {
    get openness() {
      return controller.openness;
    },
    get cabinY() {
      return model.cabin.position.y;
    },
    update: controller.update,
    showLevels: model.showLevels,
    dispose() {
      model.shaft.removeFromParent();
      model.cabin.removeFromParent();
      model.dispose();
    },
  };
}
