'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarLite from '@/components/AvatarLite';
import { PageLoader } from '@/components/ui/PageLoader';
import { ShareParentReportButton } from './ShareParentReportButton';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';
import { useFitPageSize } from '@/components/teacher/lesson-creation/library/useFitPageSize';

const ROW_H = 52;
const PAGER_RESERVE = 72;
const PAGER_BUTTON = 'min-h-10 rounded-neo border-2 border-neo-cream/60 px-3 text-sm font-bold text-neo-cream hover:border-neo-cream disabled:opacity-40';

interface StudentProgressTableProps {
  classroomId: string;
  onStudentClick?: (studentId: string) => void;
  /** Rows per page until the table has measured the room it has. */
  pageSizeFallback?: number;
}

const columnHelper = createColumnHelper<StudentProgressSummary>();

export function StudentProgressTable({ classroomId, onStudentClick, pageSizeFallback = 8 }: StudentProgressTableProps) {
  const { t } = useLanguage();
  const { students, isLoading, error } = useStudentProgressMetrics({ classroomId });

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalXp', desc: true },
  ]);
  const [bodyRef, pageSize] = useFitPageSize(ROW_H, PAGER_RESERVE, pageSizeFallback);
  const [pageIndex, setPageIndex] = useState(0);

  const formatLastActive = (date: string | null) => {
    if (!date) return '-';

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

    if (date === today) return t('education.analytics.today');
    if (date === yesterday) return t('education.analytics.yesterday');

    const daysAgo = Math.floor((now.getTime() - new Date(date).getTime()) / 86400000);
    return t('education.analytics.daysAgo', { count: daysAgo });
  };

  const columns = useMemo(() => [
    columnHelper.accessor('displayName', {
      header: t('education.analytics.student') as string,
      meta: { className: 'sticky start-0 z-10 bg-neo-navy' },
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-2">
            <AvatarLite userId={student.studentId} customAvatar={student.avatarConfig} pixelSize={32} />
            <span className="text-neo-white font-neo-body">
              {student.displayName}
              {student.isStruggling && (
                <span className="ms-2 inline-block rounded-full border-2 border-neo-cream/60 px-1.5 text-xs font-bold text-neo-cream">
                  {t('education.analytics.struggling')}
                </span>
              )}
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('currentLevel', {
      header: t('education.analytics.level') as string,
      meta: { className: 'hidden md:table-cell' },
    }),
    columnHelper.accessor('totalXp', {
      header: 'XP',
    }),
    columnHelper.accessor('vocabularyMastery', {
      header: t('education.analytics.mastery') as string,
      meta: { className: 'hidden lg:table-cell' },
      cell: ({ getValue }) => {
        const value = getValue();
        return (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-neo-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-neo-cream transition-[width]"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="text-neo-white font-neo-body text-sm">
              {value}%
            </span>
          </div>
        );
      },
    }),
    columnHelper.accessor('overallAccuracy', {
      header: t('education.analytics.accuracy') as string,
      cell: ({ getValue }) => `${getValue()}%`,
    }),
    columnHelper.accessor('currentStreak', {
      header: t('education.analytics.streak') as string,
      meta: { className: 'hidden md:table-cell' },
      cell: ({ getValue }) => {
        const streak = getValue();
        return (
          <>
            {streak >= 3 && <span className="me-1">🔥</span>}
            {streak}
          </>
        );
      },
    }),
    columnHelper.accessor('lastPracticeDate', {
      header: t('education.analytics.lastActive') as string,
      meta: { className: 'hidden lg:table-cell' },
      enableSorting: false,
      cell: ({ getValue }) => (
        <span className="text-neo-white text-sm">
          {formatLastActive(getValue())}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'shareParentReport',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <ShareParentReportButton classroomId={classroomId} studentId={row.original.studentId} />
      ),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formatLastActive is stable
  ], [t, classroomId]);

  const table = useReactTable({
    data: students,
    columns,
    state: { sorting, pagination: { pageIndex, pageSize } },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    autoResetPageIndex: false,
  });
  const pageCount = Math.max(1, Math.ceil(students.length / Math.max(1, pageSize)));
  const page = Math.min(pageIndex, pageCount - 1);
  if (page !== pageIndex) setPageIndex(page);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neo-orange/20 border-neo border-neo-cream/40 shadow-hard p-4 rounded-neo">
        <p className="text-neo-white font-neo-body">{error.message}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-neo-navy/80 border-neo border-neo-cream/40 shadow-hard p-8 rounded-neo text-center">
        <p className="text-neo-white font-neo-body text-lg mb-2">
          {t('education.analytics.noStudents')}
        </p>
        <p className="text-neo-white font-neo-body text-sm">
          {t('education.analytics.inviteStudents')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
    <div className="bg-neo-navy border-2 border-neo-cream/40 rounded-neo overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-neo-navy/80 border-b-neo border-neo-cream/40">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { className?: string } | undefined;
                  return (
                    <th
                      key={header.id}
                      className={`px-3 py-2 text-start text-xs font-neo-body font-bold text-neo-cream/80 ${
                        header.column.getCanSort() ? 'cursor-pointer hover:bg-neo-cream/10' : ''
                      } ${meta?.className ?? ''}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{
                        asc: ' ↑',
                        desc: ' ↓',
                      }[header.column.getIsSorted() as string] ?? ''}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody ref={bodyRef}>
            {table.getRowModel().rows.map((row) => {
              const student = row.original;
              return (
                <tr
                  key={row.id}
                  className={`
                    border-b border-neo-cream/40 hover:bg-neo-cream/10 cursor-pointer
                    ${student.isStruggling ? 'struggling-row' : ''}
                  `}
                  onClick={() => onStudentClick?.(student.studentId)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={`px-3 py-2 text-neo-white font-neo-body ${meta?.className ?? ''}`}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    {pageCount > 1 && (
      <nav data-testid="student-table-pager" aria-label={t('eduLibrary.pager.label')} className="flex items-center justify-center gap-3">
        <button type="button" data-testid="student-table-prev" disabled={page === 0} onClick={() => setPageIndex(page - 1)} className={PAGER_BUTTON}>
          {t('eduLibrary.pager.prev')}
        </button>
        <span className="text-sm font-bold text-neo-cream/80">{t('eduLibrary.pager.status', { page: page + 1, total: pageCount })}</span>
        <button type="button" data-testid="student-table-next" disabled={page >= pageCount - 1} onClick={() => setPageIndex(page + 1)} className={PAGER_BUTTON}>
          {t('eduLibrary.pager.next')}
        </button>
      </nav>
    )}
    </div>
  );
}
