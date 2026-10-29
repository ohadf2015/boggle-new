'use client';

/**
 * DEV-ONLY previews of the round-end surfaces (see LiveSurfacePreview):
 *
 *   ?preview=hostresults — the /education/live projector (EduHostResults)
 *   ?preview=phone       — a student's phone on /education/live (`&hero=1` = a signed-in student's card with
 *                          XP and coins, plus the chest locker)
 *   ?preview=quiz        — the Vocab Quiz finale on the wall (`&own=1` = the student's phone finale,
 *                          `&qboss=defeated|escaped` = with the quiz boss verdict above it)
 *   ?preview=duel        — a duel reveal (`&duel=win|loss|draw`)
 *   ?preview=ended       — a student whose room is gone
 *
 * Shared query: `&outcome=zero|solo|tie|nolesson`, `&boss=defeated|escaped`,
 * `&count=N` (class size), `&long=1` (a 28-character winner name), `&rounds=N`, `&me=Name`.
 */

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import EduHostResults from '@/components/education/live/EduHostResults';
import EduStudentResults from '@/components/education/live/EduStudentResults';
import { VocabQuizFinale } from '@/components/education/vocabQuiz/VocabQuizFinale';
import { VocabQuizOwnFinale } from '@/components/education/vocabQuiz/VocabQuizOwnFinale';
import { VocabQuizStandings } from '@/components/education/vocabQuiz/VocabQuizStandings';
import { DuelRevealScreen, type DuelOutcome } from '@/components/education/duels/DuelRevealScreen';
import { ClassroomGameEndedState } from '@/components/education/ClassroomGameEndedState';
import { ClassroomBossOutcome } from '@/components/education/ClassroomBossOutcome';
import { EduStudentHero } from '@/components/education/live/EduStudentHero';
import LockerGrid from '@/components/education/economy/LockerGrid';
import { LIVE_KEYFRAMES } from '@/components/education/live/eduLiveStyles';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { CLASSROOM_ROOM_GONE_KEY } from '@/lib/education/classroomRoomGone';
import type { PreviewOutcome } from '@/components/education/results/previewFixtures';
import {
  sampleBossView,
  samplePreviewRound,
  sampleQuizStandings,
} from '@/components/education/results/resultsPreviewFixtures';

function useOutcome(): PreviewOutcome {
  const value = useSearchParams()?.get('outcome');
  return value === 'zero' || value === 'solo' || value === 'tie' || value === 'nolesson' ? value : 'winner';
}

function usePreviewRound() {
  const params = useSearchParams();
  const outcome = useOutcome();
  const count = Math.max(0, Math.min(40, Number(params?.get('count') ?? 0) || 0));
  const longNames = params?.get('long') === '1';
  const rounds = Math.max(1, Number(params?.get('rounds') ?? 1) || 1);
  return useMemo(() => samplePreviewRound(outcome, { count, longNames, rounds }), [outcome, count, longNames, rounds]);
}

/** Seeds the boss store from `&boss=`, and clears it again so other previews start clean. */
function useSeededBoss() {
  const boss = useSearchParams()?.get('boss');
  useEffect(() => {
    if (boss !== 'defeated' && boss !== 'escaped') return;
    useClassroomBossStore.getState().receiveState(sampleBossView(boss));
    return () => useClassroomBossStore.getState().reset();
  }, [boss]);
}

export function HostResultsPreview() {
  const { t } = useLanguage();
  const { summary, players } = usePreviewRound();
  useSeededBoss();
  return (
    <EduHostResults
      summary={summary}
      players={players}
      t={t}
      onRematch={() => toast('Preview: rematch')}
      onClose={() => toast('Preview: switch game')}
      onExitRoom={() => toast('Preview: back to class')}
    />
  );
}

export function PhoneResultsPreview() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const { summary, players } = usePreviewRound();
  useSeededBoss();
  const me = params?.get('me') ?? players[1]?.username ?? players[0]?.username ?? 'Maya';
  if (params?.get('hero') === '1') {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center gap-4 overflow-y-auto bg-neo-navy p-4">
        <style>{LIVE_KEYFRAMES}</style>
        <div className="w-full max-w-sm">
          <EduStudentHero
            rank={2}
            total={28}
            score={1240}
            bestWord={{ word: 'whispering', score: 34 }}
            lesson={{ found: 6, total: 14 }}
            xp={45}
            coins={12}
            gap={{ kind: 'behind', name: 'Maximiliana Castellanos-Ruiz', points: 36 }}
            reduceMotion={false}
            t={t}
          />
        </div>
        <div className="w-full max-w-sm rounded-neo border-3 border-neo-cream bg-neo-navy p-3 text-white shadow-hard-xl">
          <LockerGrid
            items={[
            { gameCode: 'YHNCF4', roundId: '1', rarity: 'epic', xp: 60, itemId: 'tile-neon', createdAt: '' },
            { gameCode: 'YHNCF4', roundId: '2', rarity: 'rare', xp: 30, itemId: 'tile-neon', createdAt: '' },
            { gameCode: 'YHNCF4', roundId: '3', rarity: 'common', xp: 10, itemId: 'tile-neon', createdAt: '' },
          ]}
          />
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-neo-navy">
      <EduStudentResults finalScores={players} username={me} socket={null} classroomSummary={summary} />
    </div>
  );
}

export function QuizPreview() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const count = Math.max(0, Math.min(30, Number(params?.get('count') ?? 6) || 0));
  const standings = useMemo(() => sampleQuizStandings(count), [count]);
  const qboss = params?.get('qboss');
  if (params?.get('own') === '1') {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col gap-3 overflow-y-auto bg-neo-navy p-3">
        <VocabQuizStandings standings={standings} meUsername="Leo" limit={5} podium t={t} />
        {/* Same wrapper as VocabQuizView's end screen. */}
        <div className="shrink-0">
          <VocabQuizOwnFinale correct={8} total={10} bestStreak={5} t={t} />
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-[80] flex flex-col gap-3 overflow-hidden bg-neo-navy p-3 md:p-6">
      {(qboss === 'defeated' || qboss === 'escaped') && (
        <ClassroomBossOutcome boss={{ maxHp: 100, hp: qboss === 'defeated' ? 0 : 38, lastHits: 3, defeated: qboss === 'defeated' }} t={t} />
      )}
      <VocabQuizFinale
        standings={standings}
        totalQuestions={10}
        onPlayAgain={() => toast('Preview: play again')}
        onBackToClass={() => toast('Preview: back to class')}
        bossShown={qboss === 'defeated' || qboss === 'escaped'}
        t={t}
      />
    </div>
  );
}

export function DuelPreview() {
  const value = useSearchParams()?.get('duel');
  const outcome: DuelOutcome = value === 'loss' || value === 'draw' ? value : 'win';
  return (
    <DuelRevealScreen
      outcome={outcome}
      myScore={outcome === 'loss' ? 84 : 132}
      opponentScore={outcome === 'draw' ? 132 : outcome === 'loss' ? 120 : 97}
      myName="Maya"
      opponentName="Leo"
      xp={45}
      coins={12}
      peakStreak={4}
      series={{ mine: 1, theirs: 1, games: 2 }}
      seriesStatus="open"
      onRematch={() => toast('Preview: rematch')}
      onBackToLobby={() => toast('Preview: back')}
    />
  );
}

export function EndedPreview() {
  const { t } = useLanguage();
  return (
    <ClassroomGameEndedState
      roomCode="YHNCF4"
      message={t(CLASSROOM_ROOM_GONE_KEY)}
      hubHref="/en/student"
      onRetry={() => toast('Preview: retry')}
    />
  );
}
