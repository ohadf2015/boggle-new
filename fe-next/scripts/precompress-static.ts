#!/usr/bin/env tsx
/**
 * Write brotli-11 siblings for `.next/static/**` after `next build`.
 *
 * There is no CDN (Railway, single region), so without this every asset byte is
 * re-compressed per request by the `compression` middleware, which can only
 * afford quality 5. These files are content-hashed and served `immutable`, so a
 * `.br` produced here can never disagree with its source.
 *
 * `public/i18n/*.js.br` is NOT done here — build-i18n-assets.ts emits it, since
 * it already has the bytes in hand at that point.
 *
 * Every output is verified by decompressing it back and comparing to the source
 * before this script exits. Serving a corrupt `.br` for a JS chunk is a white
 * screen, so a mismatch fails the build rather than shipping.
 */
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { brotliCompress, brotliDecompressSync, constants } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const compress = promisify(brotliCompress);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_DIR = path.join(ROOT, '.next', 'static');

/** Must stay a subset of CONTENT_TYPES in server/precompressedAssets.ts. */
const EXTENSIONS = new Set(['.js', '.mjs', '.css', '.json', '.svg']);

/**
 * Below ~1kB, brotli's own framing eats the win and the extra file is not worth
 * the inode. Above it, quality 11 is affordable because this runs once.
 */
const MIN_BYTES = 1024;

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

async function main(): Promise<void> {
  const files = walk(STATIC_DIR).filter((f) => statSync(f).size >= MIN_BYTES);

  if (files.length === 0) {
    // `.next/static` missing means this ran outside a build — say so rather than
    // silently reporting success (the app still works, just uncompressed).
    process.stdout.write('  precompress: no .next/static assets found — skipped\n');
    return;
  }

  let sourceBytes = 0;
  let brotliBytes = 0;

  // zlib's async API runs on the libuv threadpool, so these overlap across cores.
  await Promise.all(
    files.map(async (file) => {
      const source = readFileSync(file);
      const brotli = await compress(source, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: 11,
          [constants.BROTLI_PARAM_SIZE_HINT]: source.length,
        },
      });

      // Verify before writing: a corrupt chunk is a white screen, not a slow page.
      if (!brotliDecompressSync(brotli).equals(source)) {
        throw new Error(`precompress: ${path.relative(ROOT, file)} did not round-trip`);
      }

      writeFileSync(`${file}.br`, brotli);
      sourceBytes += source.length;
      brotliBytes += brotli.length;
    }),
  );

  process.stdout.write(
    `  precompress: ${files.length} assets, ${(sourceBytes / 1024 / 1024).toFixed(1)}MB → ` +
      `${(brotliBytes / 1024 / 1024).toFixed(1)}MB brotli-11 (verified round-trip)\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${String(err)}\n`);
  process.exit(1);
});
