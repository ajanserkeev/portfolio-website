import { FACE_GRID, type FaceFrame } from '../../src/engine/actors/faces.ts';

type Eye = 'open' | 'closed' | 'happy' | 'wide' | 'half' | 'heart';
type Mouth = 'flat' | 'smile' | 'o' | 'frown' | 'none';

const LOOKS: Record<FaceFrame, { eye: Eye; mouth: Mouth }> = {
  neutral: { eye: 'open', mouth: 'flat' },
  happy: { eye: 'happy', mouth: 'smile' },
  blink: { eye: 'closed', mouth: 'flat' },
  focus: { eye: 'half', mouth: 'none' },
  surprised: { eye: 'wide', mouth: 'o' },
  annoyed: { eye: 'half', mouth: 'frown' },
  sleepy: { eye: 'closed', mouth: 'o' },
  love: { eye: 'heart', mouth: 'smile' },
};

const EYES: Record<Eye, string[]> = {
  open: ['.##.', '####', '####', '.##.'],
  closed: ['....', '....', '####', '....'],
  happy: ['.##.', '#..#', '....', '....'],
  wide: ['####', '#..#', '#..#', '####'],
  half: ['....', '####', '.##.', '....'],
  heart: ['#..#', '####', '.##.', '....'],
};

const MOUTHS: Record<Mouth, string[]> = {
  flat: ['......', '.####.', '......'],
  smile: ['#....#', '.####.', '......'],
  o: ['..##..', '.#..#.', '..##..'],
  frown: ['.####.', '#....#', '......'],
  none: ['......', '......', '......'],
};

const GRID = 16;

/** Lit pixels of a 16x16 pixel-art face: two eyes and a mouth. */
export function facePixels(frame: FaceFrame): Array<[number, number]> {
  const look = LOOKS[frame];
  const pixels: Array<[number, number]> = [];
  const stamp = (pattern: string[], ox: number, oy: number) => {
    pattern.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === '#') pixels.push([ox + x, oy + y]);
      });
    });
  };
  stamp(EYES[look.eye], 3, 4);
  stamp(EYES[look.eye], 9, 4);
  stamp(MOUTHS[look.mouth], 5, 10);
  return pixels;
}

export function faceSvg(frame: FaceFrame): string {
  const size = FACE_GRID.cell;
  const px = size / GRID;
  const lit = facePixels(frame)
    .map(
      ([x, y]) =>
        `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" rx="1.5" fill="#7ef2d8"/>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="18" fill="#15181f"/>${lit}</svg>`;
}
