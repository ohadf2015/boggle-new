'use client';

/**
 * DEV-ONLY preview of the live classroom surfaces, fed with fabricated data so
 * they can be reviewed and captured without running a real round:
 *
 *   /en/education/classroom-game?preview=podium     — alias of ?preview=hostresults (emulate reduced motion for the settled podium)
 *   /en/education/classroom-game?preview=projector  — the projector lobby, students popping in
 *   /en/education/classroom-game?preview=waiting    — a student's /education/live lobby
 *   (&count=N sets the projector roster size, default 12; &ready=all readies everyone so Start unlocks)
 *   &stage=wheel|fallback|wordcraft — an in-game projector stage instead of the lobby
 *   ?preview=hostresults|phone|quiz|duel|ended — the round-end surfaces, see LiveResultsPreviews
 *   ?preview=ingame — the teacher's in-game projector mid-round
 *   ?preview=lobby — the game picker; ?preview=setup — the new-class invite step, students landing
 *
 * Mounted from PageClient behind `process.env.NODE_ENV !== 'production'` on a
 * lazy `dynamic()` import, so production never ships this chunk (same pattern
 * as adventure's RunResultPreview). The surfaces own the viewport themselves
 * (`fixed inset-0`), which also covers the SEO tail page.tsx renders below.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigation } from '@/contexts/NavigationContext';
import ProjectorLobby from '@/components/education/projector/ProjectorLobby';
import ProjectorWheel from '@/components/education/live/ProjectorWheel';
import { ProjectorStageFallback } from '@/components/education/live/ProjectorStageFallback';
import { useGameStore } from '@/hooks/gameState/store';
import Avatar from '@/components/Avatar';
import { EduStudentLobby } from '@/components/education/live/EduStudentLobby';
import { sampleProjectorStudents } from '@/components/education/results/previewFixtures';
import { DuelPreview, EndedPreview, HostResultsPreview, PhoneResultsPreview, QuizPreview } from './LiveResultsPreviews';

import type { LiveSurfacePreviewKind } from './previewKinds';
import { StudentQuizPreview } from './StudentQuizPreview';
import { InGamePreview } from './InGamePreview';
import { PhoneGamePreview } from './PhoneGamePreview';
import { LobbyPickerPreview } from './LobbyPickerPreview';
import { WarmUpPreview } from './WarmUpPreview';
import { SetupInvitePreview } from './SetupInvitePreview';
import { CrosswordPreview } from './CrosswordPreview';

export type { LiveSurfacePreviewKind };

function StagePreview({ stage }: { stage: string }) {
  const { t } = useLanguage();
  const players = useMemo(() => sampleProjectorStudents(6).map((s, i) => ({ username: s.username, score: 120 - i * 17 })), []);
  const [modeSet, setModeSet] = useState(false);
  useEffect(() => {
    if (stage !== 'wordcraft') return;
    const store = useGameStore.getState();
    const before = store.gameMode;
    store.setGameMode('wordcraft');
    setModeSet(true);
    return () => useGameStore.getState().setGameMode(before);
  }, [stage]);

  if (stage === 'wordcraft') return modeSet ? <InGamePreview /> : null;
  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center gap-6 bg-neo-navy p-8">
      {stage === 'wheel' && (
        <ProjectorWheel puzzle={{ centerLetter: 'r', outerLetters: ['s', 't', 'o', 'm', 'a', 'i'], allLetters: ['r', 's', 't', 'o', 'm', 'a', 'i'] }} label={t('eduLiveRoom.round.wheelLabel')} />
      )}
      <ProjectorStageFallback mode={stage === 'wheel' ? 'wheel-rush' : 'blast'} players={players} t={t} />
    </div>
  );
}

function ProjectorPreview() {
  const { t, language } = useLanguage();
  const params = useSearchParams();
  const allReady = params?.get('ready') === 'all';
  const total = Math.max(0, Math.min(60, Number(params?.get('count') ?? 12) || 0));
  const roster = useMemo(() => sampleProjectorStudents(total), [total]);
  // Students arrive one at a time so the pop-in + join sting can be judged.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= roster.length) return;
    const id = window.setTimeout(() => setShown((n) => n + 1), shown === 0 ? 400 : 180);
    return () => window.clearTimeout(id);
  }, [shown, roster.length]);

  return (
    <ProjectorLobby
      gameCode="YHNCF4"
      language={language}
      students={roster.slice(0, shown)}
      readyUsernames={roster.slice(0, allReady ? shown : Math.floor(shown / 3)).map((s) => s.username)}
      t={t}
      onStartGame={() => toast('Preview: start')}
      onStartPracticeRound={() => toast('Preview: practice with bots')}
      startLabelKey="hostView.startClassGame"
      lessonName="Weekly Vocabulary"
      wordCount={14}
      classroomGameMode="classic"
      templateSettings={{ timerSeconds: 180, difficulty: 'medium', minWordLength: 3, allowLateJoin: true }}
    />
  );
}

function WaitingPreview() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const roster = useMemo(() => sampleProjectorStudents(9), []);
  // Classmates arrive one at a time, so the pop-in can be judged.
  const [arrived, setArrived] = useState(3);
  useEffect(() => {
    if (arrived >= roster.length) return;
    const id = window.setTimeout(() => setArrived((n) => n + 1), 450);
    return () => window.clearTimeout(id);
  }, [arrived, roster.length]);
  const classmates = roster.slice(0, arrived);
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neo-navy">
      <EduStudentLobby
        username="Maya"
        avatar={<Avatar userId="Maya" size="2xl" className="!h-full !w-full" />}
        onEditAvatar={() => toast('Preview: avatar builder')}
        nameSlot={<h2 className="truncate text-xl font-black text-neo-cream">Maya</h2>}
        readySlot={
          <button
            type="button"
            onClick={() => setReady((v) => !v)}
            className={`focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan ${ready
              ? 'w-full rounded-neo border-3 border-neo-black bg-neo-lime py-3 font-black uppercase text-neo-black shadow-hard'
              : 'w-full rounded-neo border-3 border-neo-lime bg-neo-navy py-3 font-black uppercase text-neo-lime shadow-hard'}`}
          >
            {ready ? t('playerView.readyConfirmed') : t('playerView.readyUp')}
          </button>
        }
        classmates={classmates}
        onExit={() => toast('Preview: exit')}
        isReady={ready}
        t={t}
      />
    </div>
  );
}

export default function LiveSurfacePreview({ kind }: { kind: LiveSurfacePreviewKind }) {
  // Lock the body like the real live screens do — page.tsx renders an SEO
  // block below the client tree that would otherwise scroll under the surface.
  const { setIsInGame } = useNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  if (kind === 'waiting') return <WaitingPreview />;
  if (kind === 'hostresults' || kind === 'podium') return <HostResultsPreview />;
  if (kind === 'phone') return <PhoneResultsPreview />;
  if (kind === 'quiz') return <QuizPreview />;
  if (kind === 'duel') return <DuelPreview />;
  if (kind === 'ended') return <EndedPreview />;
  if (kind === 'quizphone') return <StudentQuizPreview />;
  if (kind === 'ingame') return <InGamePreview />;
  if (kind === 'phonegame') return <PhoneGamePreview />;
  if (kind === 'lobby') return <LobbyPickerPreview />;
  if (kind === 'warmup') return <WarmUpPreview />;
  if (kind === 'setup') return <SetupInvitePreview />;
  if (kind === 'crosswordwall') return <CrosswordPreview surface="wall" />;
  if (kind === 'crosswordphone') return <CrosswordPreview surface="phone" />;
  return <ProjectorOrStagePreview />;
}

function ProjectorOrStagePreview() {
  const stage = useSearchParams()?.get('stage');
  return stage ? <StagePreview stage={stage} /> : <ProjectorPreview />;
}
