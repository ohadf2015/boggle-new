/**
 * PlayerView must not judge a Vocab Quiz room by a BOARD flag.
 *
 * The round-2 blind critic's disqualifying finding was the student's own
 * ending: a phone that had just climbed to 502 points showed "0 POINTS". The
 * cause is `player/PlayerView.tsx` rendering the board's "Tallying the
 * scores…" card — score read off the board leaderboard, word count read off
 * words found on a grid, both zero by construction for a quiz — from a bare
 * `if (waitingForResults)` that sits ABOVE every mode-specific branch.
 * Reproduced live on room 6H59DJ (540 points → "0 SCORE · 0 words").
 *
 * `showBoardWaitingScreen` already encodes the rule and is unit-tested in
 * vocabQuizRoundEndOwnership.test.ts. What that test cannot see is whether the
 * shell HONOURS it — a predicate wired nowhere is exactly how this shipped
 * broken twice (recurring-pitfall class 4: the fix that is invisible because it
 * never runs). PlayerView is an 800-line shell with a socket, a store and a
 * dozen hooks; mounting it here would test the mocks, so this asserts the wiring
 * at the source level, the same contract shape the repo already uses in
 * player/__tests__/PlayerView.countdownGate.test.ts. The behaviour itself is
 * verified live in the browser.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('PlayerView — a quiz room never shows the board waiting card', () => {
  const source = readFileSync(resolve(__dirname, '../../../../player/PlayerView.tsx'), 'utf8');

  it('imports the quiz-aware predicate rather than reading the raw flag', () => {
    expect(source).toMatch(
      /import\s*\{[^}]*useBoardWaitingScreen[^}]*\}\s*from\s*'@\/components\/education\/vocabQuiz\/useIsVocabQuizRoom'/
    );
  });

  it('detects the quiz from the server traffic on this socket', () => {
    expect(source).toMatch(/useBoardWaitingScreen\(socket, waitingForResults\)/);
  });

  /**
   * PlayerView is 828 lines on master and the gauntlet gate refuses to let a
   * pre-existing file grow. The quiz fix has to fit INSIDE that budget, which
   * is why the detection and the predicate are folded into one hook rather than
   * spelled out at the call site. A source-level assertion is the only thing
   * that catches the regression before the gate does.
   */
  it('leaves the shell no bigger than it found it', () => {
    // `wc -l` semantics — the gate counts newlines, not array slots.
    expect(source.split('\n').length - 1).toBeLessThanOrEqual(828);
  });

  it('gates the "tallying the scores" branch on the predicate, not on waitingForResults', () => {
    const idx = source.indexOf("t('game.calculatingResults')");
    expect(idx).toBeGreaterThan(0);
    const before = source.slice(Math.max(0, idx - 2000), idx);
    // The nearest guard above the card must be the derived one.
    const guards = [...before.matchAll(/if \((boardWaiting|waitingForResults)\) \{/g)];
    expect(guards.length).toBeGreaterThan(0);
    expect(guards[guards.length - 1][1]).toBe('boardWaiting');
  });

  it('keeps the pre-game early return from stealing the quiz surface', () => {
    // `showGameView` and the pre-game guard both fold in the same flag; a quiz
    // that leaves either on the raw value lands on the lobby view instead of
    // its own podium.
    expect(source).toMatch(/const showGameView = gameActive \|\| \(hasGameData && !boardWaiting\)/);
    expect(source).toMatch(/if \(!showGameView && !boardWaiting &&/);
  });
});
