import { describe, expect, it } from 'vitest';
import { parseBuildArgs } from './build-args';

describe('parseBuildArgs', () => {
  it('reads the level and defaults to a final bake', () => {
    expect(parseBuildArgs(['agents'])).toEqual({ level: 'agents', draft: false, noBake: false });
  });

  it('reads flags in any order', () => {
    expect(parseBuildArgs(['--draft', 'test-room', '--no-bake'])).toEqual({
      level: 'test-room',
      draft: true,
      noBake: true,
    });
  });

  it('rejects a missing level, unknown flags and bad ids', () => {
    expect(() => parseBuildArgs([])).toThrow(/level/);
    expect(() => parseBuildArgs(['agents', '--turbo'])).toThrow(/--turbo/);
    expect(() => parseBuildArgs(['Agents Floor'])).toThrow(/a-z/);
  });
});
