/**
 * Bounded counters of Next.js request-handler traffic.
 *
 * Idle old-space growth with counts[games…]=0 is the Next SSR path, not game
 * Maps. hits vs unique vs overflow lets a 24h MEMWATCH watch tell #94890-style
 * unique-URL fan-out (crawlers) from a flat handful of routes.
 *
 * The unique Set is capped so the diagnostic itself cannot become a leak.
 */
export const NEXT_HANDLE_UNIQUE_CAP = 2048;

let hits = 0;
const unique = new Set<string>();
let overflow = 0;
let drops = 0;

function normalizePath(pathname: string): string {
  const cut = pathname.split('?')[0] || '/';
  return cut.length > 0 ? cut : '/';
}

export function noteNextHandle(pathname: string): void {
  hits += 1;
  const key = normalizePath(pathname);
  if (unique.has(key)) return;
  if (unique.size < NEXT_HANDLE_UNIQUE_CAP) {
    unique.add(key);
    return;
  }
  overflow += 1;
}

export function noteNextHandleDrop(_reason?: string): void {
  drops += 1;
}

export function formatNextHandleCounts(): string {
  return `next[hits=${hits} unique=${unique.size} overflow=${overflow} drop=${drops}]`;
}

export function resetNextHandleStatsForTests(): void {
  hits = 0;
  unique.clear();
  overflow = 0;
  drops = 0;
}
