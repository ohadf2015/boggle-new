/**
 * Live Vocab Quiz — the projector.
 *
 * Read from the back of a classroom: oversized prompt, the four options in the
 * same colours the phones show, and after the reveal a distribution bar per
 * option so the teacher can see at a glance which distractor fooled the class.
 * The join code never leaves the screen — the single most common reason a
 * student is stuck is that they cannot see it.
 */

'use client';

import type { Socket } from 'socket.io-client';
import { PauseCircle, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { useVocabQuiz } from './useVocabQuiz';
import { VocabQuizStandings } from './VocabQuizStandings';

const OPTION_BARS = [
  { fill: 'bg-neo-lime', chip: 'bg-neo-lime text-neo-black', glyph: '▲' },
  { fill: 'bg-neo-pink', chip: 'bg-neo-pink text-neo-white', glyph: '●' },
  { fill: 'bg-neo-cyan', chip: 'bg-neo-cyan text-neo-black', glyph: '■' },
  { fill: 'bg-neo-purple', chip: 'bg-neo-purple text-neo-white', glyph: '◆' },
] as const;

export interface VocabQuizHostViewProps {
  socket: Socket | null;
  /** Shown large so students can join or rejoin at any moment. */
  joinCode: string;
  playerCount?: number;
  t: TranslateFn;
}

export function VocabQuizHostView({ socket, joinCode, playerCount, t }: VocabQuizHostViewProps) {
  const quiz = useVocabQuiz(socket);
  const { question, reveal, phase } = quiz;

  const totalVotes = reveal ? reveal.distribution.reduce((a, b) => a + b, 0) : 0;
  const choices = question?.choices ?? [];
  const urgent = quiz.secondsLeft <= 5 && quiz.secondsLeft > 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neo-navy text-neo-white p-6 gap-5">
      <header className="flex items-center gap-4 flex-wrap">
        <span className="font-neo-display font-bold text-2xl text-neo-white/70">
          {t('vocabQuiz.progress', {
            current: quiz.questionNumber || 1,
            total: quiz.totalQuestions || 1,
          })}
        </span>
        {typeof playerCount === 'number' && (
          <span className="flex items-center gap-2 text-xl text-neo-white/70">
            <Users className="w-6 h-6" aria-hidden />
            {playerCount}
          </span>
        )}
        <span className="ms-auto flex items-center gap-3">
          <span className="font-neo-body text-lg text-neo-white/70">{t('vocabQuiz.host.joinCode')}</span>
          <span className="rounded-neo border-neo border-neo-black bg-neo-lime px-5 py-2 font-neo-display font-bold text-3xl tracking-widest text-neo-black shadow-hard">
            {joinCode}
          </span>
        </span>
      </header>

      {phase === 'question' && (
        <div
          className="h-5 w-full rounded-neo border-neo border-neo-black bg-neo-navy-elevated overflow-hidden"
          role="timer"
          aria-label={t('vocabQuiz.timeLeft', { seconds: quiz.secondsLeft })}
        >
          <div
            className={cn('h-full transition-[width] duration-100 ease-linear', urgent ? 'bg-neo-orange' : 'bg-neo-cyan')}
            style={{ width: `${Math.max(0, Math.min(1, quiz.fractionLeft)) * 100}%` }}
          />
        </div>
      )}

      {quiz.paused && (
        <div className="flex items-center gap-3 rounded-neo border-neo border-neo-black bg-neo-purple px-5 py-4 shadow-hard">
          <PauseCircle className="w-8 h-8 shrink-0" aria-hidden />
          <span className="font-neo-display font-bold text-2xl">{t('vocabQuiz.paused')}</span>
        </div>
      )}

      {phase === 'idle' && (
        <p className="flex-1 grid place-items-center text-center font-neo-body text-2xl text-neo-white/70">
          {t('vocabQuiz.host.waiting')}
        </p>
      )}

      {(phase === 'question' || phase === 'reveal') && question && (
        <div className="flex-1 flex flex-col gap-5 min-h-0">
          <div className="rounded-neo border-neo border-neo-black bg-neo-navy-elevated p-6 shadow-hard">
            <p className="text-sm font-bold uppercase tracking-widest text-neo-cyan mb-2">
              {t(`vocabQuiz.focus.${question.focus}`)}
            </p>
            <p className="font-neo-display font-bold text-4xl leading-snug break-words">{question.prompt}</p>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {choices.map((choice, index) => {
              const style = OPTION_BARS[index % OPTION_BARS.length];
              const votes = reveal?.distribution[index] ?? 0;
              const share = totalVotes > 0 ? votes / totalVotes : 0;
              const isCorrect = !!reveal && index === reveal.answerIndex;

              return (
                <li
                  key={`${index}-${choice}`}
                  className={cn(
                    'relative overflow-hidden rounded-neo border-neo border-neo-black bg-neo-navy-elevated shadow-hard',
                    reveal && !isCorrect && 'opacity-60'
                  )}
                >
                  {/* Distribution fill, only after the reveal. */}
                  {reveal && (
                    <div
                      className={cn('absolute inset-y-0 start-0 opacity-30 transition-[width] duration-500', style.fill)}
                      style={{ width: `${share * 100}%` }}
                      aria-hidden
                    />
                  )}
                  <div className="relative flex items-center gap-4 px-5 py-4">
                    <span
                      className={cn(
                        'grid place-items-center w-10 h-10 shrink-0 rounded-neo border-neo border-neo-black text-xl',
                        style.chip
                      )}
                      aria-hidden
                    >
                      {style.glyph}
                    </span>
                    <span className="flex-1 font-neo-display font-bold text-2xl break-words">{choice}</span>
                    {reveal && (
                      <span className="shrink-0 font-neo-display font-bold text-2xl tabular-nums">
                        {isCorrect ? `✓ ${votes}` : votes}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {reveal?.definition && (
            <p className="font-neo-body text-xl text-neo-white/80">
              <span className="font-bold text-neo-cyan">{reveal.word}</span>
              <span className="mx-2">—</span>
              {reveal.definition}
            </p>
          )}
        </div>
      )}

      {phase === 'ended' && (
        <div className="flex-1 flex flex-col gap-5">
          <h2 className="flex items-center gap-3 font-neo-display font-bold text-4xl">
            <Trophy className="w-10 h-10 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          <VocabQuizStandings standings={quiz.standings} limit={5} size="projector" t={t} />
        </div>
      )}

      {phase === 'reveal' && (
        <div className="rounded-neo border-neo border-neo-black bg-neo-navy-elevated p-4 shadow-hard-sm">
          <p className="font-neo-display font-bold text-xl mb-3">{t('vocabQuiz.standings.title')}</p>
          <VocabQuizStandings standings={quiz.standings} limit={5} size="projector" t={t} />
        </div>
      )}
    </div>
  );
}

export default VocabQuizHostView;
