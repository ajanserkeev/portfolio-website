// Prints the Lighthouse CI results as GitHub annotations, so they show on the commit's checks
// without opening the job log. Usage: `pnpm tsx scripts/lighthouse-summary.ts` after `lhci autorun`.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizeLighthouse } from './lighthouse-summary-lib';

const dir = '.lighthouseci';
let files: string[] = [];
try {
  files = readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name));
} catch {
  // No reports: the summary says so.
}
const reports = files.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')));
for (const line of summarizeLighthouse(reports)) console.log(line);
