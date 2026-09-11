/**
 * Mode → translation-key table for every classroom game mode.
 *
 * Extracted from `ClassroomModeBanner` so a caller that only needs the LABEL
 * (the projector lobby) does not have to import the banner — and with it
 * `qrcode.react`, `react-hot-toast`, `LanguageContext` and the whole
 * lucide icon set — just to name a mode.
 *
 * Re-exported from `ClassroomModeBanner` so existing importers, and the
 * `classroomModeRegistry` test that pins one entry per `CLASSROOM_GAME_MODES`,
 * keep working unchanged.
 */
export const MODE_TRANSLATION_KEY: Record<string, string> = {
  classic: 'classic',
  blast: 'blast',
  'word-hunt': 'wordHunt',
  'wheel-rush': 'wheelRush',
  'word-tower': 'wordTower',
  'sealed-bid': 'sealedBid',
  crossword: 'crossword',
  wordcraft: 'wordcraft',
  'vocab-quiz': 'vocabQuiz',
};

/** Fallback when a mode has no entry — a cosmetic gap must never crash a host. */
export const FALLBACK_MODE_TRANSLATION_KEY = 'classic';

export function classroomModeLabelKey(mode: string | undefined): string {
  return `teacher.classroom.gameModes.${MODE_TRANSLATION_KEY[mode ?? ''] ?? FALLBACK_MODE_TRANSLATION_KEY}`;
}

/**
 * Board-size label, matching `ClassroomSetupStep` one size for one.
 *
 * INCIDENT (2026-09-06): this table was one step behind that screen — an older
 * 4×4/5×5/6×6 scale with no `medium` case — so the teacher's Medium fell
 * through to the default and the lobby announced 5×5 to a room that was 6×6.
 * Every size was off by one. Reported as "board size silently reverted";
 * nothing reverted, the label was wrong.
 *
 * It lives here, alone, because BOTH the student banner and the teacher's
 * projector lobby print it. Two copies of this table is how it drifts again
 * (recurring pitfall class 2/3).
 *
 * The fallback is Medium because that is what the setup screen preselects, so
 * an absent value and an unset one say the same thing.
 */
export function boardSizeLabel(size?: string | null): string {
  switch (size) {
    case 'small': return '5×5';
    case 'large': return '7×7';
    default: return '6×6';
  }
}
