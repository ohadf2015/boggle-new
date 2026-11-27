'use client';

/** DEV-ONLY: the teacher's in-game projector (TvBroadcastView) mid-round, with fabricated scores ticking up. `&mode=blast|word-hunt|wheel-rush`, `&teams=1`, `&boss=live`. */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGameStore } from '@/hooks/gameState/store';
import { useClassroomBossStore } from '@/stores/classroomBossStore';
import { sampleBossView } from '@/components/education/results/resultsPreviewFixtures';
import TvBroadcastView from '@/host/components/TvBroadcastView';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/shared/types/game';
import { sampleProjectorStudents } from '@/components/education/results/previewFixtures';

const BOARD = [
  ['S', 'T', 'O', 'R', 'M'],
  ['H', 'A', 'D', 'E', 'W'],
  ['I', 'N', 'L', 'S', 'A'],
  ['V', 'E', 'R', 'T', 'Y'],
  ['O', 'C', 'K', 'B', 'U'],
];

export function InGamePreview() {
  const { t, language } = useLanguage();
  const roster = useMemo(() => sampleProjectorStudents(12), []);
  const params = useSearchParams();
  const mode = params?.get('mode');
  const teams = params?.get('teams') === '1';
  const boss = params?.get('boss') === 'live';
  useEffect(() => {
    if (!mode) return undefined;
    const before = useGameStore.getState().gameMode;
    useGameStore.getState().setGameMode(mode as never);
    return () => useGameStore.getState().setGameMode(before);
  }, [mode]);
  useEffect(() => {
    if (!boss) return undefined;
    useClassroomBossStore.getState().receiveState({ ...sampleBossView('escaped'), status: 'fighting', hp: 64, pctDealt: 36 } as never);
    return () => useClassroomBossStore.getState().reset();
  }, [boss]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const scores = Object.fromEntries(roster.map((s, i) => [s.username, Math.max(0, (tick * (13 - i)) % 160 + i * 3)]));
  const counts = Object.fromEntries(roster.map((s, i) => [s.username, Math.floor((tick * (13 - i)) / 20)]));

  return (
    <TvBroadcastView
      gameCode="YHNCF4"
      username="teacher"
      roomLanguage={language as Language}
      t={t}
      tableData={BOARD}
      remainingTime={Math.max(0, 180 - tick)}
      timerValue={3}
      playersReady={roster.map((s) => ({ username: s.username }))}
      playerScores={scores}
      playerWordCounts={counts}
      socket={null}
      classroomLive={teams
        ? { round: 1, lessonName: 'Weekly Vocabulary', playStyle: 'teams', teams: [0, 1, 2].map((id) => ({ id, memberNames: roster.filter((_, i) => i % 3 === id).map((s) => s.username) })) }
        : { round: 1, lessonName: 'Weekly Vocabulary', playStyle: 'ffa' }}
      lessonWords={['storm', 'shadow', 'silver', 'thunder']}
      onExitRoom={() => undefined}
    />
  );
}
