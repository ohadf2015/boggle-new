/**
 * Classic Unplugged LIVE — shared-screen miss-gap; teacher submits answers.
 *
 * Kahoot Classic:Unplugged foil (asymmetry left after #1047 Team Tiles):
 * miss-gap words on the projector; class or teams discuss; teacher reveals and
 * submits consensus. No student devices. Finish reuses UnpluggedFinishCard +
 * #1045 grade passback (class cleared/total).
 *
 * Layout: `fixed inset-0 overflow-hidden` (same projector contract as Unplugged).
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMasterMute } from '@/hooks/useMasterMute';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { openUnpluggedReteachPrintablePack } from '@/lib/education/unpluggedReteachPrintablePack';
import { buildMissGapPracticeShareUrl } from '@/lib/education/missGapPracticeShare';
import {
  buildUnpluggedGradePassbackPath,
  scoreUnpluggedReteach,
} from '@/lib/education/unpluggedReteachGradePassback';
import { UNPLUGGED_FIRE_STREAK } from '@/lib/education/classicUnpluggedGame';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { UnpluggedFinishCard } from './unplugged/UnpluggedFinishCard';
import { UnpluggedHud } from './unplugged/UnpluggedHud';
import { UnpluggedToolsBar } from './unplugged/UnpluggedToolsBar';
import type { UnpluggedMood } from './unplugged/UnpluggedMascot';
import { ClassicUnpluggedStage } from './classicUnplugged/ClassicUnpluggedStage';
import { useClassicUnpluggedRun } from './classicUnplugged/useClassicUnpluggedRun';

export interface ClassicUnpluggedLiveProps {
  payload: ClassGapSharePayload;
  educationHref?: string;
}

export function ClassicUnpluggedLive({
  payload,
  educationHref,
}: ClassicUnpluggedLiveProps) {
  const { t, language } = useLanguage();
  const words = payload.missedWords;
  const [missGapShareState, setMissGapShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const run = useClassicUnpluggedRun(words);
  const mute = useMasterMute();

  const homeHref = educationHref || `/${payload.locale || language}/education`;
  const lesson = payload.lesson || t('education.results.title');
  const finished = run.state.phase === 'finished' && words.length > 0;

  const gradePassbackHref = useMemo(() => {
    if (!finished || words.length === 0) return null;
    const score = scoreUnpluggedReteach({
      cleared: run.state.cleared,
      total: words.length,
      completed: true,
    });
    return buildUnpluggedGradePassbackPath({ input: payload, score });
  }, [finished, words.length, run.state.cleared, payload]);

  const mood: UnpluggedMood = finished
    ? 'celebration'
    : run.state.streak >= UNPLUGGED_FIRE_STREAK
      ? 'onfire'
      : 'encouraging';

  const progressLabel = useMemo(
    () =>
      t('education.results.classicUnpluggedProgress', {
        current: words.length === 0 ? 0 : Math.min(run.state.index + 1, words.length),
        total: words.length,
      }),
    [t, words.length, run.state.index],
  );

  const printLabels = () => ({
    title: t('education.results.printPracticeSheetTitle', { lesson: payload.lesson }),
    subtitle: t('education.results.printPracticeSheetSubtitle'),
    writeLabel: t('education.results.printPracticeSheetWriteLabel'),
    sentenceLabel: t('education.results.printPracticeSheetSentenceLabel'),
    nameLine: t('education.results.printPracticeSheetNameLine'),
    dateLine: t('education.results.printPracticeSheetDateLine'),
    footer: t('education.results.printPracticeSheetFooter'),
  });

  const handlePrint = () => {
    if (words.length === 0) return;
    openMissedWordsPracticeSheet({
      lesson: payload.lesson,
      teacher: payload.teacher,
      missedWords: words,
      locale: payload.locale || language,
      labels: printLabels(),
    });
  };

  const handlePrintPack = () => {
    if (words.length === 0) return;
    openUnpluggedReteachPrintablePack({
      lesson: payload.lesson,
      teacher: payload.teacher,
      missedWords: words,
      found: payload.found,
      total: payload.total,
      locale: payload.locale || language,
      labels: {
        ...printLabels(),
        footer: t('education.results.unpluggedReteachPackFooter'),
        packTitle: t('education.results.unpluggedReteachPackTitle', { lesson }),
        packSubtitle: t('education.results.unpluggedReteachPackSubtitle'),
        packFoil: t('education.results.unpluggedReteachPackFoil'),
        qrHint: t('education.results.unpluggedReteachPackQrHint'),
        packHowTo: t('education.results.unpluggedReteachPackHowTo'),
        practiceHeading: t('education.results.unpluggedReteachPackPracticeHeading'),
      },
    });
  };

  const handleShareMissGapPractice = async () => {
    if (words.length === 0) return;
    const url = buildMissGapPracticeShareUrl(payload);
    const text = t('education.results.shareMissGapPracticeText', {
      lesson,
      missed: words.join(', '),
    });
    const result = await shareWithFallback({
      title: t('education.results.shareMissGapPracticeTitle'),
      text,
      url,
      clipboardText: `${text}\n${url}`,
    });
    if (result === 'copied' || result === 'shared') setMissGapShareState(result);
  };

  if (words.length === 0) {
    return (
      <div
        data-testid="classic-unplugged-live"
        className="fixed inset-0 z-40 overflow-hidden bg-neo-navy flex items-center justify-center px-4"
      >
        <div className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-cream bg-neo-navy-light shadow-hard text-center">
          <p className="text-neo-white font-neo-body mb-4">{t('education.results.allFound')}</p>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center px-4 py-3 font-bold bg-neo-lime text-neo-black border-neo border-neo-black rounded-neo shadow-hard"
          >
            {t('education.results.shareGapCta')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="classic-unplugged-live"
      data-phase={run.state.phase}
      className="fixed inset-0 z-40 overflow-hidden bg-neo-navy flex flex-col"
    >
      <UnpluggedHud
        lesson={lesson}
        teacher={payload.teacher}
        progressLabel={progressLabel}
        scoreLabel={t('education.results.classicUnpluggedClassScore')}
        score={run.state.score}
        streak={run.state.streak}
        streakLabel={t('education.results.unpluggedGameStreak')}
        mood={mood}
        mascotAlt={t('education.results.classicUnpluggedMascotAlt')}
        homeHref={homeHref}
        exitLabel={t('education.results.classicUnpluggedExit')}
        muted={mute.allMuted}
        muteLabel={mute.label}
        onToggleMute={mute.toggle}
        reducedMotion={run.reducedMotion}
      />

      <main className="flex-1 min-h-0 flex flex-col gap-2 sm:gap-3 p-2 sm:p-4">
        {finished ? (
          <UnpluggedFinishCard
            headline={t(
              run.perfect
                ? 'education.results.classicUnpluggedPerfectHeadline'
                : 'education.results.classicUnpluggedWinHeadline',
            )}
            subline={t(
              run.perfect
                ? 'education.results.classicUnpluggedPerfectSub'
                : 'education.results.classicUnpluggedWinSub',
              { cleared: run.state.cleared, total: words.length },
            )}
            perfect={run.perfect}
            cleared={run.state.cleared}
            total={words.length}
            bestStreak={run.state.bestStreak}
            score={run.state.score}
            reducedMotion={run.reducedMotion}
            onReplay={run.replay}
            gradePassbackHref={gradePassbackHref}
            labels={{
              clearedLabel: t('education.results.unpluggedGameCleared'),
              streakLabel: t('education.results.unpluggedGameBestStreak'),
              scoreLabel: t('education.results.classicUnpluggedClassScore'),
              playAgain: t('education.results.classicUnpluggedPlayAgain'),
              mascotAlt: t('education.results.classicUnpluggedMascotWinAlt'),
              perfectBadge: t('education.results.unpluggedGamePerfectBadge'),
              gradePassback: t('education.results.unpluggedGradePassbackOpen'),
            }}
          />
        ) : (
          <ClassicUnpluggedStage
            state={run.state}
            word={run.word}
            reducedMotion={run.reducedMotion}
            onChooseTeams={run.chooseTeams}
            onReveal={run.reveal}
            onSubmit={run.submit}
            labels={{
              chooseMode: t('education.results.classicUnpluggedChooseMode'),
              classMode: t('education.results.classicUnpluggedClassMode'),
              teamLabel: (n) => t('education.results.classicUnpluggedTeamName', { number: n }),
              activeTeam: t('education.results.classicUnpluggedActiveTeam', {
                number: run.state.activeTeam + 1,
              }),
              discussHint: t('education.results.classicUnpluggedDiscussHint'),
              reveal: t('education.results.classicUnpluggedReveal'),
              submitGotIt: t('education.results.classicUnpluggedSubmitGotIt'),
              submitNotYet: t('education.results.classicUnpluggedSubmitNotYet'),
              letters: t('education.results.unpluggedGameLetters', {
                count: run.word.length,
              }),
            }}
          />
        )}

        <UnpluggedToolsBar
          printSheetLabel={t('education.results.printPracticeSheet')}
          printPackLabel={t('education.results.printUnpluggedReteachPack')}
          shareLabel={t('education.results.shareMissGapPractice')}
          shareCopiedLabel={t('education.results.shareMissGapPracticeCopied')}
          shared={missGapShareState !== 'idle'}
          onPrintSheet={handlePrint}
          onPrintPack={handlePrintPack}
          onShare={handleShareMissGapPractice}
        />
      </main>
    </div>
  );
}
