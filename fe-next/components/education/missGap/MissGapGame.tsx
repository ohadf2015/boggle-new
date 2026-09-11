/**
 * The homework itself — a 2-3 minute game on the words the class missed.
 *
 * What it replaces: a static list of missed words and a "mark complete" button
 * the student ticked without doing anything. Now the link opens a real loop —
 * tap the meaning / tap the right spelling / spell it with letter tiles — and
 * the completion is recorded server-side, so the teacher sees who actually
 * played and the class streak survives a cleared cache.
 *
 * Shell rules: `fixed inset-0` over a hardcoded `bg-neo-navy` (dark-only game
 * surface — never the cream/dark pair, pitfalls Class 5), the page body cannot
 * scroll, and exactly one inner region scrolls. No fullscreen entrance tween.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';
import {
  buildMissGapRounds,
  scoreMissGapRun,
  type MissGapAnswer,
  type MissGapRunScore,
} from '@/lib/education/missGapQuiz';
import {
  getMissGapDeviceKey,
  getRememberedStudentName,
  rememberStudentName,
  sanitizeStudentName,
} from '@/lib/education/missGapStudentKey';
import { MissGapRoundView, type RoundOutcome } from './MissGapRoundView';
import { MissGapCompletion, type SaveState } from './MissGapCompletion';
import { MissGapStreakFlame } from './MissGapStreakFlame';
import { useMissGapSound } from './missGapSound';

const REVEAL_MS = 950;
const STREAK_SOUND_AT = 3;

export interface MissGapGameProps {
  classKey: string;
  lesson: string;
  teacher: string;
  dueDate: string;
  words: string[];
  definitions?: Record<string, string>;
  /** Server class streak before this run, so the header starts honest. */
  initialStreak: number;
  onClose: () => void;
  /** Share / turn-in actions, rendered under the finish screen. */
  finishActions?: React.ReactNode;
  onFinished?: (streak: number) => void;
}

interface CompleteResponse {
  streak?: { currentStreak?: number };
  ok?: boolean;
}

export function MissGapGame({
  classKey,
  lesson,
  teacher,
  dueDate,
  words,
  definitions,
  initialStreak,
  onClose,
  finishActions,
  onFinished,
}: MissGapGameProps) {
  const { t } = useLanguage();
  const playSound = useMissGapSound();

  const [phase, setPhase] = useState<'intro' | 'play' | 'done'>('intro');
  const [name, setName] = useState('');
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [outcome, setOutcome] = useState<RoundOutcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [answers, setAnswers] = useState<MissGapAnswer[]>([]);
  const [runStreak, setRunStreak] = useState(0);
  const [classStreak, setClassStreak] = useState(initialStreak);
  const [classmates, setClassmates] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>('saving');
  const [attempt, setAttempt] = useState(0);
  const startedAt = useRef(0);
  const roundStartedAt = useRef(0);

  useEffect(() => {
    setName(getRememberedStudentName());
  }, []);

  // Nothing behind the game may scroll while it is open. The DOCUMENT needs the
  // lock as much as the body: the site nav renders outside the page shell, so
  // the html element stays taller than the viewport and the page still scrolled
  // ~59px behind the fixed overlay with only `body` locked. Restores exactly
  // what it found, so a host page with its own overflow rule is not clobbered.
  useEffect(() => {
    const root = document.documentElement;
    const previousRoot = root.style.overflow;
    const previousBody = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      root.style.overflow = previousRoot;
      document.body.style.overflow = previousBody;
    };
  }, []);

  const rounds = useMemo(
    () => buildMissGapRounds({ words, definitions, seed: `${classKey}|${dueDate}|${attempt}` }),
    [words, definitions, classKey, dueDate, attempt],
  );
  const round = rounds[index];
  const score: MissGapRunScore = useMemo(
    () => scoreMissGapRun(rounds, answers),
    [rounds, answers],
  );

  const advance = useCallback(() => {
    setOutcome(null);
    setPicked(null);
    setIndex((i) => i + 1);
  }, []);

  const answer = useCallback(
    (correct: boolean, label: string) => {
      if (!round) return;
      setOutcome(correct ? 'correct' : 'wrong');
      setPicked(label);
      setAnswers((prev) => [
        ...prev,
        { roundId: round.id, correct, msTaken: Date.now() - roundStartedAt.current },
      ]);
      setRunStreak((prev) => {
        const next = correct ? prev + 1 : 0;
        if (correct && next >= STREAK_SOUND_AT && next % STREAK_SOUND_AT === 0) {
          playSound('streak');
        } else {
          playSound(correct ? 'correct' : 'wrong');
        }
        return next;
      });
    },
    [round, playSound],
  );

  // One clock for the whole session: it ticks the current round and turns a
  // timeout into a wrong answer rather than freezing the screen.
  useEffect(() => {
    if (phase !== 'play' || !round || outcome !== null) return undefined;
    setSecondsLeft(round.seconds);
    roundStartedAt.current = Date.now();
    const started = Date.now();
    const id = window.setInterval(() => {
      const left = round.seconds - (Date.now() - started) / 1000;
      if (left <= 0) {
        window.clearInterval(id);
        setSecondsLeft(0);
        answer(false, '');
        return;
      }
      setSecondsLeft(left);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, round, outcome, answer]);

  useEffect(() => {
    if (phase !== 'play' || outcome === null) return undefined;
    const id = window.setTimeout(() => {
      if (index + 1 >= rounds.length) {
        setPhase('done');
      } else {
        advance();
      }
    }, REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [phase, outcome, index, rounds.length, advance]);

  // Record the run. A failed save is reported, never swallowed (Class 4).
  useEffect(() => {
    if (phase !== 'done') return;
    let cancelled = false;
    setSaveState('saving');
    const finalScore = scoreMissGapRun(rounds, answers);
    (async () => {
      try {
        const res = await fetch('/api/education/miss-gap/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classKey,
            dueDate,
            lesson,
            teacher,
            studentName: name || t('education.homework.anonStudent'),
            studentKey: getMissGapDeviceKey(),
            wordsTotal: finalScore.total,
            wordsCorrect: finalScore.correct,
            accuracy: finalScore.accuracy,
            stars: finalScore.stars,
            bestStreak: finalScore.bestStreak,
            durationMs: Date.now() - startedAt.current,
          }),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as CompleteResponse;
        if (cancelled) return;
        const nextStreak = data.streak?.currentStreak ?? classStreak;
        setClassStreak(nextStreak);
        setSaveState('saved');
        onFinished?.(nextStreak);
        const progress = await fetch(
          `/api/education/miss-gap/progress?classKey=${encodeURIComponent(classKey)}&dueDate=${encodeURIComponent(dueDate)}`,
        );
        if (progress.ok && !cancelled) {
          const body = (await progress.json()) as { players?: number };
          setClassmates(Math.max(0, (body.players ?? 1) - 1));
        }
      } catch {
        if (!cancelled) setSaveState('failed');
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per finished session; `answers`/`rounds` are frozen by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = () => {
    rememberStudentName(name);
    startedAt.current = Date.now();
    setPhase('play');
  };

  const replay = () => {
    setAttempt((a) => a + 1);
    setAnswers([]);
    setIndex(0);
    setRunStreak(0);
    setOutcome(null);
    setPicked(null);
    setSaveState('saving');
    startedAt.current = Date.now();
    setPhase('play');
  };

  return (
    <div
      data-testid="miss-gap-game"
      className="fixed inset-0 z-[90] bg-neo-navy flex flex-col overflow-hidden"
    >
      <header className="shrink-0 flex items-center gap-2 px-3 py-2 border-b-[3px] border-neo-black bg-neo-navy-light">
        <button
          type="button"
          data-testid="miss-gap-game-exit"
          onClick={onClose}
          aria-label={t('education.homework.exit')}
          className="w-9 h-9 grid place-items-center rounded-neo border-2 border-neo-black bg-neo-cream text-neo-black"
        >
          <X className="w-5 h-5" aria-hidden />
        </button>
        <p className="flex-1 min-w-0 truncate font-neo-display font-bold text-neo-white text-sm">
          {lesson}
        </p>
        {phase === 'play' ? (
          <span
            data-testid="miss-gap-progress"
            className="font-neo-display font-bold text-neo-cyan text-sm tabular-nums"
          >
            {Math.min(index + 1, rounds.length)}/{rounds.length}
          </span>
        ) : null}
        <MissGapStreakFlame streak={phase === 'play' ? runStreak : classStreak} />
      </header>

      <div className="flex-1 min-h-0 px-4 py-3 max-w-xl w-full mx-auto">
        {phase === 'intro' ? (
          <div className="flex flex-col h-full min-h-0 text-center">
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center gap-3">
              <Image
                src={MASCOT_IMAGES.explorerNobg}
                alt=""
                width={128}
                height={128}
                unoptimized
                aria-hidden
                className="w-28 h-28 drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
              />
              <h2 className="font-neo-display font-bold text-2xl text-neo-white leading-tight">
                {t('education.homework.introTitle', { count: rounds.length })}
              </h2>
              <p className="font-neo-body text-sm text-neo-white/80">
                {t('education.homework.introSubtitle')}
              </p>
              {/* The words themselves, up front: a student should know what
                  they are walking into before they type a name. */}
              <ul className="flex flex-wrap gap-1.5 justify-center" data-testid="miss-gap-intro-words">
                {rounds.map((r) => (
                  <li
                    key={r.id}
                    className="px-2.5 py-1 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white font-bold text-sm"
                  >
                    {r.word}
                  </li>
                ))}
              </ul>
              <label className="w-full text-start">
                <span className="block font-bold text-xs uppercase tracking-widest text-neo-cyan mb-1">
                  {t('education.homework.nameLabel')}
                </span>
                <input
                  data-testid="miss-gap-name"
                  value={name}
                  maxLength={24}
                  onChange={(e) => setName(sanitizeStudentName(e.target.value))}
                  placeholder={t('education.homework.namePlaceholder')}
                  className="w-full px-3 py-3 rounded-neo border-neo border-neo-black bg-neo-cream text-neo-black placeholder:text-neo-black/55 font-neo-body"
                />
              </label>
            </div>
            <button
              type="button"
              data-testid="miss-gap-start"
              onClick={start}
              className={cn(
                'shrink-0 w-full px-4 py-4 font-neo-display font-bold text-lg',
                'bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard',
                'transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
              )}
            >
              {t('education.homework.start')}
            </button>
          </div>
        ) : phase === 'play' && round ? (
          <MissGapRoundView
            round={round}
            secondsLeft={secondsLeft}
            outcome={outcome}
            pickedLabel={picked}
            onAnswer={answer}
            onTapFeedback={() => playSound('tap')}
          />
        ) : (
          <MissGapCompletion
            score={score}
            streak={classStreak}
            classmates={classmates}
            saveState={saveState}
            onReplay={replay}
          >
            {finishActions}
          </MissGapCompletion>
        )}
      </div>
    </div>
  );
}
