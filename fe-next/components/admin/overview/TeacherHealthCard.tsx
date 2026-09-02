'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, AlertTriangle, Users, BookOpen, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import type { TeacherFunnelResult } from '@/lib/education/teacherFunnel';

interface HealthMetrics {
  approved: number;
  blocked: number;
  returnedNoClassroom: number;
  teaching: number;
}

function deriveMetrics(data: TeacherFunnelResult | null): HealthMetrics {
  if (!data) {
    return { approved: 0, blocked: 0, returnedNoClassroom: 0, teaching: 0 };
  }
  const teaching = data.rows.filter((r) => r.stage === 'teaching').length;
  return {
    approved: data.summary.approved,
    blocked: data.summary.blocked,
    returnedNoClassroom: data.summary.returnedNoClassroom,
    teaching,
  };
}

export function TeacherHealthCard() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<TeacherFunnelResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/admin/teacher-funnel');
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setError(null);
    } catch {
      setError(t('admin.teacherHealth.error', 'Could not load teacher health.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = deriveMetrics(data);

  const stat = (label: string, value: number, tone: 'neutral' | 'good' | 'warn' | 'bad') => {
    const toneClass = {
      neutral: 'text-neo-white',
      good: 'text-neo-lime',
      warn: 'text-neo-orange',
      bad: 'text-neo-red',
    }[tone];
    return (
      <div className="rounded-neo border border-black bg-neo-navy-light/50 p-3">
        <div className={`font-neo-display text-2xl font-black ${toneClass}`}>{value}</div>
        <div className="mt-0.5 text-[11px] font-bold uppercase text-neo-white/60">{label}</div>
      </div>
    );
  };

  return (
    <section className="mb-6 rounded-neo border-neo border-black bg-neo-navy-light p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-neo-cyan" aria-hidden />
          <div>
            <h2 className="font-neo-display text-base font-black text-neo-white">
              {t('admin.teacherHealth.title', 'Teacher health')}
            </h2>
            <p className="text-xs text-neo-white/50">
              {t('admin.teacherHealth.subtitle', 'Approved teachers and what they did next')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/${language}/admin/teacher-access`)}
          className="inline-flex items-center gap-1 rounded bg-neo-lime px-3 py-1.5 text-sm font-bold text-neo-navy hover:opacity-90"
        >
          {t('admin.teacherHealth.view', 'View')}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {loading && (
        <div className="mt-4 h-20 animate-pulse rounded bg-neo-navy/50" />
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded border border-neo-red bg-neo-red/10 p-3 text-sm text-neo-red">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stat(
              t('admin.teacherHealth.approved', 'Approved'),
              metrics.approved,
              'neutral',
            )}
            {stat(
              t('admin.teacherHealth.blocked', 'Blocked'),
              metrics.blocked,
              metrics.blocked > 0 ? 'bad' : 'good',
            )}
            {stat(
              t('admin.teacherHealth.noClassroom', 'No classroom'),
              metrics.returnedNoClassroom,
              metrics.returnedNoClassroom > 0 ? 'warn' : 'good',
            )}
            {stat(
              t('admin.teacherHealth.teaching', 'Teaching'),
              metrics.teaching,
              metrics.teaching > 0 ? 'good' : 'neutral',
            )}
          </div>

          {metrics.blocked > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-neo border border-black bg-neo-red p-3 text-sm font-bold text-neo-white shadow-hard-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t(
                'admin.teacherHealth.blockedAlert',
                '{count} approved teachers cannot access the teacher dashboard because their role never landed.',
                { count: metrics.blocked },
              )}
            </div>
          )}

          {metrics.returnedNoClassroom > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-neo border border-black bg-neo-orange p-3 text-sm font-bold text-black shadow-hard-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t(
                'admin.teacherHealth.noClassroomAlert',
                '{count} approved teachers came back but still have no classroom.',
                { count: metrics.returnedNoClassroom },
              )}
            </div>
          )}

          {metrics.teaching > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-neo border border-black bg-neo-lime p-3 text-sm font-bold text-black shadow-hard-sm">
              <BookOpen className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t(
                'admin.teacherHealth.teachingAlert',
                '{count} teachers have active students.',
                { count: metrics.teaching },
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
