/**
 * Live Vocab Quiz — the payoff wire.
 *
 * Two small, additive server jobs the celebration layer cannot do on its own:
 *
 * 1. `buildLockIn` — a live commitment count WHILE the clock runs. Without it a
 *    projector can only show the distribution once the question is over, which
 *    is the difference between a scoreboard and a room watching itself decide.
 * 2. `nextQuestionHint` / `decorateReveal` — the first letter and length of the
 *    word the class meets next, so the between-questions 3-2-1 teases it.
 *
 * Deliberately separate from `vocabQuizEngine.ts` and `vocabQuizHandler.ts`:
 * both are at their size ceilings, and neither needs to know about juice. This
 * module is pure — no sockets, no timers — so the handler stays the only place
 * that touches the wire.
 *
 * The lock-in payload carries NO correctness signal. Which choice is right ships
 * only in the reveal, exactly as before; a student reading this event off the
 * wire learns no more than the projector is already showing the whole room.
 */

import type { VocabQuizLockIn, VocabQuizNextHint, VocabQuizReveal } from '@/shared/types/vocabQuiz';
import type { VocabQuizSession } from './vocabQuizEngine.js';

/**
 * Who has committed to what, right now.
 *
 * Reads `session.answers`, which `advanceQuiz` clears on every question
 * boundary — so the count resets for free rather than through a second reset
 * path that a new mode could forget to call (Class 2 in the recurring-pitfalls
 * rules).
 */
export function buildLockIn(session: VocabQuizSession): VocabQuizLockIn {
  const question = session.questions[session.index];
  const distribution = new Array<number>(question ? question.choices.length : 0).fill(0);

  for (const answer of session.answers.values()) {
    if (answer.choiceIndex >= 0 && answer.choiceIndex < distribution.length) {
      distribution[answer.choiceIndex] += 1;
    }
  }

  return {
    gameCode: session.gameCode,
    index: session.index,
    locked: session.answers.size,
    total: session.players.size,
    distribution,
  };
}

/**
 * The next word, reduced to what a countdown can show without giving the
 * question away: its initial and how many letters it runs to.
 *
 * Null on the last question — there is no next word, and a countdown that
 * teases one would be lying to a class about to see final scores.
 */
export function nextQuestionHint(session: VocabQuizSession): VocabQuizNextHint | null {
  const next = session.questions[session.index + 1];
  if (!next || !next.word) return null;
  return {
    letter: next.word.charAt(0).toUpperCase(),
    length: next.word.length,
  };
}

/**
 * Add the tease to a reveal the engine already built.
 *
 * A separate "next up" event would have given the projector a beat the phones
 * never receive — two paths to one moment, which is Class 3. Instead it rides
 * the one payload every client in the room already gets.
 */
export function decorateReveal(session: VocabQuizSession, reveal: VocabQuizReveal): VocabQuizReveal {
  const hint = nextQuestionHint(session);
  return hint ? { ...reveal, nextHint: hint } : reveal;
}
