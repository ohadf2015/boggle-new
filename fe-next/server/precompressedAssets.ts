/**
 * Serve build-time brotli-11 siblings for content-hashed, immutable assets.
 *
 * There is no CDN in front of this app (Railway, single region), so every asset
 * byte is re-compressed by the `compression` middleware on every request that
 * misses the browser cache. Quality 5 is all that is affordable there. These
 * files never change for a given URL — the hash is in the name — so compressing
 * them once at build time buys both a better ratio and zero runtime CPU:
 *
 *   /i18n/<lang>.<hash>.js   171kB gzip -> 158kB br5/request -> 137kB br11 once
 *   /_next/static/**           ~7% better than gzip at q5 -> ~16% at q11
 *
 * The i18n catalogue is the one that matters most: it is the only
 * render-BLOCKING resource on every page (classic <script> in <head>, which
 * scripts/build-i18n-assets.ts explains cannot be deferred).
 *
 * Fails safe in every direction — a missing, unreadable, or out-of-root `.br`
 * falls through to the normal handler and the client gets gzip as before.
 * `scripts/precompress-static.ts` verifies each `.br` decodes byte-identical to
 * its source before the build is allowed to succeed.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { acceptsEncoding } from '../lib/http/acceptEncoding';

export interface PrecompressedRoot {
  /** URL prefix to match, with trailing slash. */
  urlPrefix: string;
  /** Absolute directory the prefix maps onto. */
  dir: string;
}

/** Only text formats. woff2/png/webp are already compressed; brotli adds nothing. */
const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

export function precompressedAssets(roots: readonly PrecompressedRoot[]): RequestHandler {
  const resolved = roots.map((r) => ({ ...r, dir: path.resolve(r.dir) }));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (!acceptsEncoding(req.headers['accept-encoding'] as string | undefined, 'br')) return next();

    // `req.path` is already query-stripped, but decode so an encoded `..`
    // cannot smuggle past the containment check below.
    let urlPath: string;
    try {
      urlPath = decodeURIComponent(req.path);
    } catch {
      return next();
    }

    const root = resolved.find((r) => urlPath.startsWith(r.urlPrefix));
    if (!root) return next();

    const contentType = CONTENT_TYPES[path.extname(urlPath).toLowerCase()];
    if (!contentType) return next();

    const file = path.resolve(root.dir, urlPath.slice(root.urlPrefix.length));
    // Containment: the resolved path must sit inside the root, not merely start
    // with its name (`/static-evil` must not match a `/static` root).
    if (file !== root.dir && !file.startsWith(root.dir + path.sep)) return next();

    const brotli = `${file}.br`;
    if (!existsSync(brotli)) return next();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Encoding', 'br');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept-Encoding');
    // `dotfiles: 'allow'` is REQUIRED, not cosmetic: the `.next` segment makes
    // every /_next/static path a dotfile path, and send()'s default 'ignore'
    // turns all of them into 404s. Safe because the containment check above has
    // already pinned the path inside a configured root.
    res.sendFile(brotli, { dotfiles: 'allow' }, (err) => {
      // A read that fails after headers are set cannot fall through to the next
      // handler, so surface it rather than hanging the request.
      if (err) next(err);
    });
  };
}
