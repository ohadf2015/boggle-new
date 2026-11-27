'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHoliday } from '@/hooks/useHoliday';
import { landingFor, landingPath } from '@/lib/holidays/landing';

export default function HolidaySeasonLink({ className }: { className?: string }) {
  const { holiday, resolved } = useHoliday();
  const { language } = useLanguage();
  const page = resolved && holiday ? landingFor(holiday, language) : null;
  if (!page) return null;
  return (
    <Link href={landingPath(page)} data-testid="holiday-season-link" className={className}>
      {page.linkLabel}
    </Link>
  );
}
