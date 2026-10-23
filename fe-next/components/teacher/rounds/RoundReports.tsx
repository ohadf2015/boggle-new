'use client';

import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { RoundReportCard } from './RoundReportCard';
import { activeLineParams, roundTitleKey } from './roundReport';

const ROUNDS_SHOWN = 5;

export interface RoundReportsProps {
  classroomId: string;
  classroomName: string;
  onStudentClick?: (studentId: string, name: string) => void;
  previewGames?: RecentClassroomGame[];
  previewPro?: boolean;
}

export function RoundReports({ classroomId, classroomName, onStudentClick, previewGames, previewPro }: RoundReportsProps) {
  const { t, language } = useLanguage();
  const fetched = useRecentClassroomGames({ classroomId: previewGames ? '' : classroomId, limit: ROUNDS_SHOWN });
  const entitlement = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const hasPro = hasProAccess(entitlement, nowMs);
  const games = previewGames ?? fetched.games;
  const pro = previewPro ?? hasPro;
  const [openCode, setOpenCode] = useState<string | null>(null);
  const open = games.find((g) => g.gameCode === openCode) ?? games[0];
  const settled = previewGames || (!fetched.isLoading && !fetched.error);

  if (settled && games.length === 0) return null;

  return (
    <section data-testid="round-reports" aria-labelledby="round-reports-title" className="space-y-3">
      <h2 id="round-reports-title" className="font-neo-display text-xl font-black text-neo-white">{t('teacher.lastGame.previousGames')}</h2>
      {!previewGames && fetched.isLoading ? (
        <div className="h-32 animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none" />
      ) : !previewGames && fetched.error ? (
        <p role="alert" className="rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-sm font-bold text-neo-black">{t('teacher.lastGame.error')}</p>
      ) : (
        games.map((game) =>
          game === open ? (
            <RoundReportCard
              key={game.gameCode}
              game={game}
              hasPro={pro}
              classroomId={classroomId}
              classroomName={classroomName}
              onStudentClick={onStudentClick}
            />
          ) : (
            <button
              key={game.gameCode}
              type="button"
              data-testid="round-report-collapsed"
              onClick={() => setOpenCode(game.gameCode)}
              className="flex min-h-12 w-full items-center gap-3 rounded-neo border-2 border-neo-cream/30 bg-neo-navy-light px-3 py-2 text-start hover:border-neo-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            >
              <span className="font-neo-display text-sm font-black text-neo-white">
                {t(roundTitleKey(game.gameMode))}
              </span>
              <span className="text-xs font-bold text-neo-white/60">
                {new Date(game.playedAt).toLocaleString(language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="ms-auto inline-flex items-center gap-1 text-xs font-bold text-neo-cyan">
                <Users className="size-3.5" aria-hidden />
                {t('teacher.windowProgress.activeLine', activeLineParams(game.participation))}
              </span>
              <ChevronDown className="size-4 shrink-0 text-neo-white/70" aria-hidden />
            </button>
          ),
        )
      )}
    </section>
  );
}
