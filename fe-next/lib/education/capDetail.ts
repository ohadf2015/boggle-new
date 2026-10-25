/** Reads the {currentCount, limit} detail the free-tier cap triggers attach to their error. */
export function parseCapDetail(details: unknown): { currentCount?: number; limit?: number } {
  if (typeof details !== 'string') return {};
  try {
    const parsed = JSON.parse(details) as { currentCount?: unknown; limit?: unknown };
    return {
      ...(typeof parsed.currentCount === 'number' ? { currentCount: parsed.currentCount } : {}),
      ...(typeof parsed.limit === 'number' ? { limit: parsed.limit } : {}),
    };
  } catch {
    return {};
  }
}
