import { describe, expect, it } from 'vitest';
import { FACE_FRAMES, faceUvOffset } from './faces';

describe('faceUvOffset', () => {
  it('keeps the neutral face at the origin cell', () => {
    expect(faceUvOffset('neutral')).toEqual({ x: 0, y: 0 });
  });

  it('walks right along the first row, then down to the second', () => {
    expect(faceUvOffset('blink')).toEqual({ x: 0.5, y: 0 });
    expect(faceUvOffset('surprised')).toEqual({ x: 0, y: 0.5 });
    expect(faceUvOffset('love')).toEqual({ x: 0.75, y: 0.5 });
  });

  it('has eight frames for a 4x2 atlas', () => {
    expect(FACE_FRAMES).toHaveLength(8);
  });
});
