/**
 * Which mode cards the teacher's launch screen shows, and with which art.
 *
 * Most-played first (PostHog 60d: vocab-quiz 15, classic 10, blast 3), three
 * big cards in one row; the rest fold behind a quiet "More games". The mode
 * GO LIVE names must always be on screen, so a folded-away selection takes the
 * last featured slot instead of disappearing.
 */

const RANKED = ['vocab-quiz', 'classic', 'blast', 'word-hunt', 'wheel-rush'];

export const FEATURED_MODE_COUNT = 3;

export function visibleModeIds<T extends string>(catalog: readonly T[], selected: T, expanded: boolean): T[] {
  const rank = (id: string) => {
    const i = RANKED.indexOf(id);
    return i === -1 ? RANKED.length : i;
  };
  const ordered = [...catalog].sort((a, b) => rank(a) - rank(b));
  if (expanded) return ordered;
  const featured = ordered.slice(0, FEATURED_MODE_COUNT);
  if (!featured.includes(selected) && catalog.includes(selected)) {
    featured[featured.length - 1] = selected;
  }
  return featured;
}

export function modeCardArt(id: string): string {
  if (id === 'vocab-quiz') return '/images/education/node-quiz.webp';
  if (id === 'wordcraft' || id === 'word-craft') return '/images/education/node-wordcraft.webp';
  return '/images/education/node-arena.webp';
}

/** The lobby's live round settings — the only source a card's fact chips read. */
export interface LaunchRoundFacts {
  vocabQuizQuestionCount?: number;
  vocabQuizSeconds?: number;
  boardSize?: 'small' | 'medium' | 'large';
  minWordLength?: number;
}

export type ModeFactChip =
  | { kind: 'questions'; count: number }
  | { kind: 'pace'; seconds: number }
  | { kind: 'board'; label: string }
  | { kind: 'letters'; min: number };

const BOARD_LABEL: Record<NonNullable<LaunchRoundFacts['boardSize']>, string> = {
  small: '5×5',
  medium: '6×6',
  large: '7×7',
};

/**
 * The two facts beside each card's minute chip, so a teacher can pick in two
 * seconds: the quiz's length and pace; a board game's grid and its difficulty
 * (the minimum word length). Read ONLY from the lobby's configured settings —
 * the same values the round will launch with — never a per-mode guess, so a
 * card can never promise a game the room is not about to play (Pitfall 3).
 */
export function modeCardFacts(id: string, facts: LaunchRoundFacts): ModeFactChip[] {
  const out: ModeFactChip[] = [];
  if (id === 'vocab-quiz') {
    if (facts.vocabQuizQuestionCount) out.push({ kind: 'questions', count: facts.vocabQuizQuestionCount });
    if (facts.vocabQuizSeconds) out.push({ kind: 'pace', seconds: facts.vocabQuizSeconds });
    return out;
  }
  if (facts.boardSize) out.push({ kind: 'board', label: BOARD_LABEL[facts.boardSize] });
  if (facts.minWordLength) out.push({ kind: 'letters', min: facts.minWordLength });
  return out;
}
