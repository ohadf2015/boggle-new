/**
 * Pure derivation for the multiplayer results "brag card" — the screenshot-first
 * share artifact. Takes raw match results, returns translation KEYS + params (no
 * `t()` here, so it stays unit-testable) plus visual hints (accent, RTL).
 *
 * Copy matrix (multiplayer is often >2 players, and losers share too):
 *   winner_2p   — won a head-to-head: "I CRUSHED {name} {score}–{opponent}"
 *   winner_np   — won a 3+ player match: "WON · beat {count} players"
 *   non_winner  — didn't win: "{score} pts · #{rank} — beat me?"
 */

export type BragOutcome = 'winner_2p' | 'winner_np' | 'non_winner';
export type BragAccent = 'lime' | 'pink' | 'cyan' | 'purple';
export type HeroKind = 'points' | 'combo' | 'longest';

export interface BragCardInput {
  gameMode?: string;
  isWinner: boolean;
  /** 1-based final placement. */
  rank: number;
  playerCount: number;
  score: number;
  wordsFound: number;
  longestWord?: string;
  maxCombo?: number;
  /** Top rival's display name (for head-to-head framing). */
  opponentName?: string;
  opponentScore?: number;
  locale: string;
}

export interface HeroStat {
  kind: HeroKind;
  /** Big value rendered on the card. */
  primary: string;
  /** Translation key for the unit label under the value. */
  labelKey: string;
}

export interface BragCardData {
  outcome: BragOutcome;
  headlineKey: string;
  headlineParams: Record<string, string | number>;
  hero: HeroStat;
  accent: BragAccent;
  isRTL: boolean;
}

const ACCENT_BY_MODE: Record<string, BragAccent> = {
  classic: 'lime',
  multiplayer: 'lime',
  blast: 'pink',
  'word-hunt': 'purple',
  wordHunt: 'purple',
  'wheel-rush': 'cyan',
  wheelRush: 'cyan',
};

function deriveHero(input: BragCardInput): HeroStat {
  const mode = input.gameMode ?? '';
  if ((mode === 'blast') && (input.maxCombo ?? 0) > 0) {
    return { kind: 'combo', primary: `${input.maxCombo}×`, labelKey: 'brag.hero.combo' };
  }
  if ((mode === 'word-hunt' || mode === 'wordHunt') && input.longestWord) {
    return { kind: 'longest', primary: input.longestWord.toUpperCase(), labelKey: 'brag.hero.longest' };
  }
  return { kind: 'points', primary: String(input.score), labelKey: 'brag.hero.points' };
}

export function deriveBragCardData(input: BragCardInput): BragCardData {
  const hero = deriveHero(input);
  const accent = ACCENT_BY_MODE[input.gameMode ?? ''] ?? 'lime';
  const isRTL = input.locale === 'he';

  let outcome: BragOutcome;
  let headlineKey: string;
  let headlineParams: Record<string, string | number>;

  if (input.isWinner && input.playerCount <= 2 && input.opponentName) {
    outcome = 'winner_2p';
    headlineKey = 'brag.headline.crushed';
    headlineParams = {
      name: input.opponentName,
      score: input.score,
      opponent: input.opponentScore ?? 0,
    };
  } else if (input.isWinner) {
    outcome = 'winner_np';
    headlineKey = 'brag.headline.won';
    headlineParams = { count: Math.max(1, input.playerCount - 1), score: input.score };
  } else {
    outcome = 'non_winner';
    headlineKey = 'brag.headline.challenge';
    headlineParams = { score: input.score, rank: input.rank };
  }

  return { outcome, headlineKey, headlineParams, hero, accent, isRTL };
}
