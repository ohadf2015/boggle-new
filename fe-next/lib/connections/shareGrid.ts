/**
 * Word Bridge daily share — spoiler-free labeled chain recap.
 *
 * One language-agnostic token per bridge plus a localized praise callout the
 * caller supplies via `t()`. Pure — no DOM, no i18n coupling, no emoji.
 *
 * Tokens:
 *   clean  — 0 wrong, no hint
 *   messy  — solved with ≥1 wrong guess
 *   hint   — solved using a hint
 *   miss   — reached but not solved
 *   —      — never reached
 */

export interface BridgeOutcome {
  reached: boolean;
  solved: boolean;
  wrongAttempts: number;
  hintUsed: boolean;
}

export type GridCallout = 'perfect' | 'flawless' | 'oneAway' | 'solid' | 'tough';

export function bridgeSquare(o: BridgeOutcome): string {
  if (!o.reached) return '—';
  if (!o.solved) return 'miss';
  if (o.hintUsed) return 'hint';
  if (o.wrongAttempts > 0) return 'messy';
  return 'clean';
}

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
  title: string;
  dateISO: string;
  outcomes: readonly BridgeOutcome[];
  streak: number;
  rank: number | null;
  callout?: string;
  url?: string;
}

export function buildDailyBridgeGrid({
  title,
  dateISO,
  outcomes,
  streak,
  rank,
  callout,
  url,
}: BridgeGridParams): string {
  const chain = outcomes.map(bridgeSquare).join(' · ');
  const solved = outcomes.filter((o) => o.solved).length;

  const score = [`${solved}/${outcomes.length}`, `streak ${streak}`];
  if (rank != null) score.push(`#${rank}`);

  const lines = [`LexiClash · ${title} ${dateISO}`, chain];
  if (callout) lines.push(callout);
  lines.push(score.join(' · '));
  if (url) lines.push(url);
  return lines.join('\n');
}
