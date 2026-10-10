export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? Number.NaN;
  return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] ?? Number.NaN) + upper) / 2;
}

/** Collects `count` frame intervals (ms) after skipping `warmup` frames. */
export function sampleFrameIntervals(
  count: number,
  warmup = 10,
  request: (callback: (timeMs: number) => void) => number = requestAnimationFrame,
): Promise<number[]> {
  return new Promise((resolve) => {
    const intervals: number[] = [];
    let last: number | null = null;
    let seen = 0;
    const step = (time: number) => {
      seen += 1;
      if (last !== null && seen > warmup) intervals.push(time - last);
      last = time;
      if (intervals.length >= count) resolve(intervals);
      else request(step);
    };
    request(step);
  });
}
