/**
 * Unplugged reteach LIVE — the whole class is one team, and nobody needs a device.
 *
 * Teacher picks a writing window (20/30/45s), taps once to start the ring, the
 * class writes the missed word on paper, the word reveals big, and the teacher
 * calls it: "class got it" / "not yet" (with an optional show-of-hands count).
 * Score + consecutive-word streak climb on screen, Lexi reacts, and clearing the
 * list is the win — confetti, victory stinger, end sticker.
 *
 * Rules live in `lib/education/unpluggedReteachGame` (pure + tested); the side
 * effects live in `unplugged/useUnpluggedRun`. This file is composition only.
 *
 * Layout contract: the shell is `fixed inset-0 overflow-hidden` — the same
 * pattern ProjectorLobby uses. A plain `h-[100dvh]` block still sits IN FLOW
 * under the global app footer, which pushes the body past the viewport; taking
 * the surface out of flow is what actually kills the page scroll. `useUnpluggedRun`
 * additionally takes the NavigationContext lock for as long as this screen is
 * mounted — that is what pulls the global mobile bottom nav off a 390px teacher
 * phone, where it would otherwise cover the tools strip. It is released in the
 * same effect cleanup that releases the sound gate.
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMasterMute } from '@/hooks/useMasterMute';
import { openMissedWordsPracticeSheet } from '@/lib/education/missedWordsPracticeSheet';
import { openUnpluggedReteachPrintablePack } from '@/lib/education/unpluggedReteachPrintablePack';
import { buildMissGapPracticeShareUrl } from '@/lib/education/missGapPracticeShare';
import { UNPLUGGED_FIRE_STREAK } from '@/lib/education/unpluggedReteachGame';
import type { ClassGapSharePayload } from '@/lib/education/classGapShare';
import { shareWithFallback } from '@/utils/shareWithFallback';
import { UnpluggedFinishCard } from './unplugged/UnpluggedFinishCard';
import { UnpluggedHud } from './unplugged/UnpluggedHud';
import { UnpluggedStage } from './unplugged/UnpluggedStage';
import { UnpluggedToolsBar } from './unplugged/UnpluggedToolsBar';
import { useUnpluggedRun } from './unplugged/useUnpluggedRun';
import type { UnpluggedMood } from './unplugged/UnpluggedMascot';

export interface UnpluggedReteachLiveProps {
  payload: ClassGapSharePayload;
  /** Optional education home fallback when empty. */
  educationHref?: string;
}

export function UnpluggedReteachLive({ payload, educationHref }: UnpluggedReteachLiveProps) {
  const { t, language } = useLanguage();
  const words = payload.missedWords;
  const [missGapShareState, setMissGapShareState] = useState<'idle' | 'copied' | 'shared'>('idle');
  const run = useUnpluggedRun(words);
  const mute = useMasterMute();

  const homeHref = educationHref || `/${payload.locale || language}/education`;
  const lesson = payload.lesson || t('education.results.title');
  const finished = run.state.phase === 'finished' && words.length > 0;

  const mood: UnpluggedMood = finished
    ? 'celebration'
    : run.state.streak >= UNPLUGGED_FIRE_STREAK
      ? 'onfire'
      : 'encouraging';

  const progressLabel = useMemo(
    () =>
      t('education.results.unpluggedReteachProgress', {
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
        data-testid="unplugged-reteach-live"
        className="fixed inset-0 z-40 overflow-hidden bg-neo-navy flex items-center justify-center px-4"
      >
        <div className="w-full max-w-xl p-6 rounded-neo border-neo border-neo-black bg-neo-navy-light shadow-hard text-center">
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
      data-testid="unplugged-reteach-live"
      data-phase={run.state.phase}
      className="fixed inset-0 z-40 overflow-hidden bg-neo-navy flex flex-col"
    >
      <UnpluggedHud
        lesson={lesson}
        teacher={payload.teacher}
        progressLabel={progressLabel}
        scoreLabel={t('education.results.unpluggedGameScore')}
        score={run.state.score}
        streak={run.state.streak}
        streakLabel={t('education.results.unpluggedGameStreak')}
        mood={mood}
        mascotAlt={t('education.results.unpluggedGameMascotAlt')}
        homeHref={homeHref}
        exitLabel={t('education.results.unpluggedGameExit')}
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
                ? 'education.results.unpluggedGamePerfectHeadline'
                : 'education.results.unpluggedGameWinHeadline',
            )}
            subline={t(
              run.perfect
                ? 'education.results.unpluggedGamePerfectSub'
                : 'education.results.unpluggedGameWinSub',
              { cleared: run.state.cleared, total: words.length },
            )}
            perfect={run.perfect}
            cleared={run.state.cleared}
            total={words.length}
            bestStreak={run.state.bestStreak}
            score={run.state.score}
            reducedMotion={run.reducedMotion}
            onReplay={run.replay}
            labels={{
              clearedLabel: t('education.results.unpluggedGameCleared'),
              streakLabel: t('education.results.unpluggedGameBestStreak'),
              scoreLabel: t('education.results.unpluggedGameScore'),
              playAgain: t('education.results.unpluggedGamePlayAgain'),
              mascotAlt: t('education.results.unpluggedGameMascotWinAlt'),
              perfectBadge: t('education.results.unpluggedGamePerfectBadge'),
            }}
          />
        ) : (
          <UnpluggedStage
            state={run.state}
            word={run.word}
            secondsLeft={run.secondsLeft}
            remainingMs={run.remainingMs}
            urgent={run.urgent}
            reducedMotion={run.reducedMotion}
            onChooseDuration={run.chooseDuration}
            onStart={run.start}
            onReveal={run.reveal}
            onJudge={run.judge}
            onAdjustHands={run.adjustHands}
            labels={{
              secondsUnit: t('education.results.unpluggedGameSecondsUnit'),
              timerLabel: t('education.results.unpluggedGameTimerLabel'),
              letters: t('education.results.unpluggedGameLetters', { count: run.word.length }),
              start: t('education.results.unpluggedGameStart'),
              revealNow: t('education.results.unpluggedGameRevealNow'),
              gotIt: t('education.results.unpluggedGameGotIt'),
              notYet: t('education.results.unpluggedGameNotYet'),
              hands: t('education.results.unpluggedGameHands'),
              handsMore: t('education.results.unpluggedGameHandsMore'),
              handsFewer: t('education.results.unpluggedGameHandsFewer'),
              writeNow: t('education.results.unpluggedGameWriteNow'),
              chooseTime: t('education.results.unpluggedGameChooseTime'),
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
