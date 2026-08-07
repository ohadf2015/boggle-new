#!/usr/bin/env tsx
/**
 * Emit each locale's message catalogue as a content-hashed, immutably cacheable
 * script under `public/i18n/`.
 *
 * Why: `app/[locale]/layout.tsx` used to `await loadTranslation(locale)` on the
 * server and hand the result to a client provider. React then serialises the
 * whole catalogue into the RSC flight payload of *every* page — measured
 * 2026-08-07 against production, 525kB raw / ~165kB gzip inlined in the HTML of
 * `/en/about`, and re-downloaded on every full page load because inline data
 * cannot be cached. The same bytes as a hashed asset are fetched once and then
 * served from disk cache for every later page and session.
 *
 * The asset assigns a global rather than exporting a module so it can run as a
 * plain classic script in <head>, before hydration. The client needs the
 * catalogue synchronously: without it `t()` returns raw key paths
 * (`nav.howToPlay`) and React would patch the server-rendered text — a visible
 * flash on every page.
 *
 * Wired into `build:prebuild`. Output is gitignored.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalizeMessages } from '../i18n/normalizeMessages';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'i18n');
const MANIFEST = path.join(ROOT, 'lib', 'i18n', 'messagesManifest.json');

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/** Keep in sync with `translations/loadTranslation.ts`. */
const GLOBAL = '__LEXI_MESSAGES__';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(MANIFEST), { recursive: true });

// Stale hashed files would accumulate across builds and ship in the image.
if (existsSync(OUT_DIR)) {
  for (const f of readdirSync(OUT_DIR)) {
    if (f.endsWith('.js')) rmSync(path.join(OUT_DIR, f));
  }
}

const manifest: Record<string, string> = {};
for (const lang of LOCALES) {
  const mod = require(`../translations/${lang}.js`) as Record<string, unknown>;
  const raw = (mod[lang] ?? mod.default ?? Object.values(mod)[0]) as Record<string, unknown> | undefined;
  if (!raw) throw new Error(`translations/${lang}.js exported nothing recognisable`);

  // Normalised at build time — doing it per page load burns main-thread CPU for
  // a result that is byte-identical every time.
  const json = JSON.stringify(normalizeMessages(raw));
  const hash = createHash('sha256').update(json).digest('hex').slice(0, 8);
  const file = `${lang}.${hash}.js`;

  writeFileSync(
    path.join(OUT_DIR, file),
    `globalThis.${GLOBAL}=Object.assign(globalThis.${GLOBAL}||{},{${JSON.stringify(lang)}:${json}});\n`,
  );
  manifest[lang] = `/i18n/${file}`;
  process.stdout.write(`  i18n ${lang} → ${file} (${(json.length / 1024).toFixed(0)}kB)\n`);
}

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`  i18n manifest → ${path.relative(ROOT, MANIFEST)}\n`);
