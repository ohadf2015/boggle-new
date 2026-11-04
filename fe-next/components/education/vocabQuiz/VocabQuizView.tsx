/**
 * Live Vocab Quiz — the student's phone.
 *
 * One screen, four states: question, locked-in, reveal, finished. The shell
 * never scrolls; the answer grid takes the height the question card leaves.
 *
 * The payoff layer lives in `useVocabQuizJuice`: a tick tightening under five
 * seconds, a chime or a buzz on the frame the verdict shows, a stinger at three
 * and five in a row, a burst when the class sweeps, confetti for a clean sheet.
 * It respects the app mute setting for free (`playSound` returns early when SFX
 * are muted) and reduced motion (the confetti helpers no-op).
 *
 * Dark-only surface: `bg-neo-navy` is hardcoded rather than
 * `bg-neo-cream dark:bg-neo-navy`, which flashes cream on a lazy mount before
 * the dark class resolves (Class 5 in .claude/rules/60-recurring-pitfalls.md).
 */

'use client';

import { useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { PauseCircle, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslateFn } from '@/shared/types/vocabQuiz';
import { ClassroomBossBar } from '../ClassroomBossBar';
import { ClassroomBossOutcome } from '../ClassroomBossOutcome';
import { useVocabQuiz } from './useVocabQuiz';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import {
  isLeaderboardHidden,
  isStudentTimerHidden,
  shouldSuppressTimerUrgency,
  trimLeaderboardForPressure,
} from '@/shared/utils/classroomPressure';
import { useVocabQuizJuice } from './useVocabQuizJuice';
import { VocabQuizAnswerGrid } from './VocabQuizAnswerGrid';
import { VocabQuizStandings } from './VocabQuizStandings';
import { VocabQuizHudScore, VocabQuizStudentHeader } from './VocabQuizStudentHeader';
import { VocabQuizRevealBanner } from './VocabQuizRevealBanner';
import { VocabQuizOwnFinale } from './VocabQuizOwnFinale';
import { VocabQuizChestFlow } from './VocabQuizChestFlow';
import { VocabQuizMissedSheet } from './VocabQuizMissedSheet';
import { StudentRoundOutcome } from '../results/StudentRoundOutcome';
import { StudentNextActions } from '../results/StudentNextActions';
import { Reveal } from '../motion/Reveal';
import { VocabQuizPromptPanel } from './VocabQuizPromptPanel';
import { VocabQuizFooterBar } from './VocabQuizFooterBar';
import { VocabQuizStakesMeter, stakesPoints } from './VocabQuizStakesMeter';
import { useAnswerKeys } from './useAnswerKeys';

export interface VocabQuizViewProps {
  socket: Socket | null;
  username: string;
  t: TranslateFn;
  /** Callback to re-launch the game (same mode+settings). */
  onPlayAgain?: () => void;
  /** Leaves the room from the top bar; no exit is drawn without it. */
  onExit?: () => void;
}

export function VocabQuizView({ socket, username, t, onPlayAgain, onExit }: VocabQuizViewProps) {
  const quiz = useVocabQuiz(socket);
  // Practice opens IN PLACE — navigating away dropped the student out of the
  // live room and missed the teacher's Rematch. Keyed to this quiz's missed
  // list, so the next quiz (a fresh array) never inherits an open sheet.
  const [practiceFor, setPracticeFor] = useState<unknown>(null);
  const practiceOpen = practiceFor === quiz.missed;
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

  // The teacher's calm dials (null outside a classroom room): timer off drops
  // the question clock, gentle keeps its colour calm to the last second, and
  // a hidden leaderboard turns every rank surface into the reveal beat.
  const pressure = useClassroomPressure();
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;
  const timerGentle = pressure ? shouldSuppressTimerUrgency(pressure) : false;
  const leaderboardHidden = pressure ? isLeaderboardHidden(pressure) : false;
  const endStandings = pressure ? trimLeaderboardForPressure(quiz.standings, pressure) : quiz.standings;

  // Orange is reserved for the last five seconds, and stays on at 0 so a spent clock never looks calm.
  const urgent = !timerGentle && quiz.secondsLeft <= 5;
  const timeUp = phase === 'question' && !timerHidden && quiz.secondsLeft <= 0;

  // Points fly into the HUD score counter instead of being explained in prose.
  // Keyed on the question index so the same total twice still re-animates.
  const pop = myAnswer ? { points: myAnswer.points, key: myAnswer.index } : null;

  // A chest is offered in place of the spent answer grid, so the verdict
  // beneath it stays readable.
  const ownChestOpen = !!quiz.myChest && quiz.myChest.actor === username;
  const chestOffered = quiz.chestPending && !ownChestOpen && phase !== 'ended';

  const clock =
    phase === 'question' && !timerHidden
      ? { secondsLeft: quiz.secondsLeft, fractionLeft: quiz.fractionLeft, urgent, ticking: juice.ticking && !timerGentle }
      : null;
  const rank =
    phase === 'reveal' && !leaderboardHidden && myIndex >= 0 ? { position: myIndex + 1, total: quiz.standings.length } : null;
  const points =
    clock && question
      ? stakesPoints({
          fractionLeft: quiz.fractionLeft,
          limitMs: question.limitMs,
          streak: quiz.myStreak,
          speedScoring: pressure?.speedScoring ?? true,
        })
      : null;
  // The clock sits under the question card; the top chip keeps the score, and the rank at the reveal.
  const hud =
    (phase === 'question' || phase === 'reveal') && question ? (
      <div
        data-testid="vocab-quiz-hud-cluster"
        className="flex shrink-0 items-center gap-2.5 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-elevated px-2.5 py-1.5 sm:gap-3 sm:px-3"
      >
        {rank && (
          <>
            <span className="shrink-0 font-neo-display text-lg font-black tabular-nums text-neo-yellow sm:text-2xl">
              {t('vocabQuiz.rank', { position: rank.position, total: rank.total })}
            </span>
            <span aria-hidden className="h-5 w-0.5 shrink-0 rounded-full bg-neo-white/15" />
          </>
        )}
        <VocabQuizHudScore score={quiz.myScore} pop={pop} t={t} />
      </div>
    ) : undefined;

  const canAnswer = phase === 'question' && pendingChoice === null && !timeUp && !quiz.paused && !chestOffered && !practiceOpen;
  useAnswerKeys(question?.choices.length ?? 0, canAnswer, quiz.answer);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-neo-navy text-neo-white p-3 gap-4">
      {/* One stack: on a tall screen any height the capped answers leave goes around it, never between its parts. */}
      <div data-testid="vocab-quiz-stack" className="flex min-h-0 flex-1 flex-col justify-center gap-4 sm:gap-6 [@media(max-height:560px)]:gap-2">
        <VocabQuizStudentHeader
          questionNumber={quiz.questionNumber}
          totalQuestions={quiz.totalQuestions}
          streak={quiz.myStreak}
          score={quiz.myScore}
          pop={pop}
          mascot={juice.mascot}
          finished={phase === 'ended'}
          hud={hud}
          onExit={onExit}
          t={t}
        />

        {phase !== 'ended' && (
          <ClassroomBossBar
            boss={quiz.boss}
            phase={phase}
            surface="student"
            myHit={myAnswer?.bossHit ?? (phase === 'reveal' ? 0 : null)}
            t={t}
          />
        )}

        {/* Question + answers: one column, the same width as the header so every edge lines up. */}
        {(phase === 'question' || phase === 'reveal') && question && (
          <div
            data-testid="vocab-quiz-column"
            className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col justify-center gap-4 sm:max-h-[48rem] sm:justify-start sm:gap-8 sm:pt-[4dvh] xl:max-h-[56rem] [@media(max-height:560px)]:gap-3 [@media(max-height:560px)]:pt-0"
          >
            {quiz.paused && (
              <div className="flex items-center gap-2 shrink-0 rounded-neo border-[2px] border-neo-black bg-neo-purple px-4 py-3 text-neo-black shadow-hard">
                <PauseCircle className="w-6 h-6 shrink-0" aria-hidden />
                <span className="font-neo-display font-bold">{t('vocabQuiz.paused')}</span>
              </div>
            )}
            {/* The question keeps its content height; the dvh-sized cards take what is left. */}
            <Reveal key={question.index} className={chestOffered ? 'w-full shrink-0' : 'flex w-full shrink-0 flex-col'}>
              <VocabQuizPromptPanel
                focusLabel={focusLabel}
                ask={t(`vocabQuiz.ask.${question.focus}`)}
                prompt={question.prompt}
                mascot={juice.mascot}
                revealed={phase === 'reveal'}
                timer={
                  clock && (
                    <VocabQuizStakesMeter
                      clock={clock}
                      points={pendingChoice !== null || timeUp ? null : points}
                      timeUp={timeUp && pendingChoice === null}
                      t={t}
                    />
                  )
                }
                t={t}
              />
            </Reveal>

            <div className={chestOffered ? 'flex min-h-0 max-h-[44rem] flex-1 flex-col' : 'flex shrink-0 flex-col max-sm:min-h-0 max-sm:flex-1'}>
              {chestOffered ? (
                <div className="flex-1 min-h-0">
                  <VocabQuizChestFlow
                    picker="inline"
                    socket={socket}
                    chestPending={quiz.chestPending}
                    myChest={quiz.myChest}
                    chestHit={quiz.chestHit}
                    questionIndex={quiz.question?.index ?? quiz.questionNumber - 1}
                    ended={false}
                    username={username}
                    t={t}
                  />
                </div>
              ) : (
                <VocabQuizAnswerGrid
                  className="min-h-0"
                  choices={question.choices}
                  selectedIndex={myAnswer?.choiceIndex ?? pendingChoice}
                  correctIndex={phase === 'reveal' && reveal ? reveal.answerIndex : null}
                  disabled={phase === 'reveal' || pendingChoice !== null || timeUp || quiz.paused}
                  frozen={timeUp}
                  onSelect={quiz.answer}
                  t={t}
                />
              )}
            </div>
          </div>
        )}

        {/* Waiting for the round to begin */}
        {phase === 'idle' && (
          <p className="flex-1 grid place-items-center text-center font-neo-body text-neo-white/70">
            {t('vocabQuiz.waiting')}
          </p>
        )}

        {/* Finished — the same shape a board round ends on: my own placing
            first, then the room's top three on plinths. */}
        {phase === 'ended' && (
          <div data-testid="vocab-quiz-ended" className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto overscroll-contain">
            <h2 className="shrink-0 flex items-center gap-2 font-neo-display font-bold text-2xl">
              <Trophy className="w-7 h-7 text-neo-yellow" aria-hidden />
              {t('vocabQuiz.finished.title')}
            </h2>

            <ClassroomBossOutcome boss={quiz.boss} compact t={t} />

            <div className="shrink-0">
              {myStanding ? (
                <StudentRoundOutcome
                  username={username}
                  standings={quiz.standings}
                  mastery={{ found: myStanding.correctCount, total: quiz.totalQuestions }}
                  hideClassPosition={leaderboardHidden}
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
            </div>

            {/* A hidden leaderboard turns this into the reveal beat: the teacher owns the standings. */}
            <div className="shrink-0">
              {leaderboardHidden ? (
                <p
                  data-testid="vocab-quiz-reveal-note"
                  className="rounded-neo border-[2px] border-neo-cream bg-neo-navy-elevated p-4 text-center font-neo-body font-bold text-neo-cream"
                >
                  {t('education.classroomGame.pressure.revealAtEnd')}
                </p>
              ) : (
                <VocabQuizStandings standings={endStandings} meUsername={username} limit={5} podium t={t} />
              )}
            </div>

            <div data-testid="vocab-quiz-ended-actions" className="shrink-0">
              <StudentNextActions
                onPlayAgain={onPlayAgain}
                onPractice={quiz.missed.length > 0 ? () => setPracticeFor(quiz.missed) : undefined}
                t={t}
              />
            </div>
            <div className="shrink-0">
              <VocabQuizOwnFinale
                correct={myStanding?.correctCount ?? 0}
                total={quiz.totalQuestions}
                bestStreak={myStanding?.bestStreak ?? quiz.myStreak}
                t={t}
              />
            </div>

            {practiceOpen && (
              <VocabQuizMissedSheet missed={quiz.missed} onClose={() => setPracticeFor(null)} t={t} />
            )}
          </div>
        )}
      </div>

      {(phase === 'question' || phase === 'reveal') && question && (
        <VocabQuizFooterBar
          locked={phase === 'question' && pendingChoice !== null}
          timeUp={timeUp}
          streak={quiz.myStreak}
          picked={question.choices[myAnswer?.choiceIndex ?? pendingChoice ?? -1] ?? null}
          lockedIn={phase === 'question' ? quiz.lockIn : null}
          verdict={
            phase === 'reveal' && reveal ? (
              <VocabQuizRevealBanner
                correct={myAnswer ? myAnswer.correct : null}
                answer={reveal.answer}
                word={reveal.word}
                definition={reveal.definition}
                sweep={juice.sweep}
                points={myAnswer?.points ?? null}
                streak={quiz.myStreak}
                nextInMs={reveal.nextInMs}
                beatKey={reveal.index}
                isLast={reveal.isLast}
                paused={quiz.paused}
                mascot={juice.mascot}
                t={t}
              />
            ) : undefined
          }
          t={t}
        />
      )}

      {/* Treasure chest flow — picker and reveal overlay */}
      <VocabQuizChestFlow
        picker="none"
        socket={socket}
        chestPending={quiz.chestPending}
        myChest={quiz.myChest}
        chestHit={quiz.chestHit}
        questionIndex={quiz.question?.index ?? quiz.questionNumber - 1}
        ended={quiz.phase === 'ended'}
        username={username}
        t={t}
      />
    </div>
  );
}

export default VocabQuizView;
