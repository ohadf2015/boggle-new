'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, TriangleAlert, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { fetchWithAuth } from '@/utils/authFetch';
import logger from '@/utils/logger';

export function EndedCodeTriesNotice({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let alive = true;
    setCount(0);
    fetchWithAuth(`/api/education/classroom/${classroomId}/ended-code-tries`)
      .then((res) => {
        if (res.ok) return res.json();
        logger.warn(`ended-code-tries read failed: ${res.status}`);
        return null;
      })
      .then((body: { count?: number } | null) => {
        if (alive) setCount(typeof body?.count === 'number' ? body.count : 0);
      })
      .catch((err) => logger.warn('ended-code-tries read threw:', err));
    return () => {
      alive = false;
    };
  }, [classroomId]);

  if (count < 1) return null;

  return (
    <div
      data-testid="hq-ended-code-tries"
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-neo border-[3px] border-neo-black bg-neo-yellow px-3 py-2 text-neo-black shadow-hard-sm"
    >
      <TriangleAlert className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
      <div className="min-w-48 flex-1">
        <p className="font-neo-display text-sm font-black">{t('education.student.gameEnded.title')}</p>
        <p className="mt-0.5 text-sm font-bold">
          <span
            data-testid="hq-ended-code-tries-count"
            className="inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-white px-1.5 font-neo-display font-black"
          >
            <Users className="size-3.5" strokeWidth={3} aria-hidden />
            <span dir="ltr">{count}</span>
            <span>{t('teacher.dashboard.students')}</span>
          </span>
        </p>
      </div>
      <Link
        href={teacherHostHref(language, { classroomId })}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-lime px-3 font-neo-display text-sm font-black shadow-hard-sm active:translate-y-0.5"
      >
        <Play className="size-4" strokeWidth={3} aria-hidden />
        {t('academy.hq.startTitle')}
      </Link>
    </div>
  );
}
