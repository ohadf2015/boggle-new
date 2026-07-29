/**
 * Image Path Utilities
 *
 * Normalizes image paths for Remotion's staticFile() function.
 * staticFile() requires paths without a leading slash.
 */

import { staticFile } from 'remotion';

/**
 * Normalize an image path and wrap with Remotion's staticFile().
 *
 * staticFile() is required for proper image loading in both:
 * - Remotion Player (client-side preview)
 * - Remotion CLI/Lambda (server-side video export)
 *
 * Using direct paths bypasses Remotion's delayRender image loading,
 * which causes black screen issues.
 *
 * @param path - Image path (may or may not start with "/")
 * @returns Path wrapped in staticFile()
 */
export function normalizeImagePath(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return staticFile(normalized);
}
