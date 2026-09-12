/**
 * Live Vocab Quiz — the student's phone.
 *
 * One screen, four states: question, locked-in, reveal, finished. The shell
 * never scrolls: header, clock and prompt are fixed-height, the answer grid
 * takes whatever is left, and the reveal arrives as a strip OVER the grid
 * rather than as four more blocks under it. That is what keeps a 390×844 phone
 * whole — the old reveal pushed the round off the bottom of the screen.
 *
 * The payoff layer lives in `useVocabQuizJuice`: a tick tightening under five
 * seconds, a chime or a buzz the instant the server judges, a stinger at three
 * and five in a row, a burst when the class sweeps, confetti for a clean sheet.
 * It respects the app mute setting for free (`playSound` returns early when SFX
 * are muted) and reduced motion (the confetti helpers no-op).
 *
 * Dark-only surface: `bg-neo-navy` is hardcoded rather than
 * `bg-neo-cream dark:bg-neo-navy`, which flashes cream on a lazy mount before
 * the dark class resolves (Class 5 in .claude/rules/60-recurring-pitfalls.md).
 */

'use client';

import { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { PauseCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { useVocabQuiz } from './useVocabQuiz';
import { useVocabQuizJuice } from './useVocabQuizJuice';
import { VocabQuizAnswerGrid } from './VocabQuizAnswerGrid';
import { VocabQuizStandings } from './VocabQuizStandings';
import { VocabQuizStudentHeader } from './VocabQuizStudentHeader';
import { VocabQuizRevealBanner } from './VocabQuizRevealBanner';
import { VocabQuizOwnFinale } from './VocabQuizOwnFinale';
import { StudentRoundOutcome } from '../results/StudentRoundOutcome';

export interface VocabQuizViewProps {
  socket: Socket | null;
  username: string;
  t: TranslateFn;
}

export function VocabQuizView({ socket, username, t }: VocabQuizViewProps) {
  const quiz = useVocabQuiz(socket);
  const { question, reveal, myAnswer, pendingChoice, phase } = quiz;

  // The student's own row out of the standings the SERVER sorted — never a
  // second ranking computed here (Class 3).
  const myIndex = quiz.standings.findIndex(
    (p) => p.username.trim().toLowerCase() === username.trim().toLowerCase()
  );
  const myStanding = myIndex >= 0 ? quiz.standings[myIndex] : undefined;

  const juice = useVocabQuizJuice({
    surface: 'student',
    phase,
    paused: quiz.paused,
    questionNumber: quiz.questionNumber,
    totalQuestions: quiz.totalQuestions,
    secondsLeft: quiz.secondsLeft,
    myAnswer,
    myStreak: quiz.myStreak,
    reveal,
    myCorrectCount: myStanding?.correctCount ?? 0,
  });

  const focusLabel = useMemo(
    () => (question ? t(`vocabQuiz.focus.${question.focus}`) : ''),
    [question, t]
  );

  // The clock turns orange in the last five seconds — urgency is a reserved
  // semantic for that colour, and it reads without needing to parse a number.
  const urgent = quiz.secondsLeft <= 5 && quiz.secondsLeft > 0;

  // Points fly into the header counter instead of being explained in prose.
  // Keyed on the question index so the same total twice still re-animates.
  const pop = myAnswer ? { points: myAnswer.points, key: myAnswer.index } : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy text-neo-white p-3 gap-2.5">
      <VocabQuizStudentHeader
        questionNumber={quiz.questionNumber}
        totalQuestions={quiz.totalQuestions}
        streak={quiz.myStreak}
        score={quiz.myScore}
        pop={pop}
        mascot={juice.mascot}
        finished={phase === 'ended'}
        lockedIn={phase === 'question' ? quiz.lockIn : null}
        rank={
          phase === 'reveal' && myIndex >= 0
            ? { position: myIndex + 1, total: quiz.standings.length }
            : null
        }
        t={t}
      />

      {/* Timer bar — it does not just shrink, it tightens: the last five
          seconds pulse in time with the tick the student is hearing. */}
      {phase === 'question' && (
        <div
          className={cn(
            'h-3 w-full shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated overflow-hidden',
            juice.ticking && 'animate-pulse'
          )}
          role="timer"
          aria-label={t('vocabQuiz.timeLeft', { seconds: quiz.secondsLeft })}
        >
          <div
            className={cn(
              'h-full transition-[width] duration-100 ease-linear',
              urgent ? 'bg-neo-orange' : 'bg-neo-cyan'
            )}
            style={{ width: `${Math.max(0, Math.min(1, quiz.fractionLeft)) * 100}%` }}
          />
        </div>
      )}

      {quiz.paused && (
        <div className="flex items-center gap-2 shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-purple px-4 py-3 text-neo-black shadow-hard">
          <PauseCircle className="w-6 h-6 shrink-0" aria-hidden />
          <span className="font-neo-display font-bold">{t('vocabQuiz.paused')}</span>
        </div>
      )}

      {/* Waiting for the round to begin */}
      {phase === 'idle' && (
        <p className="flex-1 grid place-items-center text-center font-neo-body text-neo-white/70">
          {t('vocabQuiz.waiting')}
        </p>
      )}

      {/* Question + answers */}
      {(phase === 'question' || phase === 'reveal') && question && (
        <>
          <div className="shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated p-3 shadow-hard">
            <p className="text-[11px] font-bold uppercase tracking-wide text-neo-cyan mb-1">{focusLabel}</p>
            <p className="font-neo-display font-bold text-lg leading-snug break-words">{question.prompt}</p>
          </div>

          {phase === 'question' && pendingChoice !== null && (
            <p className="shrink-0 text-center text-xs font-neo-body text-neo-white/70">
              {t('vocabQuiz.lockedIn')}
            </p>
          )}

          {/* The one region that owns the leftover height. The reveal strip
              sits inside it, over the tiles — so the page height is identical
              in both phases and nothing ever scrolls. */}
          <div className="relative flex-1 min-h-0">
            <VocabQuizAnswerGrid
              className="h-full"
              choices={question.choices}
              selectedIndex={myAnswer?.choiceIndex ?? pendingChoice}
              correctIndex={phase === 'reveal' && reveal ? reveal.answerIndex : null}
              disabled={phase === 'reveal' || pendingChoice !== null || quiz.paused}
              onSelect={quiz.answer}
              t={t}
            />

            {phase === 'reveal' && reveal && (
              <VocabQuizRevealBanner
                correct={myAnswer ? myAnswer.correct : null}
                answer={reveal.answer}
                word={reveal.word}
                definition={reveal.definition}
                sweep={juice.sweep}
                t={t}
              />
            )}
          </div>
        </>
      )}

      {/* Finished — the same shape a board round ends on: my own placing
          first, then the room's top three on plinths. One inner region
          scrolls; the shell stays locked. */}
      {phase === 'ended' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-neo-display font-bold text-2xl">
            <Trophy className="w-7 h-7 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          {myStanding ? (
            <StudentRoundOutcome
              username={username}
              standings={quiz.standings}
              mastery={{ found: myStanding.correctCount, total: quiz.totalQuestions }}
              t={t}
            />
          ) : (
            /*
             * The standings row is the normal source of the recap, and
             * `StudentRoundOutcome` renders NOTHING when it cannot find this
             * player — correct for a spectator, catastrophic for a student who
             * just watched their own score climb. A late joiner, a renamed
             * player, or a room the server scored under a different display
             * name all land here, and the round-2 critic's disqualifying
             * finding was exactly this number going missing. So the score the
             * server sent THIS socket is shown on its own: never a podium
             * placing invented on the client (Class 3), never a zero.
             */
            <div
              data-testid="vocab-quiz-own-score"
              className="rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated p-4 shadow-hard"
            >
              <p className="font-neo-body font-bold text-sm uppercase tracking-widest text-neo-cream">
                {t('education.results.you.points')}
              </p>
              <p className="font-neo-display font-black text-5xl leading-none tabular-nums text-neo-white">
                {quiz.myScore}
              </p>
            </div>
          )}
          <VocabQuizStandings standings={quiz.standings} meUsername={username} limit={10} podium t={t} />

          {/* The bottom of the phone belongs to what the student earned — the
              run they built and whether they went clean. See VocabQuizOwnFinale. */}
          <VocabQuizOwnFinale
            correct={myStanding?.correctCount ?? 0}
            total={quiz.totalQuestions}
            bestStreak={myStanding?.bestStreak ?? quiz.myStreak}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

export default VocabQuizView;
