/**
 * Class pulse — one honest sentence about a class, derived in one place.
 *
 * The teacher dashboard's old `StudentsPresentStrip` rendered `member_count`
 * under the copy "{count} students are in {classroom} right now". That is the
 * ENROLMENT count: a class of 28 with an empty room told the teacher 28
 * students were present, and it said so in the loudest cyan slab on the page.
 * Presence, participation and enrolment are three different facts about a
 * class and this module keeps them three different fields — `rosterCount`,
 * `playedCount`, `absentCount` — so no caller can quietly print one under the
 * other's label again.
 *
 * Pure on purpose. Everything here is a function of data the teacher already
 * owns, which means the whole "what is the state of my class" question is
 * unit-testable without a socket, a classroom or a browser.
 *
 * Deliberately built from the LAST GAME only, never a cross-game trend. That
 * line is the product's, not this module's: `TeacherDashboard` puts last-game
 * insights on the free side and sells the multi-game trend view as Pro. A
 * pulse that quietly needed Pro data would be invisible to exactly the
 * teachers it is meant to orient.
 */

/** Below this accuracy in the last game, a student is flagged as struggling. */
export const STRUGGLING_ACCURACY_PCT = 60;
/** How many struggling students to NAME. The count is reported separately. */
export const STRUGGLING_LIST_LIMIT = 3;
/** How many missed words to surface as review chips. */
export const MISSED_WORD_LIST_LIMIT = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What the class is, in one word — and what the card's colour and stripe
 * encode, so the state is readable as form and not only as text.
 */
export type ClassPulseState = 'noRoster' | 'neverPlayed' | 'needsReview' | 'ready' | 'unknown';

/** The single thing worth doing next. One state, one action, no menu. */
export type ClassNextAction = 'invite' | 'play' | 'review' | 'playAgain' | 'retry';

export interface ClassPulsePlayer {
  studentId: string;
  name: string;
  accuracyPct: number;
}

/**
 * The shape this module needs from a finished classroom game — a structural
 * subset of `RecentClassroomGame` (lib/supabase/analyticsLastGame), not an
 * import of it. Keeping it structural means the fixtures in the test are the
 * contract, and a field added upstream cannot silently change the derivation.
 */
export interface ClassPulseLastGame {
  playedAt: string;
  gameMode: string;
  participation: { played: number; roster: number };
  averageAccuracyPct: number;
  players: ClassPulsePlayer[];
  missedWords: Array<{ word: string; pct: number }>;
}

export interface ClassPulseInput {
  rosterCount: number;
  lastGame: ClassPulseLastGame | null;
  /**
   * True when the last-game read FAILED, as opposed to coming back empty.
   *
   * Without this the two collapse into the same `lastGame: null` and the card
   * tells a teacher whose network blipped that their class has never played —
   * a failure wearing a fact's clothes, which is the shape of silent failure
   * this repo keeps paying for (pitfall class 4). An unknown history gets its
   * own state and its own action: retry.
   */
  lastGameUnavailable?: boolean;
  now?: number;
}

export interface ClassPulse {
  state: ClassPulseState;
  nextAction: ClassNextAction;
  /** Students enrolled. NOT students present, and never printed as such. */
  rosterCount: number;
  /** Students who played the last game; null when there is no last game. */
  playedCount: number | null;
  /**
   * The roster size AT THE TIME of the last game — which is not always
   * `rosterCount`, because students join and leave between games.
   *
   * Reported separately so the participation line can read "7 of 10 played"
   * and stay self-consistent. Folding it into `rosterCount` would put "28
   * enrolled" and "7 played, 3 absent" on the same card, where 7 + 3 ≠ 28 and
   * the teacher is left doing arithmetic that does not work.
   */
  gameRosterCount: number | null;
  /** Roster-at-game-time students who did not play it; null with no last game. */
  absentCount: number | null;
  averageAccuracyPct: number | null;
  gameMode: string | null;
  daysSinceLastGame: number | null;
  /** Up to STRUGGLING_LIST_LIMIT students, worst accuracy first. */
  struggling: ClassPulsePlayer[];
  /** How many there actually are — the list is capped, this is not. */
  strugglingCount: number;
  /** Up to MISSED_WORD_LIST_LIMIT words, most-missed first. */
  topMissedWords: string[];
}

/**
 * Whole days between two instants, floored, never negative and never NaN.
 *
 * A clock skew or a bad row used to be able to reach the teacher's screen as
 * "NaN days ago" / "-2 days ago"; both are silent-failure shapes (pitfall
 * class 4) that look like data rather than like a fault.
 */
function wholeDaysSince(iso: string, now: number): number | null {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  return Math.max(0, Math.floor((now - then) / DAY_MS));
}

/** The shape every "we cannot say" branch returns — no number it cannot back up. */
function emptyPulse(
  state: ClassPulseState,
  nextAction: ClassNextAction,
  rosterCount: number
): ClassPulse {
  return {
    state,
    nextAction,
    rosterCount,
    playedCount: null,
    gameRosterCount: null,
    absentCount: null,
    averageAccuracyPct: null,
    gameMode: null,
    daysSinceLastGame: null,
    struggling: [],
    strugglingCount: 0,
    topMissedWords: [],
  };
}

export function deriveClassPulse({
  rosterCount,
  lastGame,
  lastGameUnavailable = false,
  now = Date.now(),
}: ClassPulseInput): ClassPulse {
  // An empty class is an empty class whatever its history: the teacher's next
  // move is to get students in, and nothing below that matters until they are.
  if (rosterCount <= 0) {
    return emptyPulse('noRoster', 'invite', 0);
  }

  // Checked BEFORE the empty-history branch: a failed read also arrives as
  // `lastGame: null`, and answering it with "never played · go play" is the
  // lie this branch exists to prevent.
  if (lastGameUnavailable) {
    return emptyPulse('unknown', 'retry', rosterCount);
  }

  if (!lastGame) {
    return emptyPulse('neverPlayed', 'play', rosterCount);
  }

  const struggling = lastGame.players
    .filter((p) => p.accuracyPct < STRUGGLING_ACCURACY_PCT)
    .sort((a, b) => a.accuracyPct - b.accuracyPct);

  const topMissedWords = lastGame.missedWords
    // A word at 0% is a word the class got right — it is in the list because
    // the list is every lesson word, not because anyone missed it.
    .filter((w) => w.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, MISSED_WORD_LIST_LIMIT)
    .map((w) => w.word);

  const needsReview = struggling.length > 0 || topMissedWords.length > 0;

  return {
    state: needsReview ? 'needsReview' : 'ready',
    nextAction: needsReview ? 'review' : 'playAgain',
    rosterCount,
    playedCount: lastGame.participation.played,
    gameRosterCount: lastGame.participation.roster,
    // Guests play classroom games, so `played` can exceed the roster. Clamped
    // because "-4 absent" costs the whole screen its credibility.
    absentCount: Math.max(0, lastGame.participation.roster - lastGame.participation.played),
    averageAccuracyPct: lastGame.averageAccuracyPct,
    gameMode: lastGame.gameMode,
    daysSinceLastGame: wholeDaysSince(lastGame.playedAt, now),
    struggling: struggling.slice(0, STRUGGLING_LIST_LIMIT),
    strugglingCount: struggling.length,
    topMissedWords,
  };
}
