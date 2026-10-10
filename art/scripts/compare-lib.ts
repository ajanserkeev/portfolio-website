export interface RawImage {
  data: Uint8Array;
  width: number;
  height: number;
  channels: number;
}

function meanLuminance(image: RawImage, x0: number, y0: number, x1: number, y1: number): number {
  let sum = 0;
  let count = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * image.width + x) * image.channels;
      sum +=
        0.2126 * (image.data[i] ?? 0) +
        0.7152 * (image.data[i + 1] ?? 0) +
        0.0722 * (image.data[i + 2] ?? 0);
      count += 1;
    }
  }
  return count === 0 ? 0 : sum / count / 255;
}

/** Absolute difference of mean luminance (0..1) per grid cell, row by row. */
export function gridLuminanceDiff(a: RawImage, b: RawImage, grid = 3): number[] {
  if (a.width !== b.width || a.height !== b.height) throw new Error('images differ in size');
  const diffs: number[] = [];
  for (let gy = 0; gy < grid; gy += 1) {
    for (let gx = 0; gx < grid; gx += 1) {
      const x0 = Math.floor((gx * a.width) / grid);
      const x1 = Math.floor(((gx + 1) * a.width) / grid);
      const y0 = Math.floor((gy * a.height) / grid);
      const y1 = Math.floor(((gy + 1) * a.height) / grid);
      diffs.push(Math.abs(meanLuminance(a, x0, y0, x1, y1) - meanLuminance(b, x0, y0, x1, y1)));
    }
  }
  return diffs;
}
