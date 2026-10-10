export const FACE_FRAMES = [
  'neutral',
  'happy',
  'blink',
  'focus',
  'surprised',
  'annoyed',
  'sleepy',
  'love',
] as const;
export type FaceFrame = (typeof FACE_FRAMES)[number];

export const FACE_GRID = { cols: 4, rows: 2, cell: 128 } as const;

/** UV offset moving a face mesh mapped to cell 0 onto `frame` (glTF UVs: origin at the top-left). */
export function faceUvOffset(frame: FaceFrame): { x: number; y: number } {
  const index = FACE_FRAMES.indexOf(frame);
  return {
    x: (index % FACE_GRID.cols) / FACE_GRID.cols,
    y: Math.floor(index / FACE_GRID.cols) / FACE_GRID.rows,
  };
}
