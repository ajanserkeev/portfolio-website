import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const VENV = join('art', '.venv');
const python =
  process.platform === 'win32' ? join(VENV, 'Scripts', 'python.exe') : join(VENV, 'bin', 'python');

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(python)) {
  run(process.platform === 'win32' ? 'python' : 'python3', ['-m', 'venv', VENV]);
  run(python, ['-m', 'pip', 'install', '-r', join('art', 'requirements-dev.txt')]);
}
run(python, process.argv.slice(2));
