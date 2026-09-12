/**
 * Async miss-gap homework — Kahootopia Assignments foil.
 *
 * Teacher picks a due date, assigns the #972 miss-gap practice card (NOT a live
 * Unplugged session). Students open the homework link, PLAY a 2-3 minute game
 * on the missed words, and the run itself is recorded server-side; on-time
 * completion feeds the class streak and opens GC grade passback (Kahoot
 * Marketplace grade-passback foil — #970-style, no roster OAuth). After
 * complete: parent WhatsApp share of the miss-gap practice card.
 *
 * This file owns STATE and LAYOUT only. Each block of chrome lives in its own
 * module under `missGap/` — every one of them returns a single root element
 * with the classes it had inline, because on desktop the teacher branch is a
 * `lg:grid lg:grid-cols-2` and a Fragment or a stray wrapper re-flows it. That
 * re-flow is exactly what put a live CTA under the 1440x900 fold in round 5.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  buildMissGapClassKey,
  defaultMissGapDueDate,
  normalizeDueDate,
  todayUtcDate,
  toMissGapAssignmentPayload,
  type MissGapAssignmentPayload,
} from '@/lib/education/missGapAsyncAssignment';
import {
  readClassStreak,
  recordClassHomeworkCompletion,
} from '@/lib/education/classStreak';
import { resolveClassStreak } from '@/lib/education/missGapStreakSource';
import { readMissGapReceipt, writeMissGapReceipt } from '@/lib/education/missGapReceipt';
import {
  buildMissGapGradePassbackPath,
  scoreMissGapHomework,
  type MissGapGradeScore,
} from '@/lib/education/missGapGradePassback';
import { MASCOT_IMAGES } from '@/components/ui/mascotData';
import { MissGapGame } from '@/components/education/missGap/MissGapGame';
import { MissGapStreakFlame } from '@/components/education/missGap/MissGapStreakFlame';
import { MissGapTeacherProgress } from '@/components/education/missGap/MissGapTeacherProgress';
import { MissGapTeacherCompose } from '@/components/education/missGap/MissGapTeacherCompose';
import { MissGapStudentActions } from '@/components/education/missGap/MissGapStudentActions';
import { MissGapTurnInActions } from '@/components/education/missGap/MissGapTurnInActions';
import { MissGapTakeHomeDisclosure } from '@/components/education/missGap/MissGapTakeHomeDisclosure';
import { useMissGapProgress } from '@/components/education/missGap/useMissGapProgress';

export interface MissGapAsyncAssignmentProps {
  payload: MissGapAssignmentPayload;
  /** Teacher composer (due date + assign). Default: true when due is empty. */
  teacherMode?: boolean;
}

export function MissGapAsyncAssignment({
  payload: initial,
  teacherMode,
}: MissGapAsyncAssignmentProps) {
  const { t, language } = useLanguage();
  const [dueDate, setDueDate] = useState(
    () => initial.dueDate || defaultMissGapDueDate(),
  );
  const [completed, setCompleted] = useState(false);
  const [gradeScore, setGradeScore] = useState<MissGapGradeScore | null>(null);
  const [streak, setStreak] = useState(() =>
    readClassStreak(buildMissGapClassKey(initial)),
  );
  // The class streak lives on the SERVER. The device copy is not a conservative
  // first paint — a phone holding a week the server never recorded is simply a
  // different number — so nothing is claimed until the server answers, and the
  // localStorage copy is the offline fallback only (pitfalls Class 1, and
  // `missGapStreakSource.ts` for the rule itself).
  const [serverStreak, setServerStreak] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progressToken, setProgressToken] = useState(0);

  const isTeacher = teacherMode ?? !initial.dueDate;
  const locale = initial.locale || language;

  const payload = useMemo(
    () =>
      toMissGapAssignmentPayload({
        ...initial,
        dueDate: normalizeDueDate(dueDate),
      }),
    [initial, dueDate],
  );

  const classKey = buildMissGapClassKey(payload);
  // ONE read of the server state, for the teacher's roster AND the student's
  // streak chip. The student branch used to have no server read at all, so a
  // fresh phone showed a 0-day streak for a class five days in.
  const progress = useMissGapProgress(classKey, payload.dueDate, progressToken);
  const classStreak = resolveClassStreak({
    server: serverStreak,
    device: streak.currentStreak,
    failed: progress.failed,
  });
  const words = payload.missedWords;
  const lesson = payload.lesson || t('education.results.title');

  // The fetched streak is authoritative over the device copy.
  useEffect(() => {
    if (progress.data) setServerStreak(progress.data.streak.currentStreak);
  }, [progress.data]);

  // Rehydrate this device's own receipt. Read in an effect, not in the initial
  // state, so the server-rendered markup and the first client paint agree.
  useEffect(() => {
    if (isTeacher) return;
    const receipt = readMissGapReceipt(classKey, payload.dueDate);
    if (!receipt) return;
    setCompleted(true);
    setGradeScore(
      scoreMissGapHomework({
        dueDate: payload.dueDate,
        completed: true,
        accuracy: receipt.accuracy,
        completedOn: receipt.completedOn || undefined,
      }),
    );
  }, [isTeacher, classKey, payload.dueDate]);

  /** The game finished and the server accepted the run. */
  const handleGameFinished = (nextServerStreak: number, lastAccuracy: number) => {
    if (words.length === 0) return;
    const next = recordClassHomeworkCompletion({
      classKey,
      dueDate: payload.dueDate,
    });
    setStreak(next);
    setServerStreak(nextServerStreak);
    setProgressToken((n) => n + 1);
    setGradeScore(
      scoreMissGapHomework({
        dueDate: payload.dueDate,
        completed: true,
        accuracy: lastAccuracy,
      }),
    );
    setCompleted(true);
    // Written the moment the SERVER accepted the run, so a reload — or the
    // cookie banner's accept, which re-mounts the whole tree — still finds the
    // receipt (pitfalls Class 1: persist at record-time, never at dismiss-time).
    writeMissGapReceipt(classKey, payload.dueDate, {
      accuracy: lastAccuracy,
      completedOn: todayUtcDate(),
    });
  };

  const gradePassbackHref = useMemo(() => {
    if (!gradeScore || !payload.dueDate || words.length === 0) return null;
    return buildMissGapGradePassbackPath({ input: payload, score: gradeScore });
  }, [gradeScore, payload, words.length]);

  // Built ONCE and handed to two places — the page and the game's finish screen
  // — so the same test ids can never mount twice. `MissGapStudentActions` only
  // renders it while `!playing`.
  const turnInActions = (
    <MissGapTurnInActions
      completed={completed}
      payload={payload}
      lesson={lesson}
      gradeScore={gradeScore}
      gradePassbackHref={gradePassbackHref}
    />
  );

  if (words.length === 0) {
    return (
      <div
        data-testid="miss-gap-async-assignment"
        className="w-full max-w-xl p-6 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard text-center"
      >
        <p className="text-neo-white font-neo-body mb-4">{t('education.results.allFound')}</p>
        <Link
          href={`/${locale}/education`}
          className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-[3px] border-neo-black rounded-neo shadow-hard"
        >
          {t('education.results.shareGapCta')}
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="miss-gap-async-assignment"
      className={cn(
        'w-full max-w-xl flex flex-col gap-4',
        // Desktop teacher view: compose on the left, who-played on the right.
        // `content-start` as well as `items-start`: a stretched grid sizes its
        // ROWS to the region, not its items, and that is what floated the
        // take-home disclosure 190px under the compose card at 1440x900.
        isTeacher &&
          'lg:max-w-5xl lg:grid lg:grid-cols-2 lg:items-start lg:content-start lg:gap-5',
      )}
    >
      <section className="p-6 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light shadow-hard">
        <p className="text-neo-lime font-bold text-xs uppercase tracking-widest mb-2">
          {isTeacher
            ? t('education.results.assignMissGapAsyncEyebrow')
            : t('education.homework.studentEyebrow')}
        </p>
        {!isTeacher ? (
          <Image
            src={MASCOT_IMAGES.explorerNobg}
            alt=""
            width={96}
            height={96}
            unoptimized
            aria-hidden
            className="w-20 h-20 mb-1 drop-shadow-[4px_4px_0_rgba(0,0,0,0.4)]"
          />
        ) : null}
        <h1 className="text-neo-white font-neo-display font-bold text-2xl leading-tight">
          {isTeacher
            ? t('education.results.assignMissGapAsyncHeading')
            : t('education.homework.studentTitle', { count: words.length })}
        </h1>
        {isTeacher ? (
          <p className="text-neo-cream font-neo-body text-sm mt-3">
            {t('education.results.assignMissGapAsyncSubtitle')}
          </p>
        ) : (
          <div className="mt-4" data-testid="miss-gap-class-streak">
            {classStreak.resolved ? (
              <MissGapStreakFlame streak={classStreak.streak} size="hero" />
            ) : (
              <p className="flex items-center gap-2 text-neo-cream text-sm">
                <Flame className="w-4 h-4 text-neo-orange" aria-hidden />
                {t('education.homework.classStreakChecking')}
              </p>
            )}
          </div>
        )}

        {isTeacher ? (
          <MissGapTeacherCompose
            payload={payload}
            lesson={lesson}
            dueDate={dueDate}
            onDueDateChange={setDueDate}
          />
        ) : (
          <MissGapStudentActions
            payload={payload}
            completed={completed}
            playing={playing}
            turnIn={turnInActions}
            onPlay={() => setPlaying(true)}
          />
        )}
      </section>

      {isTeacher ? (
        <MissGapTeacherProgress data={progress.data} failed={progress.failed} />
      ) : null}

      {isTeacher || completed ? <MissGapTakeHomeDisclosure payload={payload} /> : null}

      {playing ? (
        <MissGapGame
          classKey={classKey}
          lesson={lesson}
          teacher={payload.teacher}
          dueDate={payload.dueDate}
          words={words}
          initialStreak={classStreak.streak}
          definitions={payload.definitions}
          onClose={() => setPlaying(false)}
          onFinished={handleGameFinished}
          finishActions={turnInActions}
        />
      ) : null}
    </div>
  );
}
