/**
 * Gets the performance variant from the perf_variant cookie.
 * Used for A/B testing performance optimizations.
 *
 * @returns The variant name (e.g., 'control', 'perf_v1') or null if not set
 */
export function getPerfVariant(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)perf_variant=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
