'use client';

import LeaderboardPodium, { type PodiumEntry } from '@/components/leaderboard/LeaderboardPodium';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomEconomyBoard } from '@/shared/constants/classroomEconomy';

interface ClassroomBoardMomentProps {
  board: ClassroomEconomyBoard;
  currentUserId?: string;
}

/** Between rounds: top three from the server board, plus where this student landed. */
export default function ClassroomBoardMoment({ board, currentUserId }: ClassroomBoardMomentProps) {
  const { t, language } = useLanguage();
  const entries: PodiumEntry[] = board.top.map((row) => ({
    player_id: row.userId,
    display_name: row.username,
    total_score: row.cashEarned,
  }));

  return (
    <section aria-labelledby="economy-board-title" className="flex flex-col items-center gap-3">
      <h2 id="economy-board-title" className="text-lg font-bold text-white edu-sky:text-edu-ink">{t('economy.board.title')}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-white/80 edu-sky:text-edu-ink/80">{t('economy.board.empty')}</p>
      ) : (
        <LeaderboardPodium entries={entries} language={language} currentUserId={currentUserId} />
      )}
      {board.you && (
        <p className="text-sm font-bold text-neo-lime edu-sky:text-edu-lime-ink" data-testid="board-you">
          {t('economy.board.you', { rank: board.you.rank, cash: board.you.cashEarned })}
        </p>
      )}
    </section>
  );
}
