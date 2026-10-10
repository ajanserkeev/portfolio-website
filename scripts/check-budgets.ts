import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { type Budget, closure, overBudget, parseImports, resolveSpecifier } from './budgets.ts';

const DIST = 'dist';
const KB = 1024;

const read = (file: string) => readFileSync(join(DIST, file));
const gz = (file: string) => gzipSync(read(file), { level: 9 }).length;
const imports = (file: string) => parseImports(read(file).toString('utf8'));

const html = read('index.html').toString('utf8');
const scriptEntries = [...html.matchAll(/<script[^>]*type="module"[^>]*src="([^"]+)"/g)].map(
  (match) => resolveSpecifier('index.html', match[1] ?? ''),
);
const inlineImports = [...html.matchAll(/<script[^>]*type="module"[^>]*>([\s\S]*?)<\/script>/g)]
  .flatMap((match) => parseImports(match[1] ?? '').static)
  .map((specifier) => resolveSpecifier('index.html', specifier));
const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) =>
  resolveSpecifier('index.html', match[1] ?? ''),
);

const initial = closure([...scriptEntries, ...inlineImports], (file) =>
  imports(file).static.map((spec) => resolveSpecifier(file, spec)),
);
const lazyEntries = [...initial].flatMap((file) =>
  imports(file).dynamic.map((spec) => resolveSpecifier(file, spec)),
);
const lazy = closure(lazyEntries, (file) =>
  imports(file).static.map((spec) => resolveSpecifier(file, spec)),
);
for (const file of initial) lazy.delete(file);

const sum = (files: Iterable<string>) => [...files].reduce((total, file) => total + gz(file), 0);
const budgets: Budget[] = [
  {
    name: 'HTML + CSS + JS before 3D',
    limitBytes: 120 * KB,
    actualBytes: gzipSync(html, { level: 9 }).length + sum(styles) + sum(initial),
  },
  { name: '3D engine JS (lazy)', limitBytes: 200 * KB, actualBytes: sum(lazy) },
];

for (const budget of budgets) {
  const kb = (bytes: number) => `${(bytes / KB).toFixed(1)} KB`;
  console.log(`${budget.name}: ${kb(budget.actualBytes)} / ${kb(budget.limitBytes)} gzip`);
}
const failed = overBudget(budgets);
if (failed.length > 0) {
  console.error(`Over budget: ${failed.map((budget) => budget.name).join(', ')}`);
  process.exit(1);
}
