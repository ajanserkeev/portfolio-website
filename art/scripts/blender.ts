import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { posix, win32 } from 'node:path';

export const REQUIRED_BLENDER = '4.5';

export const BLENDER_MISSING_MESSAGE = [
  `Blender ${REQUIRED_BLENDER} LTS was not found.`,
  'Windows: winget install --id BlenderFoundation.Blender.LTS.4.5 -e',
  'Or set BLENDER_BIN to the full path of the blender executable.',
].join('\n');

export interface FindOptions {
  env: Record<string, string | undefined>;
  platform: NodeJS.Platform;
  exists: (path: string) => boolean;
  listDir: (path: string) => string[];
}

export function blenderCandidates(o: FindOptions): string[] {
  const candidates: string[] = [];
  if (o.env.BLENDER_BIN) candidates.push(o.env.BLENDER_BIN);
  if (o.platform === 'win32') {
    const base = win32.join(o.env.ProgramFiles ?? 'C:\\Program Files', 'Blender Foundation');
    let dirs: string[] = [];
    try {
      dirs = o.listDir(base);
    } catch {
      dirs = [];
    }
    for (const dir of dirs
      .filter((d) => d.includes(REQUIRED_BLENDER))
      .sort()
      .reverse()) {
      candidates.push(win32.join(base, dir, 'blender.exe'));
    }
  } else if (o.platform === 'darwin') {
    candidates.push('/Applications/Blender.app/Contents/MacOS/Blender');
  } else {
    candidates.push(posix.join('/usr', 'bin', 'blender'), '/snap/bin/blender');
  }
  return candidates;
}

export function findBlender(o: FindOptions): string | null {
  return blenderCandidates(o).find((path) => o.exists(path)) ?? null;
}

export function defaultFindOptions(): FindOptions {
  return {
    env: process.env,
    platform: process.platform,
    exists: existsSync,
    listDir: (path) => readdirSync(path),
  };
}

export function blenderArgs(args: readonly string[]): string[] {
  return ['--background', '--factory-startup', '--python-exit-code', '1', ...args];
}

/** Runs Blender without a shell: paths with spaces need no quoting. */
export function runBlender(
  bin: string,
  args: readonly string[],
  cwd = process.cwd(),
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, blenderArgs(args), { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Blender exited with code ${code}`)),
    );
  });
}

export function requireBlender(): string {
  const bin = findBlender(defaultFindOptions());
  if (!bin) {
    console.error(BLENDER_MISSING_MESSAGE);
    process.exit(1);
  }
  return bin;
}
