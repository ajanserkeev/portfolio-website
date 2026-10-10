import { describe, expect, it } from 'vitest';
import { BLENDER_MISSING_MESSAGE, blenderArgs, type FindOptions, findBlender } from './blender';

function options(overrides: Partial<FindOptions>): FindOptions {
  return { env: {}, platform: 'win32', exists: () => false, listDir: () => [], ...overrides };
}

describe('findBlender', () => {
  it('prefers BLENDER_BIN', () => {
    const bin = 'D:\\Tools\\Blender\\blender.exe';
    expect(findBlender(options({ env: { BLENDER_BIN: bin }, exists: (p) => p === bin }))).toBe(bin);
  });

  it('finds Blender 4.5 under Program Files and ignores other versions', () => {
    const found = findBlender(
      options({
        env: { ProgramFiles: 'C:\\Program Files' },
        listDir: () => ['Blender 5.2', 'Blender 4.5'],
        exists: (p) => p.endsWith('blender.exe'),
      }),
    );
    expect(found).toBe('C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe');
  });

  it('returns null when Blender is missing', () => {
    expect(findBlender(options({}))).toBeNull();
  });
});

describe('blenderArgs', () => {
  it('runs headless, with factory settings, failing on Python errors', () => {
    expect(blenderArgs(['--python', 'a b/x.py'])).toEqual([
      '--background',
      '--factory-startup',
      '--python-exit-code',
      '1',
      '--python',
      'a b/x.py',
    ]);
  });
});

it('tells the user how to install Blender', () => {
  expect(BLENDER_MISSING_MESSAGE).toContain(
    'winget install --id BlenderFoundation.Blender.LTS.4.5',
  );
  expect(BLENDER_MISSING_MESSAGE).toContain('BLENDER_BIN');
});
