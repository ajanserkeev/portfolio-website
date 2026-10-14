import {
  BoxGeometry,
  type BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  type Material,
  Mesh,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface ShaftConfig {
  /** Centre of the shaft footprint (three.js coordinates). */
  x: number;
  z: number;
  width: number;
  depth: number;
}

export interface ElevatorDims {
  shaft: ShaftConfig;
  /** Height of one level (floor to floor). */
  levelHeight: number;
  levels: number;
}

export interface ElevatorModel {
  /** Brass cage, the full height of the tower: one draw call, trimmed by `showLevels`. */
  shaft: Mesh;
  /** Moves up and down; its origin is the cabin floor at the shaft centre. */
  cabin: Group;
  doorLeft: Mesh;
  doorRight: Mesh;
  /** Floor indicator needle above the doors; rotate around Z. */
  needle: Mesh;
  /** Door panel x offset when shut; the controller slides them out by `doorTravel`. */
  doorRest: number;
  doorTravel: number;
  /** Draws the cage only for the storeys of the loaded floors (none: hidden). */
  showLevels(ready: readonly number[]): void;
  dispose(): void;
}

const BRASS = '#c9a15b';
const BRASS_DARK = '#9c7535';
const INK = '#1c1b22';
const CREAM = '#fbf8f2';
const LINING = '#efe4cf';
const LAMP = '#fff3cf';

export const CABIN = { width: 0.95, depth: 0.95, height: 2.3 } as const;
/** How far the cage rises above the roof deck, plus its machine room. */
const ROOF_CLEARANCE = 2.8;
const MACHINE_ROOM = 0.5;

/** Paints a geometry one colour (vertex colours, sRGB hex → linear) and returns it non-indexed-safe. */
function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const color = new Color(hex);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) colors.set([color.r, color.g, color.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

function at(geometry: BufferGeometry, x: number, y: number, z: number): BufferGeometry {
  geometry.translate(x, y, z);
  return geometry;
}

function flat(geometry: BufferGeometry): BufferGeometry {
  if (!geometry.index) return geometry;
  const result = geometry.toNonIndexed();
  geometry.dispose();
  return result;
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  // RoundedBox/Box/Cylinder/Circle all carry position, normal and uv; colours are added above.
  const flats = parts.map(flat);
  const merged = mergeGeometries(flats);
  for (const part of flats) part.dispose();
  if (!merged) throw new Error('elevator: geometries do not share attributes');
  return merged;
}

/** One storey of the cage: four posts from `y0` to `y1` and a frame at both ends. */
function storey(s: ShaftConfig, y0: number, y1: number): BufferGeometry[] {
  const hx = s.width / 2 - 0.05;
  const hz = s.depth / 2 - 0.05;
  const parts: BufferGeometry[] = [];
  for (const [dx, dz] of [
    [-hx, -hz],
    [hx, -hz],
    [-hx, hz],
    [hx, hz],
  ] as const) {
    const post = new CylinderGeometry(0.045, 0.045, y1 - y0, 10);
    parts.push(painted(at(post, dx, (y0 + y1) / 2, dz), BRASS));
  }
  for (const y of [y0, y1]) {
    parts.push(painted(at(new BoxGeometry(s.width, 0.06, 0.06), 0, y, -hz), BRASS_DARK));
    parts.push(painted(at(new BoxGeometry(s.width, 0.06, 0.06), 0, y, hz), BRASS_DARK));
    parts.push(painted(at(new BoxGeometry(0.06, 0.06, s.depth), -hx, y, 0), BRASS_DARK));
    parts.push(painted(at(new BoxGeometry(0.06, 0.06, s.depth), hx, y, 0), BRASS_DARK));
  }
  return parts;
}

export function buildElevatorModel(dims: ElevatorDims, material: Material): ElevatorModel {
  const { shaft: s, levelHeight, levels } = dims;
  const top = ROOF_CLEARANCE;

  // Cage: a storey per level, top to bottom, so a draw range can show only the loaded floors.
  // The roof storey rises above the deck and carries the machine room.
  const storeys = Array.from({ length: levels }, (_, i) =>
    i === 0 ? storey(s, 0, top) : storey(s, -i * levelHeight, -(i - 1) * levelHeight),
  ).map((parts) => parts.map(flat));
  const roof = new RoundedBoxGeometry(s.width + 0.1, MACHINE_ROOM, s.depth + 0.1, 2, 0.05);
  storeys[0]?.push(flat(painted(at(roof, 0, top + MACHINE_ROOM / 2, 0), CREAM)));
  const starts = [0];
  for (const parts of storeys) {
    const count = parts.reduce((sum, part) => sum + part.getAttribute('position').count, 0);
    starts.push((starts.at(-1) ?? 0) + count);
  }
  const cage = storeys.flat();
  const shaft = new Mesh(merge(cage), material);
  shaft.position.set(s.x, 0, s.z);
  shaft.name = 'elevator.shaft';

  // Cabin body: ink floor and roof, a warm cream lining with a lamp and a handrail, brass jambs
  // and header around the doors, a dial face above them.
  const { width: w, depth: d, height: h } = CABIN;
  const front = d / 2;
  const body = [
    painted(at(new RoundedBoxGeometry(w, 0.08, d, 2, 0.02), 0, 0.04, 0), INK),
    painted(at(new RoundedBoxGeometry(w, 0.1, d, 2, 0.03), 0, h - 0.05, 0), INK),
    painted(at(new BoxGeometry(w * 0.5, 0.02, d * 0.5), 0, h - 0.11, 0), LAMP),
    painted(at(new BoxGeometry(w, h, 0.05), 0, h / 2, -front + 0.025), CREAM),
    painted(at(new BoxGeometry(0.05, h, d), -w / 2 + 0.025, h / 2, 0), LINING),
    painted(at(new BoxGeometry(0.05, h, d), w / 2 - 0.025, h / 2, 0), LINING),
    painted(at(new BoxGeometry(w * 0.8, 0.03, 0.03), 0, 0.95, -front + 0.08), BRASS),
    painted(at(new BoxGeometry(0.06, h, 0.06), -w / 2 + 0.03, h / 2, front), BRASS_DARK),
    painted(at(new BoxGeometry(0.06, h, 0.06), w / 2 - 0.03, h / 2, front), BRASS_DARK),
    painted(at(new BoxGeometry(w, 0.2, 0.05), 0, h - 0.2, front), BRASS),
    painted(at(new CircleGeometry(0.13, 20, 0, Math.PI), 0, h - 0.27, front + 0.03), CREAM),
  ];
  const cabin = new Group();
  cabin.name = 'elevator.cabin';
  cabin.position.set(s.x, 0, s.z);
  cabin.add(new Mesh(merge(body), material));

  const doorWidth = w / 2;
  const doorGeometry = painted(
    new RoundedBoxGeometry(doorWidth - 0.01, h - 0.32, 0.03, 2, 0.01),
    BRASS,
  );
  doorGeometry.translate(0, (h - 0.32) / 2 + 0.08, 0);
  const doorLeft = new Mesh(doorGeometry, material);
  const doorRight = new Mesh(doorGeometry, material);
  const doorRest = doorWidth / 2;
  for (const [door, side] of [
    [doorLeft, -1],
    [doorRight, 1],
  ] as const) {
    door.position.set(side * doorRest, 0, front + 0.02);
    cabin.add(door);
  }

  const needleGeometry = painted(new BoxGeometry(0.018, 0.11, 0.01), INK);
  needleGeometry.translate(0, 0.055, 0);
  const needle = new Mesh(needleGeometry, material);
  needle.position.set(0, h - 0.27, front + 0.04);
  cabin.add(needle);

  return {
    shaft,
    cabin,
    doorLeft,
    doorRight,
    needle,
    doorRest,
    doorTravel: doorWidth * 0.85,
    showLevels(ready) {
      if (ready.length === 0) {
        shaft.geometry.setDrawRange(0, 0);
        return;
      }
      const from = starts[Math.max(Math.min(...ready), 0)] ?? 0;
      const to = starts[Math.min(Math.max(...ready), levels - 1) + 1] ?? from;
      shaft.geometry.setDrawRange(from, Math.max(to - from, 0));
    },
    dispose() {
      shaft.geometry.dispose();
      (cabin.children[0] as Mesh).geometry.dispose();
      doorGeometry.dispose();
      needleGeometry.dispose();
    },
  };
}
