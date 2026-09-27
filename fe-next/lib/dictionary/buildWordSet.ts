/**
 * Chunked Set construction for the client word dictionary.
 *
 * WHY: every load path in `hooks/useDictionaryCache` ended in a bare
 * `new Set(words)` over 370k–900k strings. That is one indivisible main-thread
 * task, so any tap that lands during it waits for the whole thing — which is
 * precisely what INP measures. Field p75 INP (14d, mobile) was 696ms on /es vs
 * 344ms on /en, and the Spanish payload is ~2x the English one: the same ratio.
 * The Web Worker path did not help, because it built its Set off-thread and
 * then handed the array back for a second `new Set()` on the main thread.
 *
 * Yielding every `chunkSize` words turns one 300–600ms task into many short
 * ones, so an interaction can be serviced between them. Total wall-clock is
 * slightly worse; INP is dramatically better, and nothing here is on a path
 * the user is waiting to *finish* (validation falls back to the server until
 * the dictionary is warm).
 *
 * Remaining ceiling: the worker path still structured-clones the full array
 * back to the main thread, and that deserialization is not chunkable. If it
 * ever shows up in a trace, move the lookup itself into the worker behind an
 * async `checkWord` instead of shipping the words across.
 */

/** ~25k adds lands comfortably under a 50ms task on low-end Android. */
const DEFAULT_CHUNK_SIZE = 25_000;

interface SchedulerWithYield {
  yield?: () => Promise<void>;
}

/** Hand the thread back so pending input can be dispatched. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: SchedulerWithYield }).scheduler;
  // scheduler.yield keeps our continuation ahead of unrelated timers; setTimeout
  // is the portable fallback (Safari, older Chrome, jsdom).
  if (typeof scheduler?.yield === 'function') return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Build a Set from `words` without ever blocking the main thread for longer
 * than one chunk. Resolves synchronously (microtask only) when the input fits
 * in a single chunk, so small lists pay nothing.
 */
export async function buildWordSet(
  words: readonly string[],
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): Promise<Set<string>> {
  const set = new Set<string>();
  const size = Math.max(1, chunkSize);

  for (let start = 0; start < words.length; start += size) {
    const end = Math.min(start + size, words.length);
    for (let i = start; i < end; i++) set.add(words[i]);
    if (end < words.length) await yieldToMain();
  }

  return set;
}
