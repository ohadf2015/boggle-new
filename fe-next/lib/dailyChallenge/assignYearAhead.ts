/**
 * Year-Ahead Daily Word Assignment
 *
 * Pre-assigns a distinct, judge-approved, interesting word to every future daily
 * slot (up to a year), so the puzzle is locked in well ahead and provably never
 * repeats within the horizon. Draws only from the approved pool (sweepWordBank +
 * the daily-word judge), highest-interestingness first.
 *
 * No-repeat is guaranteed two ways: words used within the recent-year horizon are
 * excluded up front, and each word is consumed at most once within the run.
 *
 * Dependency-injected (no Supabase / LLM) so it is unit-testable. A shortfall
 * (pool smaller than the requested horizon) is reported, never silently truncated.
 *
 * See docs/2026-06-30-word-quality-bulletproof.md
 * @module lib/dailyChallenge/assignYearAhead
 */

export interface ApprovedWord {
  word: string;
  meaning: string;
  interestingness: number;
}

export interface YearAheadDeps {
  /** Approved, active, length-correct words for the language. Ordering is re-applied here. */
  getApprovedPool: (language: string) => Promise<ApprovedWord[]>;
  /** Words served in daily within the no-repeat horizon (uppercased). */
  getRecentlyUsedWords: (language: string) => Promise<Set<string>>;
  /** Future dates (YYYY-MM-DD) held by a human admin override — never overwrite. */
  getHumanOverrideDates: (language: string) => Promise<Set<string>>;
  /** Write the word onto a daily slot (override_word + meaning, regen grid). */
  assignSlot: (language: string, date: string, wordUpper: string, meaning: string) => Promise<void>;
  /** Stamp the bank word used so the daily selector / RPC won't re-pick it. */
  markBankUsed: (language: string, wordUpper: string, date: string) => Promise<void>;
  log?: (msg: string) => void;
}

export interface YearAheadOptions {
  language: string;
  /** First date to fill, YYYY-MM-DD. */
  startDate: string;
  /** Number of consecutive days to fill (e.g. 365). */
  days: number;
}

export interface YearAheadSummary {
  assigned: number;
  /** dates left unfilled because the approved pool ran out — alert signal. */
  shortfall: number;
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function assignYearAhead(deps: YearAheadDeps, opts: YearAheadOptions): Promise<YearAheadSummary> {
  const { language } = opts;
  const [pool, recentlyUsed, humanDates] = await Promise.all([
    deps.getApprovedPool(language),
    deps.getRecentlyUsedWords(language),
    deps.getHumanOverrideDates(language),
  ]);

  // Highest-interest first; exclude recently-used; de-dupe within the pool itself.
  const seen = new Set<string>();
  const available = pool
    .slice()
    .sort((a, b) => (b.interestingness ?? 0) - (a.interestingness ?? 0))
    .filter((w) => {
      const wu = w.word.toUpperCase();
      if (recentlyUsed.has(wu) || seen.has(wu)) return false;
      seen.add(wu);
      return true;
    });

  let assigned = 0;
  let poolIdx = 0;
  let datesNeedingWord = 0;

  for (let i = 0; i < opts.days; i++) {
    const date = addDays(opts.startDate, i);
    if (humanDates.has(date)) continue; // respect admin picks
    datesNeedingWord++;
    if (poolIdx >= available.length) continue; // pool exhausted — counts toward shortfall

    const pick = available[poolIdx++];
    const wu = pick.word.toUpperCase();
    await deps.assignSlot(language, date, wu, pick.meaning || '');
    await deps.markBankUsed(language, wu, date);
    assigned++;
  }

  const shortfall = datesNeedingWord - assigned;
  deps.log?.(`year-ahead ${language}: assigned ${assigned}, shortfall ${shortfall} (pool ${available.length})`);
  return { assigned, shortfall };
}
