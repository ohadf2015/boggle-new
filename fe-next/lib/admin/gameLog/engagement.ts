/**
 * How much of a game was actually played — the admin log's answer to
 * "why does this row say 0 points, 0 words?".
 *
 * Live data (7 days to 2026-11-08): 1,333 of 1,473 single-player abandons were
 * one headless Chrome visitor closing the Boggle landing page 2–3s after the
 * board loaded. Those rows are tagged `is_automated` at ingest (analytics.ts,
 * "tag, never drop"), so the log can separate them from people. Of the rest,
 * most 0-word rows are people who left inside a few seconds.
 */
import type { GameStatus } from './groupGames';

export type Engagement =
  /** Headless / automated user agent (tagged server-side at ingest). */
  | 'bot'
  /** Left inside NEVER_PLAYED_MAX_SEC with nothing found — never really played. */
  | 'never_played'
  /** Left after that with nothing recorded (modes that don't log words on leave land here too). */
  | 'left_early'
  /** Reached the end with 0 score and 0 words. */
  | 'finished_empty'
  /** Found at least one word, scored, or built a floor. */
  | 'played';

/** A leave this fast with nothing found means the player never really started. */
export const NEVER_PLAYED_MAX_SEC = 10;

export interface EngagementInput {
  isAutomated: boolean;
  status: GameStatus;
  score: number;
  wordCount: number;
  floors: number | null;
  durationSec: number | null;
}

export function classifyEngagement(input: EngagementInput): Engagement {
  if (input.isAutomated) return 'bot';
  if (input.score > 0 || input.wordCount > 0 || (input.floors ?? 0) > 0) return 'played';
  if (input.status === 'completed') return 'finished_empty';
  if (input.durationSec != null && input.durationSec < NEVER_PLAYED_MAX_SEC) return 'never_played';
  return 'left_early';
}

/** Engagements that count as an "empty" game in the admin filter. */
export const EMPTY_ENGAGEMENTS: ReadonlySet<Engagement> = new Set<Engagement>([
  'never_played',
  'left_early',
  'finished_empty',
]);

const SUB_MODE_LABELS: Record<string, string> = {
  challenge: 'Timed solo',
  'solo-bots': 'vs bots',
  practice: 'Untimed practice',
};

/** Plain-words label for a single-player sub-mode (`sp_mode`). */
export function subModeLabel(subMode: string | null | undefined): string | null {
  if (!subMode) return null;
  return SUB_MODE_LABELS[subMode] ?? subMode;
}

type T = (key: string, fallback?: string) => string;

/** 45 → "45s", 83 → "1:23". */
export function formatSeconds(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export type EngagementTone = 'bot' | 'empty' | 'left' | 'done' | 'error';

export interface EngagementTag {
  label: string;
  tone: EngagementTone;
}

/**
 * The one-glance result tag for a game row: what happened, in plain words.
 * Abandons in modes that don't log words on leave read "Left after Ns" rather
 * than claiming 0 words.
 */
export function engagementTag(
  g: { engagement?: Engagement; status: GameStatus; durationSec?: number | null },
  t: T,
): EngagementTag {
  const after = (sec: number | null | undefined) =>
    sec != null
      ? t('admin.todayGames.engagement.leftAfter', 'Left after {time}').replace('{time}', formatSeconds(sec))
      : t('admin.todayGames.status.left', 'Left mid-game');

  if (g.status === 'errored') return { label: t('admin.todayGames.status.errored', 'Error'), tone: 'error' };
  switch (g.engagement) {
    case 'bot':
      return { label: t('admin.todayGames.engagement.bot', 'Bot'), tone: 'bot' };
    case 'never_played':
      return {
        label: `${after(g.durationSec)} · ${t('admin.todayGames.engagement.neverPlayed', 'never played')}`,
        tone: 'empty',
      };
    case 'finished_empty':
      return { label: t('admin.todayGames.engagement.finishedEmpty', 'Finished · 0 words'), tone: 'empty' };
    case 'left_early':
      return { label: after(g.durationSec), tone: 'empty' };
    case 'played':
    default:
      return g.status === 'completed'
        ? { label: t('admin.todayGames.status.completed', 'Completed'), tone: 'done' }
        : { label: after(g.durationSec), tone: 'left' };
  }
}
