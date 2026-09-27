/**
 * Resolve a static-asset path to its CDN URL.
 *
 * Heavy binary media (music, sounds, videos, 3D showcase frames) is offloaded
 * from the Node server to a CDN (Supabase Storage public bucket). Set
 * `NEXT_PUBLIC_ASSET_CDN_BASE` to the bucket base, e.g.
 *   https://<proj>.supabase.co/storage/v1/object/public/static-assets
 * and these assets resolve to the edge-cached CDN instead of the origin.
 *
 * When the env var is unset (local dev, or before the assets are uploaded),
 * the path is returned unchanged so files are served from `public/` exactly
 * as before — the migration is a no-op until the env var is flipped on.
 *
 * ponytail: cache-busting is by filename. These files change rarely; on change,
 * rename the file or purge the bucket's CDN cache. Add build-hash versioning
 * only if churn ever makes manual purging painful.
 */
export function getAssetUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_ASSET_CDN_BASE;
  if (!base || !path) return path;
  // Already an absolute / non-origin URL — leave it (idempotent, safe to wrap twice).
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const cleanBase = base.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
}
