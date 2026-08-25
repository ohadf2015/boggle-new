/**
 * Word Tower daily-loop regressions (2026-08-25 data audit).
 *
 * Every assertion here corresponds to a defect that shipped and was measured in
 * production. `WordTowerPlay` cannot be render-tested (canvas/pixi/audio), so
 * these are source-level guards in the same style as WordTowerGame.dailyChrome.
 *
 * Evidence, all 14d unless noted:
 *  - game_started 24 / game_completed 0 / game_abandoned 24 (mode=word-tower)
 *  - 11 of 20 daily attempts <= 3m, i.e. one 3-letter word, none improving later
 *  - two returning players re-posted an unchanged height on a later day
 *    (334 -> 334, 99 -> 99), because the daily score was the LIFETIME tower
 *  - all 20 rows: floors = 0, longest_word = NULL
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Comments quote the very patterns these guards forbid — assert against CODE. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const play = code(readFileSync(resolve(__dirname, '../WordTowerPlay.tsx'), 'utf8'));
const game = code(readFileSync(resolve(__dirname, '../WordTowerGame.tsx'), 'utf8'));

describe('completion credit', () => {
  it('does not hardcode `completed: false` on trackGameEnd', () => {
    // The hardcoded false produced 0 completions across every session ever, and
    // — the real damage — gated OUT incrementGamesPlayed, first_mode_played and
    // markFirstGameActivation, so Word Tower players were invisible to
    // activation tracking.
    expect(play).toMatch(/Math\.max\(0, floorsBuilt\),\s*\n\s*floorsBuilt > 0,/);
  });
});

describe('mount is not play', () => {
  // The tower persists across days, so a returning player mounts with floors
  // already built. Anything gated on "are there floors?" fires on page open.
  it('gates the daily streak on floors placed THIS VISIT', () => {
    expect(play).toMatch(/daily && floorsThisVisit >= 1/);
    expect(play).not.toMatch(/daily && floorsCount >= 1/);
  });

  it('gates the personal-record celebration on floors placed THIS VISIT', () => {
    expect(play).toMatch(/if \(!daily \|\| newBestShown \|\| floorsThisVisit < 1\) return;/);
  });

  it('gates the daily submission on floors placed THIS VISIT', () => {
    expect(play).toMatch(/if \(!daily \|\| floorsThisVisit < 1\) return;/);
  });

  it('measures a record against the LIFETIME high-water mark, not a per-day slot', () => {
    // `wt-daily-best-<today>` is absent each morning and read as 0, so a 334m
    // restored tower "beat its best" at mount: confetti for placing nothing.
    expect(game).toMatch(/initialGame\.heightHighWaterM/);
    expect(game).not.toMatch(/localStorage\.getItem\(`wt-daily-best-/);
  });
});

describe('the daily score is TODAY, not a lifetime total', () => {
  it('submits the climb delta rather than the cumulative tower height', () => {
    expect(game).toMatch(/persistDailyClimb/);
    expect(game).toMatch(/mergeDailyBest\(stored, result\.climbM\)/);
  });

  it('reports the climb from a day baseline instead of raw game.heightM', () => {
    expect(play).toMatch(/todayClimbM\(game\.heightM, dayStartHeightM\)/);
    expect(play).not.toMatch(/onNewDailyBest\?\.\(game\.heightM\)/);
  });

  it('keeps the day baseline out of the tower save blob (single owner)', () => {
    // Two sources resolving at different times (local session vs DB
    // current_state) would make a baseline in the blob stale — Class 1.
    expect(game).toMatch(/dayStartKey/);
    expect(game).not.toMatch(/state\.dayStart/);
  });

  it('re-stamps the baseline when the later DB state replaces the local one', () => {
    expect(game).toMatch(/const serverDs = stampDayStart\(serverGame\)/);
  });
});

describe('leaderboard payload', () => {
  it('sends floors and longestWord, which the route has always read', () => {
    // Their absence is why all 20 rows carry floors = 0 and a NULL longest_word,
    // and the board renders "0" floors for every player.
    expect(game).toMatch(/floors: result\.floors/);
    expect(game).toMatch(/longestWord: result\.longestWord \|\| null/);
  });
});

describe('rivals', () => {
  it('does not hardcode an empty rival list', () => {
    // Word Tower is daily-only, so `rivals={[]}` disabled the ghost rail, the
    // next-rival chip and the whole chase for the ENTIRE mode.
    expect(game).not.toMatch(/rivals=\{\[\]\}/);
    expect(game).toMatch(/rivals=\{rivals\}/);
    expect(game).toMatch(/rivalsFromLeaderboard/);
  });

  it('rebases rival climbs onto the viewer baseline so the rail shares one scale', () => {
    expect(game).toMatch(/heightM: dayStartHeightM \+ r\.heightM/);
  });

  it('actually RENDERS the rail and chase chip', () => {
    // Populating the prop is not enough: both were gated behind `!daily`, and
    // `daily` is unconditionally true, so they never reached the screen.
    // Scoped to the rival block: the SabotageBay's own `!daily` gate is correct
    // and stays (the wreck system is dead — 0 wrecks since 2026-07-13).
    expect(play).toMatch(/<WordTowerRivalRail/);
    expect(play).toMatch(/<WordTowerNextRivalChip/);
    expect(play).not.toMatch(/!daily && \(\s*<>\s*<WordTowerRivalRail/);
  });

  it('derives displayRivals from the prop, with no daily short-circuit', () => {
    const sab = code(readFileSync(resolve(__dirname, '../useSabotage.ts'), 'utf8'));
    expect(sab).toMatch(/const displayRivals = useMemo\(\s*\n?\s*\(\) => rivals\.map\(/);
  });
});

describe('wheel-economy telemetry', () => {
  it('emits the paywall wall event, the leading candidate for the one-word cliff', () => {
    expect(play).toMatch(/wordtower_wall_reached/);
    expect(play).toMatch(/wordtower_scramble_used/);
  });
});
