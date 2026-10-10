import {
  CapsuleGeometry,
  Color,
  InstancedMesh,
  type Material,
  MeshBasicMaterial,
  Object3D,
} from 'three';
import { tower as defaultTower, levelBaseY, type TowerConfig } from '../config';
import { type CapsuleChannel, CHANNEL_COLORS, type LaunchCapsuleOptions } from './types';

export const MAX_CAPSULES = 64;

export interface CapsulePool {
  readonly mesh: InstancedMesh;
  setPersonalCapsule(liftPosition: number, channel?: CapsuleChannel): void;
  launchCapsule(options?: LaunchCapsuleOptions, currentTimeSec?: number): void;
  update(timeSec: number, liftPosition?: number): void;
  readonly activeCount: number;
  dispose(): void;
}

interface ActiveFlight {
  fromY: number;
  toY: number;
  startSec: number;
  durationSec: number;
  colorHex: string;
}

export function createCapsulePool(
  towerConfig: TowerConfig = defaultTower,
  customMaterial?: Material,
): CapsulePool {
  const radius = Math.min(0.09, towerConfig.tube.radius * 0.45);
  const length = 0.28;
  const geometry = new CapsuleGeometry(radius, length, 4, 8);
  const material = customMaterial ?? new MeshBasicMaterial({ color: 0xffffff });

  const mesh = new InstancedMesh(geometry, material, MAX_CAPSULES);
  mesh.name = 'dyn__capsules';

  const dummy = new Object3D();
  const colorHelper = new Color();

  let personalLiftPos = 0;
  let personalChannel: CapsuleChannel = 'default';
  const flights: ActiveFlight[] = [];

  function updatePersonalMatrix(): void {
    const baseY = levelBaseY(personalLiftPos, towerConfig);
    const targetY = baseY + 1.5;

    dummy.position.set(towerConfig.tube.x, targetY, towerConfig.tube.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(0, dummy.matrix);

    const hex = CHANNEL_COLORS[personalChannel];
    colorHelper.set(hex);
    mesh.setColorAt(0, colorHelper);
  }

  // Initialize instance 0
  updatePersonalMatrix();

  // Hide the rest by default
  dummy.scale.set(0, 0, 0);
  dummy.position.set(0, -9999, 0);
  dummy.updateMatrix();
  for (let i = 1; i < MAX_CAPSULES; i++) {
    mesh.setMatrixAt(i, dummy.matrix);
  }

  mesh.count = 1;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  function setPersonalCapsule(liftPosition: number, channel?: CapsuleChannel): void {
    personalLiftPos = liftPosition;
    if (channel) personalChannel = channel;
    updatePersonalMatrix();
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function launchCapsule(options?: LaunchCapsuleOptions, currentTimeSec = 0): void {
    if (flights.length >= MAX_CAPSULES - 1) return; // reached pool capacity

    const channel = options?.channel ?? 'default';
    const hex = options?.color ?? CHANNEL_COLORS[channel];
    const fromY = options?.fromY ?? levelBaseY(0, towerConfig) + 2.0;
    const toY = options?.toY ?? levelBaseY(towerConfig.levels.length - 1, towerConfig);
    const durationSec = Math.max(0.1, options?.durationSec ?? 2.5);

    flights.push({
      fromY,
      toY,
      startSec: currentTimeSec,
      durationSec,
      colorHex: hex,
    });
  }

  function update(timeSec: number, liftPosition?: number): void {
    if (liftPosition !== undefined) {
      personalLiftPos = liftPosition;
    }
    updatePersonalMatrix();

    // Update transient flights
    let activeFlightsCount = 0;
    const alive: ActiveFlight[] = [];

    for (const flight of flights) {
      const elapsed = timeSec - flight.startSec;
      if (elapsed >= flight.durationSec) {
        continue; // finished
      }

      alive.push(flight);
      const progress = Math.max(0, Math.min(1, elapsed / flight.durationSec));
      const currentY = flight.fromY + (flight.toY - flight.fromY) * progress;

      const instanceIdx = 1 + activeFlightsCount;
      dummy.position.set(towerConfig.tube.x, currentY, towerConfig.tube.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(instanceIdx, dummy.matrix);

      colorHelper.set(flight.colorHex);
      mesh.setColorAt(instanceIdx, colorHelper);

      activeFlightsCount++;
    }

    flights.length = 0;
    flights.push(...alive);

    mesh.count = 1 + activeFlightsCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }

  function dispose(): void {
    geometry.dispose();
    material.dispose();
    flights.length = 0;
  }

  return {
    get mesh() {
      return mesh;
    },
    setPersonalCapsule,
    launchCapsule,
    update,
    get activeCount() {
      return 1 + flights.length;
    },
    dispose,
  };
}
