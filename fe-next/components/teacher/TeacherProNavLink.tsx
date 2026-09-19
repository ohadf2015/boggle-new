'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { cn } from '@/lib/utils';

/**
 * Always-on way to Teacher Pro for a free teacher — the milestone banner is
 * the upgrade MOMENT; this is the upgrade ENTRY. Hidden for Pro (paid or
 * gifted) and while the entitlement is unknown, so we never ask someone who
 * already paid to pay again.
 */
export function TeacherProNavLink({
  onNavigate,
  className,
}: {
  onNavigate?: () => void;
  className?: string;
}) {
  const { t, language } = useLanguage();
  const { hasPro, loading } = useTeacherPro();

  if (loading || hasPro) return null;

  return (
    <Link
      href={`/${language}/teacher/upgrade`}
      data-testid="teacher-pro-nav"
      onClick={onNavigate}
      className={cn(className)}
    >
      <Sparkles className="w-4 h-4" aria-hidden="true" />
      <span>{t('teacher.plan.pro')}</span>
      <span className="text-xs font-bold underline underline-offset-2">{t('teacher.plan.upgrade')}</span>
    </Link>
  );
}

export default TeacherProNavLink;
