/**
 * Word Bridge daily share card — the "story of the chain" emoji grid.
 *
 * Wordle/NYT-Connections go viral because the share is a *spoiler-free,
 * glanceable arc of struggle→triumph* that's safe to paste into any group
 * chat. This builds the equivalent for a bridge-word game: one universal
 * (language-agnostic) emoji per bridge, plus a localized praise callout the
 * caller supplies via `t()`. Pure — no DOM, no i18n coupling.
 *
 * Legend:
 *   🟩 clean solve (0 wrong, no hint)
 *   🟨 solved but with ≥1 wrong guess
 *   💡 solved using a hint
 *   🟥 reached but not solved (gave up / out of lives here)
 *   ⬛ never reached (lost earlier in the chain)
 */

export interface BridgeOutcome {
  /** Did the player get to attempt this bridge at all? */
  reached: boolean;
  solved: boolean;
  /** Wrong guesses on THIS bridge (resets per puzzle). */
  wrongAttempts: number;
  hintUsed: boolean;
}

export type GridCallout = 'perfect' | 'flawless' | 'oneAway' | 'solid' | 'tough';

/** Map a single bridge's outcome to its universal square. */
export function bridgeSquare(o: BridgeOutcome): string {
  if (!o.reached) return '⬛';
  if (!o.solved) return '🟥';
  if (o.hintUsed) return '💡';
  if (o.wrongAttempts > 0) return '🟨';
  return '🟩';
}

/** Pick the social praise hook for the whole chain (caller localizes the text). */
export function gridCallout(outcomes: readonly BridgeOutcome[]): GridCallout {
  const solved = outcomes.filter((o) => o.solved);
  const unsolved = outcomes.length - solved.length;
  if (unsolved === 0) {
    const allClean = solved.every((o) => o.wrongAttempts === 0 && !o.hintUsed);
    return allClean ? 'perfect' : 'flawless';
  }
  if (solved.length === 0) return 'tough';
  if (unsolved === 1) return 'oneAway';
  return 'solid';
}

export interface BridgeGridParams {
  /** Localized game title, e.g. t('connections.title'). */
  title: string;
  dateISO: string;
  outcomes: readonly BridgeOutcome[];
  streak: number;
  rank: number | null;
  /** Localized praise line (caller maps gridCallout → t()). Optional. */
  callout?: string;
  /** Share/landing URL appended as the final line. Optional. */
  url?: string;
}

/**
 * Assemble the full shareable result. Layout (Wordle-style, paste-safe):
 *
 *   🌉 {title} {date}
 *   🟩🟩🟨💡🟥          ← the chain, in order, no spoilers
 *   {callout}            ← optional localized praise
 *   {solved}/{total} · 🔥{streak} · #{rank}
 *   {url}                ← optional
 */
export function buildDailyBridgeGrid({
  title,
  dateISO,
  outcomes,
  streak,
  rank,
  callout,
  url,
}: BridgeGridParams): string {
  const grid = outcomes.map(bridgeSquare).join('');
  const solved = outcomes.filter((o) => o.solved).length;

  const score = [`${solved}/${outcomes.length}`, `🔥${streak}`];
  if (rank != null) score.push(`#${rank}`);

  const lines = [`🌉 ${title} ${dateISO}`, grid];
  if (callout) lines.push(callout);
  lines.push(score.join(' · '));
  if (url) lines.push(url);
  return lines.join('\n');
}
