import { posix } from 'node:path';

const STATIC_IMPORT =
  /(?:^|[^.\w$])(?:import|export)\s*(?:[\w$*{},\s]+?\s*from\s*)?["']([^"']+\.js)["']/g;
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]([^"'`]+\.js)["'`]\s*\)/g;

export function parseImports(code: string): { static: string[]; dynamic: string[] } {
  return {
    static: [...code.matchAll(STATIC_IMPORT)].map((match) => match[1] ?? ''),
    dynamic: [...code.matchAll(DYNAMIC_IMPORT)].map((match) => match[1] ?? ''),
  };
}

/** Resolves an import specifier to a dist-relative POSIX path. */
export function resolveSpecifier(fromFile: string, specifier: string): string {
  if (specifier.startsWith('/')) return posix.normalize(specifier.slice(1));
  return posix.normalize(posix.join(posix.dirname(fromFile), specifier));
}

export function closure(entries: Iterable<string>, edges: (file: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...entries];
  while (stack.length > 0) {
    const file = stack.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    stack.push(...edges(file));
  }
  return seen;
}

export interface Budget {
  name: string;
  limitBytes: number;
  actualBytes: number;
}

export function overBudget(budgets: readonly Budget[]): Budget[] {
  return budgets.filter((budget) => budget.actualBytes > budget.limitBytes);
}
