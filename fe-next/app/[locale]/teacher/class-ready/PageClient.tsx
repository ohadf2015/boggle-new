'use client';

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { TeacherGate } from '@/components/education/TeacherGate';
import { PageLoader } from '@/components/ui/PageLoader';
import { cn } from '@/lib/utils';

/** Paid day 0: provision the first class, then hand off to the same class-ready screen every teacher gets. */
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
      <div className="flex h-full items-center justify-center">
        <PageLoader size="lg" text={t('education.access.class_ready_creating', 'Setting up your class…')} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-10 text-center text-neo-white">
      <p>{t('education.access.class_ready_error', 'Could not open a class. Try again, or go to teacher home.')}</p>
      <Link href={`/${language}/teacher`} className="mt-4 inline-block font-bold text-neo-lime underline">
        {t('education.access.class_ready_hq', 'Teacher home')}
      </Link>
    </div>
  );
}

export default function ClassReadyPageClient() {
  return (
    <ClassReadyShell>
      <TeacherGate>
        <ClassReadyInner />
      </TeacherGate>
    </ClassReadyShell>
  );
}

function ClassReadyShell({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage();
  return (
    <EducationShell
      className={cn(language === 'he' && 'rtl')}
      scrollRegionLabel={t('education.access.class_ready_creating', 'Setting up your class…')}
      contentClassName="px-4 py-6 sm:px-6"
    >
      {children}
    </EducationShell>
  );
}
