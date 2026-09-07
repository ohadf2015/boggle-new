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
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { brotliCompressSync, constants as zlibConstants } from 'node:zlib';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { normalizeMessages } from '../i18n/normalizeMessages';
import {
  manifestMatchesDisk,
  fingerprintSources,
  SOURCES_KEY,
} from '../lib/i18n/i18nAssetFreshness';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'i18n');
const MANIFEST = path.join(ROOT, 'lib', 'i18n', 'messagesManifest.json');

const LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;

/** Keep in sync with `translations/loadTranslation.ts`. */
const GLOBAL = '__LEXI_MESSAGES__';

// Brotli at quality 11 over six catalogues dominates the runtime of this
// script. `npm run dev` now calls it on every start, so dev skips it —
// server/precompressedI18n.ts falls back to gzip when the `.br` is missing.
// Production keeps it: `build:prebuild` passes no flag.
const SKIP_BROTLI = process.argv.includes('--skip-brotli');

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(path.dirname(MANIFEST), { recursive: true });

// Everything the emitted catalogues are derived from. A change to any of these
// must invalidate the build — comparing disk against the manifest alone cannot
// see a source edit, which is how a stale catalogue kept being served after
// builders added keys, and new strings rendered as raw key paths.
// `translations/layout.ts` is deliberately NOT here: it is imported directly by
// app/[locale]/layout.tsx and bundled by webpack, never through this asset.
const SOURCE_FILES = [
  ...LOCALES.map((lang) => path.join(ROOT, 'translations', `${lang}.js`)),
  path.join(ROOT, 'i18n', 'normalizeMessages.ts'),
];
const SOURCES_FINGERPRINT = fingerprintSources(
  SOURCE_FILES.map((file) => readFileSync(file, 'utf8')),
);

// Warm start: skip only when the files the manifest names are all present AND
// they were built from exactly these sources. This is not only a speed guard —
// the prune below would otherwise churn the catalogue under any dev server
// already serving this worktree.
if (!process.argv.includes('--force') && existsSync(MANIFEST) && existsSync(OUT_DIR)) {
  try {
    const current = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>;
    if (
      manifestMatchesDisk(current, readdirSync(OUT_DIR), {
        skipBrotli: SKIP_BROTLI,
        sourcesFingerprint: SOURCES_FINGERPRINT,
      })
    ) {
      process.stdout.write('  i18n assets already match the manifest and sources — skipping\n');
      process.exit(0);
    }
  } catch {
    // Unreadable manifest: fall through and rebuild.
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

  const source = `globalThis.${GLOBAL}=Object.assign(globalThis.${GLOBAL}||{},{${JSON.stringify(lang)}:${json}});\n`;
  writeFileSync(path.join(OUT_DIR, file), source);

  // This asset is render-blocking in <head>, so it is the one worth paying
  // quality 11 for. Measured on en: 171kB gzip / 158kB brotli-5 (recompressed
  // per request) / 137kB here, once, at build time. Served by
  // server/precompressedI18n.ts, which falls back to gzip if this is missing.
  const brotli = SKIP_BROTLI
    ? null
    : brotliCompressSync(Buffer.from(source), {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
          [zlibConstants.BROTLI_PARAM_SIZE_HINT]: Buffer.byteLength(source),
        },
      });
  if (brotli) writeFileSync(path.join(OUT_DIR, `${file}.br`), brotli);

  manifest[lang] = `/i18n/${file}`;
  process.stdout.write(
    `  i18n ${lang} → ${file} (${(json.length / 1024).toFixed(0)}kB${
      brotli ? `, br ${(brotli.length / 1024).toFixed(0)}kB` : ', br skipped'
    })\n`,
  );
}

manifest[SOURCES_KEY] = SOURCES_FINGERPRINT;
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`  i18n manifest → ${path.relative(ROOT, MANIFEST)}\n`);

// Prune AFTER the new files and the new manifest are on disk, never before.
// Several dev servers share this worktree; deleting first left a window where
// the manifest named a file that no longer existed, which is the 404 that
// started all of this. Writing first means the worst case is a served asset
// that is momentarily stale, not one that is missing.
const keep = new Set(
  Object.entries(manifest)
    .filter(([key]) => key !== SOURCES_KEY)
    .map(([, entry]) => entry.replace(/^\/i18n\//, '')),
);
for (const f of readdirSync(OUT_DIR)) {
  if (!f.endsWith('.js') && !f.endsWith('.js.br')) continue;
  if (keep.has(f) || keep.has(f.replace(/\.br$/, ''))) continue;
  rmSync(path.join(OUT_DIR, f));
}
