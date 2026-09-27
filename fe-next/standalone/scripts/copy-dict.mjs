// Copy the canonical gzipped dictionary into public/ so the bundle can ship it
// as a same-origin relative asset. Sourced from the main app's committed dict so
// the standalone never duplicates the 1.16MB binary in git. EN only for v1.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const mainPublic = join(here, '..', '..', 'public');
const destDir = join(here, '..', 'public');

// 1. Dictionary
const dictSrc = join(mainPublic, 'dicts', 'en.dict.gz');
if (!existsSync(dictSrc)) {
  console.error(`[copy-assets] source dictionary not found: ${dictSrc}`);
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(dictSrc, join(destDir, 'en.dict.gz'));
console.log(`[copy-assets] dict -> public/en.dict.gz`);

// 2. Fonts (EN-only build → latin woff2 for Fredoka display + Rubik body)
mkdirSync(join(destDir, 'fonts'), { recursive: true });
for (const f of ['fredoka-latin.woff2', 'rubik-latin.woff2']) {
  const src = join(mainPublic, 'fonts', f);
  if (!existsSync(src)) { console.error(`[copy-assets] missing font: ${src}`); process.exit(1); }
  copyFileSync(src, join(destDir, 'fonts', f));
  console.log(`[copy-assets] font -> public/fonts/${f}`);
}
