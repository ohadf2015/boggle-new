/**
 * Pure derivation for the multiplayer results "brag card" — the screenshot-first
 * share artifact. Takes raw match results, returns translation KEYS + params (no
 * `t()` here, so it stays unit-testable) plus visual hints (accent, RTL).
 *
 * Every game frames a named FACE-OFF, because people share "I beat so-and-so",
 * not "I scored X". The rival is always the closest opponent in the standings:
 * sortedScores is descending, so the first player that isn't you is the runner-up
 * when you won (you're #1) and the winner when you lost (your revenge target).
 *
 * Copy matrix (multiplayer is often >2 players, and losers share too):
 *   winner_2p   — won a head-to-head:        crushed  "SORRY {name} 💀 {score}–{opponent}"
 *   winner_np   — won a 3+ match, named:     topped   "{name} + {count} MORE. DEMOLISHED."
 *                 won a 3+ match, anonymous: won      "{count} RIVALS. ZERO SURVIVORS."
 *   non_winner  — lost, named the winner:    revenge  "{name} GOT LUCKY. REMATCH?"
 *                 lost, anonymous:           challenge "{score} PTS. THINK YOU'RE BETTER?"
 */

export type BragOutcome = 'winner_2p' | 'winner_np' | 'non_winner';
export type BragAccent = 'lime' | 'pink' | 'cyan' | 'purple';
export type HeroKind = 'points' | 'combo' | 'longest';

/** The one named opponent shown in the face-off (winner→runner-up, loser→winner). */
export interface BragRival {
  name: string;
  score: number;
}

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
  /** The named face-off rival, or undefined when no opponent name is known. */
  rival?: BragRival;
  /** Players beyond you + the named rival (the "and N others"). 0 = pure 1v1. */
  othersCount: number;
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

  // The closest opponent IS the face-off rival (see header). When present we frame
  // a 1-on-1 + "and N others"; when not, we fall back to anonymous count copy.
  const rival: BragRival | undefined = input.opponentName
    ? { name: input.opponentName, score: input.opponentScore ?? 0 }
    : undefined;
  const othersCount = rival
    ? Math.max(0, input.playerCount - 2) // you + the named rival
    : Math.max(0, input.playerCount - 1); // everyone, since no one is named

  let outcome: BragOutcome;
  let headlineKey: string;
  let headlineParams: Record<string, string | number>;

  // Headlines carry the BOAST; the face-off scoreline carries the NUMBERS. So
  // headline params never include score/opponent — printing them here would
  // restate the scoreline shown under the avatars (the dup the card avoids).
  if (input.isWinner && input.playerCount <= 2 && rival) {
    outcome = 'winner_2p';
    headlineKey = 'brag.headline.crushed';
    headlineParams = { name: rival.name };
  } else if (input.isWinner && rival) {
    outcome = 'winner_np';
    headlineKey = 'brag.headline.topped'; // names the runner-up + the rest
    headlineParams = { name: rival.name, count: othersCount };
  } else if (input.isWinner) {
    outcome = 'winner_np';
    headlineKey = 'brag.headline.won'; // anonymous fallback
    headlineParams = { count: othersCount };
  } else if (rival) {
    outcome = 'non_winner';
    headlineKey = 'brag.headline.revenge'; // names the winner you're coming for
    headlineParams = { name: rival.name };
  } else {
    outcome = 'non_winner';
    headlineKey = 'brag.headline.challenge'; // anonymous taunt
    headlineParams = {};
  }

  return { outcome, headlineKey, headlineParams, hero, accent, isRTL, rival, othersCount };
}

/**
 * Share-sheet boast for the brag card's native Share action. Unlike the card
 * (pixels carry the numbers), share TEXT travels without the screenshot, so it
 * carries the scoreline itself: win → taunt the beaten rival, loss → recruit
 * backup against the winner, no known rival → plain score flex.
 */
export function deriveBragShareText(
  data: BragCardData,
  score: number
): { key: string; params: Record<string, string | number> } {
  if (data.rival) {
    return {
      key: data.outcome === 'non_winner' ? 'brag.shareTextLoss' : 'brag.shareTextWin',
      params: { name: data.rival.name, score, rivalScore: data.rival.score },
    };
  }
  return { key: 'brag.shareTextSolo', params: { score } };
}
