import { describe, it, expect } from 'vitest';
import {
  getDailyQuests,
  evaluateDailyQuests,
  emptyQuestResult,
  DAILY_QUEST_POOL,
  QUEST_PUBLIC_MODES,
  QUEST_BETA_MODES,
  isQuestEligibleMode,
  questResultForWordWheel,
  type DailyQuest,
  type QuestGameResult,
  type QuestConditionType,
} from '../dailyQuestPool';

const DATES = Array.from({ length: 60 }, (_, day) =>
  new Date(Date.UTC(2026, 4, 1) + day * 86_400_000).toISOString().split('T')[0],
);

describe('getDailyQuests', () => {
  it('returns exactly 3 quests', () => {
    expect(getDailyQuests('2026-05-13')).toHaveLength(3);
  });

  it('returns 3 distinct quest ids', () => {
    const ids = getDailyQuests('2026-05-13').map(q => q.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('returns only quests from the pool', () => {
    const poolIds = new Set(DAILY_QUEST_POOL.map(q => q.id));
    for (const q of getDailyQuests('2026-05-13')) {
      expect(poolIds).toContain(q.id);
    }
  });

  it('is deterministic — same date yields same quests', () => {
    expect(getDailyQuests('2026-05-13')).toEqual(getDailyQuests('2026-05-13'));
  });

  it('uses current date when none provided', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(getDailyQuests()).toEqual(getDailyQuests(today));
  });

  it('never serves two quests of the same condition type in a day', () => {
    for (const date of DATES) {
      const types = getDailyQuests(date).map(q => q.type);
      expect(new Set(types).size).toBe(types.length);
    }
  });

  it('serves at most one PvP quest per day (soloable Grand Slam)', () => {
    for (const date of DATES) {
      const pvp = getDailyQuests(date).filter(q => q.family === 'pvp');
      expect(pvp.length).toBeLessThanOrEqual(1);
    }
  });

  it('every quest href points to a public (non-beta) route', () => {
    const publicHrefs = new Set(['/daily', '/multiplayer', '/brain', '/singleplayer']);
    for (const date of DATES) {
      for (const q of getDailyQuests(date)) {
        expect(publicHrefs).toContain(q.href);
      }
    }
  });

  it('never references adventure or any beta mode', () => {
    for (const date of DATES) {
      for (const q of getDailyQuests(date)) {
        expect(q.href).not.toContain('adventure');
        expect(q.mode ?? '').not.toBe('adventure');
        if (q.mode) expect(QUEST_PUBLIC_MODES).toContain(q.mode);
      }
    }
  });

  it('produces variety across 20 consecutive dates', () => {
    const seen = new Set(DATES.slice(0, 20).map(d => getDailyQuests(d).map(q => q.id).join(',')));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('quest achievability — href must route to a seam that credits its condition', () => {
  // What each game-end seam (keyed by the route that reaches it) can actually
  // credit. A quest is only achievable via its href if that route's seam
  // populates the field its condition checks.
  //   /multiplayer  → classic socket seam: every skill metric + pvp
  //   /brain        → brain seam: score, wordsFound
  //   /daily        → word-hunt seam: longestWordLength + wordsFound, BUT the
  //                   daily grid guarantees neither a 7-letter target nor 15
  //                   words, so longWord/wordsInGame are NOT reliably creditable
  //                   there; only the word-hunt playMode quest is guaranteed.
  //   /singleplayer → never reaches a seam, no comboLevel → credits nothing.
  const SEAM_CREDITS: Record<string, Set<QuestConditionType>> = {
    '/multiplayer': new Set<QuestConditionType>([
      'longWord', 'score', 'wordsInGame', 'combo', 'mpWin', 'beatHuman', 'playMode',
    ]),
    '/brain': new Set<QuestConditionType>(['score', 'wordsInGame', 'playMode']),
    /* The daily seams report a word list, so they credit longWord and
       wordsInGame for real — see the emptyQuestResult call in
       backend/routes/dailyChallenge/wordHuntRoutes.ts and questResultForWordWheel.
       `score` is deliberately NOT listed: the wheel does report a score, but the
       pool's score targets (300/500) are calibrated for the classic socket game
       and are unreachable on a daily board, so this keeps steering them away. */
    '/daily': new Set<QuestConditionType>(['playMode', 'longWord', 'wordsInGame']),
    '/singleplayer': new Set<QuestConditionType>([]),
  };

  it('every quest is completable via the route it steers players to', () => {
    for (const quest of DAILY_QUEST_POOL) {
      const credits = SEAM_CREDITS[quest.href];
      expect(credits, `unknown href ${quest.href} for ${quest.id}`).toBeDefined();
      expect(
        credits.has(quest.type),
        `${quest.id} (${quest.type}) steers to ${quest.href}, whose seam cannot credit it`,
      ).toBe(true);
    }
  });

  it('playMode quests steer to the route for their specific mode', () => {
    const MODE_ROUTE: Record<string, string> = {
      multiplayer: '/multiplayer',
      brain: '/brain',
      'word-hunt': '/daily',
      // Word Wheel is a public daily game on the same hub.
      'word-wheel': '/daily',
    };
    for (const quest of DAILY_QUEST_POOL.filter(q => q.type === 'playMode')) {
      expect(quest.href).toBe(MODE_ROUTE[quest.mode as string]);
    }
  });
});

describe('evaluateDailyQuests', () => {
  const byId = (id: string): DailyQuest => {
    const q = DAILY_QUEST_POOL.find(x => x.id === id);
    if (!q) throw new Error(`no quest ${id}`);
    return q;
  };
  const run = (ids: string[], partial: Partial<QuestGameResult>): number[] =>
    evaluateDailyQuests(ids.map(byId), emptyQuestResult(partial));

  it('returns the slot index of a satisfied longWord quest', () => {
    expect(run(['long_word_6'], { longestWordLength: 6 })).toEqual([0]);
  });

  it('does not complete longWord below target', () => {
    expect(run(['long_word_6'], { longestWordLength: 5 })).toEqual([]);
  });

  it('completes score quest at/above target only', () => {
    expect(run(['score_500'], { score: 500 })).toEqual([0]);
    expect(run(['score_500'], { score: 499 })).toEqual([]);
  });

  it('completes combo quest at/above target only', () => {
    expect(run(['combo_6'], { maxCombo: 6 })).toEqual([0]);
    expect(run(['combo_6'], { maxCombo: 5 })).toEqual([]);
  });

  it('beatHuman requires outscoring a real human, not a bot', () => {
    expect(run(['beat_human'], { beatHumanOpponent: true })).toEqual([0]);
    // top of an all-bot lobby — no human beaten
    expect(run(['beat_human'], { isTopHuman: true, beatHumanOpponent: false, humanOpponentCount: 0 })).toEqual([]);
  });

  it('mpWin requires being top human with at least one human opponent', () => {
    expect(run(['mp_win'], { isMultiplayer: true, isTopHuman: true, humanOpponentCount: 1 })).toEqual([0]);
    expect(run(['mp_win'], { isMultiplayer: true, isTopHuman: true, humanOpponentCount: 0 })).toEqual([]);
  });

  it('playMode multiplayer completes only on a real multiplayer game', () => {
    expect(run(['play_mp'], { isMultiplayer: true })).toEqual([0]);
    expect(run(['play_mp'], { isMultiplayer: false })).toEqual([]);
  });

  it('returns multiple slot indices when several of today\'s quests are satisfied', () => {
    const idx = run(['long_word_6', 'score_500'], { longestWordLength: 8, score: 600 });
    expect(idx).toEqual([0, 1]);
  });

  it('returns empty for an empty result (no silent false-positive)', () => {
    expect(run(['long_word_6', 'score_500', 'words_15'], {})).toEqual([]);
  });
});

describe('difficulty ceiling', () => {
  it('no daily longWord quest asks for a 7+ letter word (too hard for casuals)', () => {
    for (const quest of DAILY_QUEST_POOL) {
      if (quest.type === 'longWord') {
        expect(quest.target).toBeLessThanOrEqual(6);
      }
    }
  });
});

describe('isQuestEligibleMode — beta modes never credit quest progress', () => {
  it('excludes every beta mode', () => {
    for (const mode of QUEST_BETA_MODES) {
      expect(isQuestEligibleMode(mode)).toBe(false);
    }
  });

  it('allows classic multiplayer and word-hunt', () => {
    expect(isQuestEligibleMode('classic')).toBe(true);
    expect(isQuestEligibleMode('word-hunt')).toBe(true);
  });

  it('fails open — an unknown/new mode credits by default (blocklist, not allowlist)', () => {
    expect(isQuestEligibleMode('some-future-public-mode')).toBe(true);
    expect(isQuestEligibleMode(undefined)).toBe(true);
  });
});

/**
 * The daily hub advertises "Daily Missions" above three daily games, so the
 * quests it shows have to be about those games and finishable inside them.
 *
 * Two things were wrong. Finishing the daily Word Wheel credited the WEEKLY
 * `dailyChallengesCompleted` counter but never called the daily-quest seam at
 * all, so it moved no mission. And the pool steered almost every quest to
 * /multiplayer or /brain — a player standing on /daily was being told to leave.
 */
describe('daily quests are reachable from the daily challenges', () => {
  it('accepts the daily game modes as quest-eligible', () => {
    // These are public daily games on the hub, not beta experiments.
    expect(isQuestEligibleMode('word-hunt')).toBe(true);
    expect(isQuestEligibleMode('word-wheel')).toBe(true);
  });

  it('offers a discovery quest for each public daily game', () => {
    const dailyModes = DAILY_QUEST_POOL
      .filter((q) => q.type === 'playMode')
      .map((q) => q.mode);

    expect(dailyModes).toContain('word-hunt');
    expect(dailyModes).toContain('word-wheel');
  });

  it('points every quest a daily game can satisfy at /daily', () => {
    // What the daily seams actually report: a mode, a word count and a longest
    // word. Not score, not combo — so score/combo quests correctly stay away.
    const satisfiableByDaily: QuestConditionType[] = ['longWord', 'wordsInGame'];

    const misdirected = DAILY_QUEST_POOL
      .filter((q) => satisfiableByDaily.includes(q.type))
      .filter((q) => !q.href.startsWith('/daily'));

    expect(misdirected.map((q) => q.id)).toEqual([]);
  });

  it('builds a quest result from a finished Word Wheel run', () => {
    const result = questResultForWordWheel({
      score: 64,
      wordsFound: ['CAT', 'BRIDGE', 'TRAIN'],
    });

    expect(result.mode).toBe('word-wheel');
    expect(result.wordsFound).toBe(3);
    expect(result.longestWordLength).toBe(6);
    expect(result.score).toBe(64);
    // A solo daily run is never a PvP win, whatever the score.
    expect(result.isMultiplayer).toBe(false);
    expect(result.beatHumanOpponent).toBe(false);
  });

  it('survives a Word Wheel run that found nothing', () => {
    const result = questResultForWordWheel({ score: 0, wordsFound: [] });
    expect(result.wordsFound).toBe(0);
    expect(result.longestWordLength).toBe(0);
  });
});
