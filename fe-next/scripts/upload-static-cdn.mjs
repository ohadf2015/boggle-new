#!/usr/bin/env node
/**
 * Sync heavy static media from public/ to the Supabase Storage `static-assets`
 * bucket (the CDN origin for getAssetUrl / NEXT_PUBLIC_ASSET_CDN_BASE).
 *
 * INCREMENTAL: lists what's already in the bucket and uploads only files that
 * are new or changed (by byte size). So it's cheap to run on every build —
 * a deploy that adds one new sound uploads just that one file.
 *
 * Runs automatically as `prebuild` (see package.json). Designed to be a SAFE
 * no-op when it can't/shouldn't run, so it never breaks a build:
 *   - no service-role key (local dev, CI without the secret) -> skip, exit 0
 *   - no CDN base configured                                 -> skip, exit 0
 * Force a full re-upload (e.g. after recompressing assets) with `--force`.
 *
 * Keep DIRS in sync with the dirs getAssetUrl-wrapped in code
 * (audioLoader, pixiSoundManager, Showcase3DClient).
 */
import { createClient } from '@supabase/supabase-js';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public');
const BUCKET = 'static-assets';
const DIRS = ['music', 'sounds', 'videos', 'showcase3d'];
const FORCE = process.argv.includes('--force');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hdtmpkicuxvtmvrmtybx.supabase.co';
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Safe no-op guards — never fail a build because the CDN sync couldn't run.
if (!SERVICE_KEY) {
  console.log('[cdn-sync] no SUPABASE_SERVICE_ROLE_KEY — skipping (assets serve from public/).');
  process.exit(0);
}
if (!process.env.NEXT_PUBLIC_ASSET_CDN_BASE && !FORCE) {
  console.log('[cdn-sync] NEXT_PUBLIC_ASSET_CDN_BASE unset — skipping (CDN not active). Use --force to seed.');
  process.exit(0);
}

const CT = {
  '.mp3': 'audio/mpeg', '.webm': 'audio/webm', '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.png': 'image/png',
};

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** Recursively map existing bucket objects under `prefix` to their byte size. */
async function existingSizes(prefix, acc = new Map()) {
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: PAGE, offset });
    if (error) { console.warn(`[cdn-sync] list ${prefix}: ${error.message}`); break; }
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null || item.metadata == null) {
        // a "folder" placeholder — recurse into it
        await existingSizes(path, acc);
      } else {
        acc.set(path, Number(item.metadata.size ?? -1));
      }
    }
    if (data.length < PAGE) break;
  }
  return acc;
}

let uploaded = 0, skipped = 0, failed = 0, bytes = 0;
for (const dir of DIRS) {
  const abs = join(PUBLIC_DIR, dir);
  try { await stat(abs); } catch { console.warn(`[cdn-sync] skip (missing dir): ${dir}`); continue; }
  const remote = FORCE ? new Map() : await existingSizes(dir);
  for await (const file of walk(abs)) {
    const key = relative(PUBLIC_DIR, file); // e.g. "music/in_game.mp3"
    const body = await readFile(file);
    if (!FORCE && remote.get(key) === body.length) { skipped++; continue; }
    const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
      upsert: true,
      contentType: CT[extname(file).toLowerCase()] || 'application/octet-stream',
      cacheControl: '31536000', // 1y — files are content-stable; rename on change
    });
    if (error) { failed++; console.error(`[cdn-sync] FAIL ${key}: ${error.message}`); }
    else { uploaded++; bytes += body.length; }
  }
}
console.log(`[cdn-sync] uploaded ${uploaded} (${(bytes / 1e6).toFixed(1)} MB), skipped ${skipped}, failed ${failed}.`);
// Don't fail the build on a partial upload — the env-gated Docker strip only
// removes a dir's local copies, and an un-synced file still 404s loudly in QA.
// But a hard failure here would block deploys, so log and continue.
process.exit(0);
