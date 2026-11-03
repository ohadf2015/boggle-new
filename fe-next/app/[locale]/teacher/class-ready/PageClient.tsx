'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { TeacherGate } from '@/components/education/TeacherGate';
import { PageLoader } from '@/components/ui/PageLoader';

/** Paid day 0: provision the first class, then hand off to class setup's ready step. Looks like that page loading. */
function ClassReadyInner() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/education/classroom/paid-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language }),
        });
        const body = await res.json().catch(() => null);
        if (cancelled) return;
        const id: unknown = body?.data?.id;
        if (!res.ok || typeof id !== 'string' || !body?.data?.join_code) {
          setFailed(true);
          return;
        }
        router.replace(`/${language}/teacher/classroom/new?classroomId=${encodeURIComponent(id)}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, router]);

  if (!failed) {
    return (
      <div className="flex h-dvh flex-1 items-center justify-center bg-neo-navy text-neo-white">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center text-neo-white">
      <p>{t('education.access.class_ready_error', 'Could not open a class. Try again, or go to teacher home.')}</p>
      <Link href={`/${language}/teacher`} className="mt-4 inline-flex min-h-11 items-center font-bold text-neo-lime underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan">
        {t('education.access.class_ready_hq', 'Teacher home')}
      </Link>
    </div>
  );
}

/** Same shell and gate as /teacher/classroom/new, so the redirect does not swap frames. */
export default function ClassReadyPageClient() {
  const { t } = useLanguage();
  return (
    <EducationShell scrollRegionLabel={t('eduShell.setup.title')}>
      <TeacherGate>
        <ClassReadyInner />
      </TeacherGate>
    </EducationShell>
  );
}
