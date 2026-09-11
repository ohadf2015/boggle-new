/**
 * Live Vocab Quiz — the projector.
 *
 * Read from the back of a classroom, and alive the whole time. The four option
 * bars fill in AS students lock in — Blooket and Kahoot only draw a
 * distribution once the question is over, so their middle eight seconds are a
 * static card — then settle onto the answer, and call it out loud when the
 * whole class swept it. Between questions the screen counts 3-2-1 and teases
 * the next word's first letter instead of going dark.
 *
 * The join code never leaves the screen: the single most common reason a
 * student is stuck is that they cannot see it.
 *
 * Dark-only surface, `bg-neo-navy` hardcoded (Class 5).
 */

'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { PauseCircle, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InteractiveMascot } from '@/components/ui/InteractiveMascot';
import type { ExtendedMascotVariant } from '@/components/ui/mascotUtils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { useVocabQuiz } from './useVocabQuiz';
import { useVocabQuizJuice } from './useVocabQuizJuice';
import { VocabQuizStandings } from './VocabQuizStandings';
import { VocabQuizChoiceBars } from './VocabQuizChoiceBars';
import { VocabQuizNextUp } from './VocabQuizNextUp';

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

  const juice = useVocabQuizJuice({
    surface: 'host',
    phase,
    paused: quiz.paused,
    questionNumber: quiz.questionNumber,
    totalQuestions: quiz.totalQuestions,
    secondsLeft: quiz.secondsLeft,
    myAnswer: null,
    myStreak: 0,
    reveal,
    myCorrectCount: 0,
  });

  // Local countdown over the reveal beat, so the 3-2-1 ticks without a second
  // event per second on the wire. Re-anchored on every reveal, so a pause or a
  // reconnect cannot leave it counting a beat that already ended.
  const [nextInSec, setNextInSec] = useState(0);
  useEffect(() => {
    if (phase !== 'reveal' || !reveal) {
      setNextInSec(0);
      return;
    }
    const endsAt = Date.now() + reveal.nextInMs;
    const tickOnce = () => setNextInSec(Math.ceil(Math.max(0, endsAt - Date.now()) / 1000));
    tickOnce();
    const id = setInterval(tickOnce, 200);
    return () => clearInterval(id);
  }, [phase, reveal]);

  const choices = question?.choices ?? [];
  const roomSize = quiz.standings.length || playerCount || 0;
  const liveDistribution = quiz.lockIn?.distribution ?? new Array(choices.length).fill(0);
  const urgent = quiz.secondsLeft <= 5 && quiz.secondsLeft > 0;

  // Lexi on the wall, reacting to the ROOM rather than to any one student:
  // she panics as the clock runs out, throws her arms up on a clean sweep, and
  // takes the trophy at the end. Blooket's question screen carries no character
  // at all — this is the difference between a scoreboard and a host.
  const roomMascot: ExtendedMascotVariant =
    phase === 'ended'
      ? 'trophy'
      : juice.sweep
        ? 'celebration'
        : phase === 'reveal'
          ? 'encouraging'
          : urgent
            ? 'panic'
            : 'thinking';

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy text-neo-white p-6 gap-5">
      <header className="flex items-center gap-4 flex-wrap shrink-0">
        <InteractiveMascot
          variant={roomMascot}
          sizeClassName="w-16 h-16"
          clipShape="rounded-square"
          clipBorder="cyan"
          clipBg="var(--neo-navy-elevated, #1b2340)"
          animated
          enableHover={false}
          enableClick={false}
          alt={t('vocabQuiz.mascot.alt')}
          className="shrink-0"
        />
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
        {/* How much of the room has committed — the number a teacher watches to
            decide whether to let the clock run out or cut to the reveal. */}
        {phase === 'question' && quiz.lockIn && quiz.lockIn.total > 0 && (
          <span className="rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated px-4 py-1.5 font-neo-display font-bold text-xl tabular-nums text-neo-cyan">
            {t('vocabQuiz.lockedInCount', { locked: quiz.lockIn.locked, total: quiz.lockIn.total })}
          </span>
        )}
        <span className="ms-auto flex items-center gap-3">
          <span className="font-neo-body text-lg text-neo-white/70">{t('vocabQuiz.host.joinCode')}</span>
          <span className="rounded-neo border-[2px] border-neo-black bg-neo-lime px-5 py-2 font-neo-display font-bold text-3xl tracking-widest text-neo-black shadow-hard">
            {joinCode}
          </span>
        </span>
      </header>

      {phase === 'question' && (
        <div
          className={cn(
            'h-5 w-full shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated overflow-hidden',
            juice.ticking && 'animate-pulse'
          )}
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
        <div className="flex items-center gap-3 shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-purple px-5 py-4 text-neo-black shadow-hard">
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
        <div className="flex-1 flex flex-col gap-5 min-h-0 overflow-hidden">
          <div className="shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-navy-elevated p-6 shadow-hard">
            <p className="text-sm font-bold uppercase tracking-widest text-neo-cyan mb-2">
              {t(`vocabQuiz.focus.${question.focus}`)}
            </p>
            <p className="font-neo-display font-bold text-4xl leading-snug break-words">{question.prompt}</p>
          </div>

          <VocabQuizChoiceBars
            choices={choices}
            distribution={reveal ? reveal.distribution : liveDistribution}
            totalPlayers={roomSize}
            answerIndex={reveal ? reveal.answerIndex : null}
            sweep={juice.sweep}
            t={t}
          />

          {reveal?.definition && (
            <p className="font-neo-body text-xl text-neo-white/80">
              <span className="font-bold text-neo-cyan">{reveal.word}</span>
              <span className="mx-2">—</span>
              {reveal.definition}
            </p>
          )}

          {/* The beat between questions: a countdown that teases the word the
              class is about to meet, rather than three dead seconds. */}
          {phase === 'reveal' && reveal && (
            <div className="mt-auto shrink-0">
              <VocabQuizNextUp
                secondsLeft={nextInSec}
                hint={reveal.nextHint ?? null}
                isLast={reveal.isLast}
                t={t}
              />
            </div>
          )}
        </div>
      )}

      {phase === 'ended' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-5">
          <h2 className="flex items-center gap-3 font-neo-display font-bold text-4xl">
            <Trophy className="w-10 h-10 text-neo-yellow" aria-hidden />
            {t('vocabQuiz.finished.title')}
          </h2>
          {/* The quiz finishes on the same podium every other classroom mode gets. */}
          <VocabQuizStandings standings={quiz.standings} limit={5} size="projector" podium t={t} />
        </div>
      )}
    </div>
  );
}

export default VocabQuizHostView;
