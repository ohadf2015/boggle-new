'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { QuickPlayHub } from '@/components/quick-play/QuickPlayHub';
import { studentPracticeBackHref } from '@/lib/navigation/eduExitTargets';
import { ClassLiveGameBanner } from '@/components/student/ClassLiveGameBanner';

/** The arcade solo hub on a classroom path, so students keep the classroom chrome (no player tab bar, no ads). */
function StudentQuickPlay() {
  const { language } = useLanguageSafe();
  const searchParams = useSearchParams();
  const backHref = studentPracticeBackHref(language, searchParams.get('from'));
  return <QuickPlayHub challengeId={searchParams.get('challenge')} backHref={backHref} />;
}

export default function StudentQuickPlayPageClient() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-neo-navy" />}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-neo-navy">
        <StudentQuickPlay />
        <ClassLiveGameBanner />
      </div>
    </Suspense>
  );
}
