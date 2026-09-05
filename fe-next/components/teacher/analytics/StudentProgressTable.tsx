'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table';
import { useStudentProgressMetrics } from '@/hooks/useStudentProgressMetrics';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import type { StudentProgressSummary } from '@/lib/supabase/analytics';

interface StudentProgressTableProps {
  classroomId: string;
  onStudentClick?: (studentId: string) => void;
}

const columnHelper = createColumnHelper<StudentProgressSummary>();

export function StudentProgressTable({ classroomId, onStudentClick }: StudentProgressTableProps) {
  const { t } = useLanguage();
  const { students, isLoading, error } = useStudentProgressMetrics({ classroomId });

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'totalXp', desc: true },
  ]);

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
      cell: ({ row }) => {
        const student = row.original;
        return (
          <div className="flex items-center gap-2">
            {student.avatarUrl ? (
              <Image
                src={student.avatarUrl}
                alt={student.displayName}
                width={32}
                height={32}
                className="w-8 h-8 rounded-full border-neo border-neo-black"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-neo-cyan/20 border-neo border-neo-black flex items-center justify-center">
                <span className="text-neo-white font-neo-body text-sm">
                  {student.displayName[0].toUpperCase()}
                </span>
              </div>
            )}
            <span className="text-neo-white font-neo-body">
              {student.displayName}
              {student.isStruggling && (
                <span className="ms-2 text-xs text-neo-orange">
                  ({t('education.analytics.struggling')})
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
                className="h-full bg-neo-lime transition-all"
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formatLastActive is stable
  ], [t]);

  const table = useReactTable({
    data: students,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neo-orange/20 border-neo border-neo-black shadow-hard p-4 rounded-neo">
        <p className="text-neo-white font-neo-body">{error.message}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-neo-navy/80 border-neo border-neo-black shadow-hard p-8 rounded-neo text-center">
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
    <div className="bg-neo-navy border-neo border-neo-black shadow-hard rounded-neo overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-neo-navy/80 border-b-neo border-neo-black">
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { className?: string } | undefined;
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-3 text-start text-xs font-neo-body uppercase text-neo-white ${
                        header.column.getCanSort() ? 'cursor-pointer hover:bg-neo-cyan/10' : ''
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
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const student = row.original;
              return (
                <tr
                  key={row.id}
                  className={`
                    border-b border-neo-black/20 hover:bg-neo-cyan/10 cursor-pointer
                    ${student.isStruggling ? 'struggling-row bg-neo-orange/20 border-s-4 border-neo-orange' : ''}
                  `}
                  onClick={() => onStudentClick?.(student.studentId)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as { className?: string } | undefined;
                    return (
                      <td
                        key={cell.id}
                        className={`px-4 py-3 text-neo-white font-neo-body ${meta?.className ?? ''}`}
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
  );
}
