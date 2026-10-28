'use client';

/** DEV-ONLY: the teacher's in-game projector (TvBroadcastView) mid-round, with fabricated scores ticking up. */
import { useEffect, useMemo, useState } from 'react';
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
      classroomLive={{ round: 1, lessonName: 'Weekly Vocabulary', playStyle: 'ffa' }}
      lessonWords={['storm', 'shadow', 'silver', 'thunder']}
      onExitRoom={() => undefined}
    />
  );
}
