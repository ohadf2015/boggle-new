'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { teacherResultsHref } from '@/lib/education/teacherResultsHref';
import { useProInsightOffer } from '@/components/teacher/pro/ProInsightLink';

/** Secondary path under the checkout button: the class's own week page, reported as its own placement. */
export function DashboardClassInsightLink({ classroomId, language, label }: { classroomId: string; language: string; label: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onClick = useProInsightOffer(ref, 'home_class_insight', language, true);
  return (
    <Link
      ref={ref}
      href={teacherResultsHref(language, classroomId)}
      data-testid="dashboard-class-insight-link"
      onClick={onClick}
      className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-neo font-neo-body text-sm font-bold text-neo-cream/85 underline decoration-2 underline-offset-4 transition-colors hover:text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
    >
      <span className="min-w-0">{label}</span>
      <ChevronRight className="size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
    </Link>
  );
}
