export interface BuildArgs {
  level: string;
  draft: boolean;
  noBake: boolean;
}

export function parseBuildArgs(argv: readonly string[]): BuildArgs {
  const flags = new Set(argv.filter((arg) => arg.startsWith('--')));
  for (const flag of flags) {
    if (flag !== '--draft' && flag !== '--no-bake') throw new Error(`unknown flag ${flag}`);
  }
  const level = argv.find((arg) => !arg.startsWith('--'));
  if (!level) throw new Error('usage: pnpm art:build <level> [--draft] [--no-bake]');
  if (!/^[a-z][a-z0-9-]*$/.test(level))
    throw new Error(`level id "${level}": use a-z, 0-9 and "-"`);
  return { level, draft: flags.has('--draft'), noBake: flags.has('--no-bake') };
}
