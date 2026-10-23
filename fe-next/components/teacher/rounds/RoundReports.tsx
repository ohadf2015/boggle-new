'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { RoundReportCard } from './RoundReportCard';

const ROUNDS_SHOWN = 5;

export interface RoundReportsProps {
  classroomId: string;
  classroomName: string;
  previewGames?: RecentClassroomGame[];
  previewPro?: boolean;
}

export function RoundReports({ classroomId, classroomName, previewGames, previewPro }: RoundReportsProps) {
  const { t } = useLanguage();
  const fetched = useRecentClassroomGames({ classroomId: previewGames ? '' : classroomId, limit: ROUNDS_SHOWN });
  const { hasPro } = useTeacherPro();
  const games = previewGames ?? fetched.games;
  const pro = previewPro ?? hasPro;

  return (
    <section data-testid="round-reports" aria-labelledby="round-reports-title" className="space-y-3">
      <h2 id="round-reports-title" className="font-neo-display text-xl font-black text-neo-white">{t('teacher.rounds.title')}</h2>
      {!previewGames && fetched.isLoading ? (
        <div className="h-32 animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none" />
      ) : !previewGames && fetched.error ? (
        <p role="alert" className="rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-sm font-bold text-neo-black">{t('teacher.lastGame.error')}</p>
      ) : games.length === 0 ? (
        <div className="rounded-neo border-2 border-dashed border-neo-cream/40 px-3 py-3">
          <p className="font-neo-display font-black text-neo-white">{t('teacher.lastGame.emptyTitle')}</p>
          <p className="mt-0.5 text-sm text-neo-white/70">{t('teacher.lastGame.emptyHint')}</p>
        </div>
      ) : (
        games.map((game) => (
          <RoundReportCard key={game.gameCode} game={game} hasPro={pro} classroomId={classroomId} classroomName={classroomName} />
        ))
      )}
    </section>
  );
}
