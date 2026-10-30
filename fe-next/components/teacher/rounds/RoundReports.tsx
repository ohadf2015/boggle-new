'use client';

import { useState } from 'react';
import { ArrowLeft, ChevronDown, Users } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useFitPageSize } from '@/components/teacher/lesson-creation/library/useFitPageSize';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentClassroomGames } from '@/hooks/useRecentClassroomGames';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { hasProAccess } from '@/lib/education/teacherPlanGate';
import type { RecentClassroomGame } from '@/lib/supabase/analyticsLastGame';
import { RoundReportCard } from './RoundReportCard';
import { activeLineParams, roundTitleKey } from './roundReport';

const ROUNDS_SHOWN = 5;
const ROUNDS_LISTED = 12;
const ROW_H = 52;
const PAGER_RESERVE = 64;
const PAGER_BUTTON = 'min-h-10 rounded-neo border-2 border-neo-cream/60 px-3 text-sm font-bold text-neo-cream hover:border-neo-cream disabled:opacity-40';

export interface RoundReportsProps {
  classroomId: string;
  classroomName: string;
  onStudentClick?: (studentId: string, name: string) => void;
  previewGames?: RecentClassroomGame[];
  previewPro?: boolean;
  /** Every game starts as a one-line row; a tapped game opens on its own; the list pages to fit. */
  collapsed?: boolean;
  pageSizeFallback?: number;
}

export function RoundReports({ classroomId, classroomName, onStudentClick, previewGames, previewPro, collapsed = false, pageSizeFallback = 6 }: RoundReportsProps) {
  const { t, language } = useLanguage();
  const fetched = useRecentClassroomGames({ classroomId: previewGames ? '' : classroomId, limit: collapsed ? ROUNDS_LISTED : ROUNDS_SHOWN });
  const entitlement = useTeacherPro();
  const [nowMs] = useState(() => Date.now());
  const hasPro = hasProAccess(entitlement, nowMs);
  const games = previewGames ?? fetched.games;
  const pro = previewPro ?? hasPro;
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [listRef, pageSize] = useFitPageSize(ROW_H, PAGER_RESERVE, pageSizeFallback);
  const [page, setPage] = useState(0);
  const picked = games.find((g) => g.gameCode === openCode);
  const open = collapsed ? picked : picked ?? games[0];
  const settled = previewGames || (!fetched.isLoading && !fetched.error);

  if (settled && games.length === 0) return null;

  const pageCount = Math.max(1, Math.ceil(games.length / Math.max(1, pageSize)));
  const shownPage = Math.min(page, pageCount - 1);
  const listed = !collapsed ? games : open ? [open] : games.slice(shownPage * pageSize, (shownPage + 1) * pageSize);

  return (
    <section data-testid="round-reports" aria-labelledby="round-reports-title" className="space-y-3">
      <h2 id="round-reports-title" className="font-neo-display text-xl font-black text-neo-white">{t('teacher.lastGame.previousGames')}</h2>
      {!previewGames && fetched.isLoading ? (
        <div className="h-32 animate-pulse rounded-neo bg-neo-cream/10 motion-reduce:animate-none" />
      ) : !previewGames && fetched.error ? (
        <p role="alert" className="rounded-neo border-2 border-neo-black bg-neo-yellow px-3 py-2 text-sm font-bold text-neo-black">{t('teacher.lastGame.error')}</p>
      ) : (
        <div ref={listRef} className="flex flex-col gap-3">
        {collapsed && open && (
          <button
            type="button"
            data-testid="round-reports-back"
            onClick={() => setOpenCode(null)}
            className="inline-flex min-h-10 items-center gap-2 rounded-neo border-2 border-neo-cream/60 px-3 text-sm font-bold text-neo-cream hover:bg-neo-cream/10"
          >
            <DirectionalIcon icon={ArrowLeft} className="size-4" />
            {t('teacher.lastGame.previousGames')}
          </button>
        )}
        {listed.map((game) =>
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
              className="flex min-h-12 w-full items-center gap-3 rounded-neo border-2 border-neo-cream/50 bg-neo-navy-light px-3 py-2 text-start hover:border-neo-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
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
        )}
        </div>
      )}
      {collapsed && !open && pageCount > 1 && (
        <nav data-testid="round-reports-pager" aria-label={t('eduLibrary.pager.label')} className="flex items-center justify-center gap-3">
          <button type="button" data-testid="round-reports-prev" disabled={shownPage === 0} onClick={() => setPage(shownPage - 1)} className={PAGER_BUTTON}>
            {t('eduLibrary.pager.prev')}
          </button>
          <span className="text-sm font-bold text-neo-cream/80">{t('eduLibrary.pager.status', { page: shownPage + 1, total: pageCount })}</span>
          <button type="button" data-testid="round-reports-next" disabled={shownPage >= pageCount - 1} onClick={() => setPage(shownPage + 1)} className={PAGER_BUTTON}>
            {t('eduLibrary.pager.next')}
          </button>
        </nav>
      )}
    </section>
  );
}
