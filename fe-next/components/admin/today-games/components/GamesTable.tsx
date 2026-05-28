'use client';

import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { UnifiedGame, SortField, SortOrder, GamesResponse } from '../types';
import { SortableHeader } from './SortableHeader';
import { GameRow } from './GameRow';

interface GamesTableProps {
  games: UnifiedGame[];
  pagination: GamesResponse['pagination'] | null;
  sortField: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
  isRTL: boolean;
  onSort: (field: SortField) => void;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  t: (key: string) => string;
}

export function GamesTable({
  games,
  pagination,
  sortField,
  sortOrder,
  page,
  pageSize,
  isRTL,
  onSort,
  onPageChange,
  t,
}: GamesTableProps) {
  return (
    <>
      <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[600px] sm:min-w-[800px]">
          <thead className="bg-neo-navy-elevated/50">
            <tr>
              <SortableHeader
                label={t('admin.todayGames.time')}
                field="created_at"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <th className="px-2 sm:px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.player')}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.type')}
              </th>
              <th className="hidden sm:table-cell px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.language')}
              </th>
              <SortableHeader
                label={t('admin.todayGames.score')}
                field="score"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <SortableHeader
                label={t('admin.todayGames.words')}
                field="word_count"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <SortableHeader
                label={t('admin.todayGames.duration')}
                field="time_played"
                currentField={sortField}
                sortOrder={sortOrder}
                onSort={onSort}
                isRTL={isRTL}
              />
              <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-neo-display text-slate-300">
                {t('admin.todayGames.code')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            <AnimatePresence mode="popLayout">
              {games.map((game) => (
                <GameRow key={game.id} game={game} t={t} />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">
            {t('admin.todayGames.showing')}{' '}
            {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.totalCount)}{' '}
            {t('admin.todayGames.of')} {pagination.totalCount}
          </span>
          <div className="flex gap-2">
            <Button
              onClick={() => onPageChange((p) => p - 1)}
              disabled={!pagination.hasPrevPage}
              variant="outline"
              size="sm"
            >
              {t('common.previous')}
            </Button>
            <Button
              onClick={() => onPageChange((p) => p + 1)}
              disabled={!pagination.hasNextPage}
              variant="outline"
              size="sm"
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
