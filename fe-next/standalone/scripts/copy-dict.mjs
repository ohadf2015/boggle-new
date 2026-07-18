// Copy the canonical gzipped dictionary into public/ so the bundle can ship it
// as a same-origin relative asset. Sourced from the main app's committed dict so
// the standalone never duplicates the 1.16MB binary in git. EN only for v1.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'public', 'dicts', 'en.dict.gz');
const destDir = join(here, '..', 'public');
const dest = join(destDir, 'en.dict.gz');

if (!existsSync(src)) {
  console.error(`[copy-dict] source dictionary not found: ${src}`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log(`[copy-dict] ${src} -> ${dest}`);
