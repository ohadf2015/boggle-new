#!/usr/bin/env node
/**
 * Build-time script: stamps the current timestamp into
 * lib/seo/buildInfo.generated.json so app/sitemap.ts can emit an accurate
 * <lastmod> for deploy-anchored routes.
 *
 * Why this exists: sitemap.ts previously read process.env.NEXT_PUBLIC_BUILD_TIME
 * (inlined by next.config.mjs `env`). That inlining provably does NOT reach the
 * sitemap metadata route in the production standalone build — prod sitemap.xml
 * kept serving the hardcoded 2026-03-26 fallback for 434 URLs for months while
 * /api/version (same env var) reported the true build time. A checked-in,
 * build-regenerated JSON import is the same pattern as
 * lib/seo/wordLists/wordLists.generated.json, which DOES reach prod correctly.
 *
 * Runs as part of `build:prebuild` (inside Railway's Docker build, where
 * `new Date()` is the real deploy time). In dev the committed file is used
 * as-is, which is fine — dev sitemaps are never crawled.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'lib', 'seo', 'buildInfo.generated.json');

const payload = { builtAt: new Date().toISOString() };
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`[build-info] builtAt=${payload.builtAt} → ${path.relative(ROOT, OUT)}`);
