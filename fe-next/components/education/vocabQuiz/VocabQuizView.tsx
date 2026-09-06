/**
 * Live Vocab Quiz — the student's phone.
 *
 * One screen, four states: question, locked-in, reveal, finished. Everything a
 * student needs is above the fold on a 390px phone — prompt, clock, four
 * buttons — because in a real classroom they look down for three seconds at a
 * time.
 *
 * Dark-only surface: `bg-neo-navy` is hardcoded rather than
 * `bg-neo-cream dark:bg-neo-navy`, which flashes cream on a lazy mount before
 * the dark class resolves (Class 5 in .claude/rules/60-recurring-pitfalls.md).
 */

'use client';

import { useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { Flame, PauseCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { useVocabQuiz } from './useVocabQuiz';
import { VocabQuizAnswerGrid } from './VocabQuizAnswerGrid';
import { VocabQuizStandings } from './VocabQuizStandings';

export interface VocabQuizViewProps {
  socket: Socket | null;
  username: string;
  t: TranslateFn;
}

export function VocabQuizView({ socket, username, t }: VocabQuizViewProps) {
  const quiz = useVocabQuiz(socket);
  const { question, reveal, myAnswer, pendingChoice, phase } = quiz;

  const focusLabel = useMemo(
    () => (question ? t(`vocabQuiz.focus.${question.focus}`) : ''),
    [question, t]
  );

  // The clock turns orange in the last five seconds — urgency is a reserved
  // semantic for that colour, and it reads without needing to parse a number.
  const urgent = quiz.secondsLeft <= 5 && quiz.secondsLeft > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy text-neo-white p-4 gap-4">
      {/* Header: progress, streak, score */}
      <header className="flex items-center gap-3">
        <span className="font-neo-display font-bold text-sm text-neo-white/70">
          {t('vocabQuiz.progress', {
            current: quiz.questionNumber || 1,
            total: quiz.totalQuestions || 1,
          })}
        </span>
        {quiz.myStreak > 1 && (
          <span
            className="flex items-center gap-1 text-neo-orange font-bold animate-neo-pop"
            aria-label={t('vocabQuiz.streak.label', { count: quiz.myStreak })}
          >
            <Flame className="w-5 h-5" aria-hidden />
            {quiz.myStreak}
          </span>
        )}
        <span className="ms-auto font-neo-display font-bold text-xl tabular-nums text-neo-lime">
          {quiz.myScore}
        </span>
      </header>

      {/* Timer bar */}
      {phase === 'question' && (
        <div
          className="h-3 w-full rounded-neo border-neo border-neo-black bg-neo-navy-elevated overflow-hidden"
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
        <div className="flex items-center gap-2 rounded-neo border-neo border-neo-black bg-neo-purple px-4 py-3 shadow-hard">
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
          <div className="rounded-neo border-neo border-neo-black bg-neo-navy-elevated p-4 shadow-hard">
            <p className="text-xs font-bold uppercase tracking-wide text-neo-cyan mb-2">{focusLabel}</p>
            <p className="font-neo-display font-bold text-xl leading-snug break-words">{question.prompt}</p>
          </div>

          <VocabQuizAnswerGrid
            choices={question.choices}
            selectedIndex={myAnswer?.choiceIndex ?? pendingChoice}
            correctIndex={phase === 'reveal' && reveal ? reveal.answerIndex : null}
            disabled={phase === 'reveal' || pendingChoice !== null || quiz.paused}
            onSelect={quiz.answer}
            t={t}
          />
        </>
      )}

      {/* Locked in, waiting for the rest of the class */}
      {phase === 'question' && pendingChoice !== null && (
        <p className="text-center font-neo-body text-neo-white/70">{t('vocabQuiz.lockedIn')}</p>
      )}

      {/* Reveal feedback */}
      {phase === 'reveal' && reveal && (
        <div className="space-y-3">
          <div
            className={cn(
              'rounded-neo border-neo border-neo-black px-4 py-3 shadow-hard font-neo-display font-bold',
              myAnswer?.correct ? 'bg-neo-lime text-neo-black' : 'bg-neo-red text-neo-white'
            )}
            role="status"
          >
            {myAnswer
              ? myAnswer.correct
                ? t('vocabQuiz.feedback.correct', { points: myAnswer.points })
                : t('vocabQuiz.feedback.wrong', { answer: reveal.answer })
              : t('vocabQuiz.feedback.noAnswer', { answer: reveal.answer })}
          </div>

          {myAnswer?.correct && (myAnswer.speedBonus > 0 || myAnswer.streakBonus > 0) && (
            <p className="text-sm font-neo-body text-neo-white/70">
              {t('vocabQuiz.feedback.breakdown', {
                base: myAnswer.points - myAnswer.speedBonus - myAnswer.streakBonus,
                speed: myAnswer.speedBonus,
                streak: myAnswer.streakBonus,
              })}
            </p>
          )}

          {reveal.definition && (
            <p className="text-sm font-neo-body text-neo-white/80">
              <span className="font-bold text-neo-cyan">{reveal.word}</span>
              <span className="mx-1">—</span>
              {reveal.definition}
            </p>
          )}

          <VocabQuizStandings standings={quiz.standings} meUsername={username} limit={3} t={t} />
        </div>
      )}

      {/* Finished */}
      {phase === 'ended' && (
        <div className="flex-1 flex flex-col gap-4">
          <h2 className="flex items-center gap-2 font-neo-display font-bold text-2xl">
            <Trophy className="w-7 h-7 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          <p className="font-neo-body text-neo-white/80">
            {t('vocabQuiz.finished.yourScore', { score: quiz.myScore })}
          </p>
          <VocabQuizStandings standings={quiz.standings} meUsername={username} limit={10} t={t} />
        </div>
      )}
    </div>
  );
}

export default VocabQuizView;
