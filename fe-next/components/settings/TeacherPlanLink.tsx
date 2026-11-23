'use client';

import Link from 'next/link';
import { ChevronRight, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

/** Settings is where people look for billing first; teachers get a direct way to their plan. */
export function TeacherPlanLink({ isDarkMode }: { isDarkMode: boolean }) {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  if (profile?.user_role !== 'teacher' && profile?.user_role !== 'admin') return null;

  return (
    <Link
      href={`/${language}/teacher/upgrade`}
      data-testid="settings-teacher-plan-link"
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-neo border-3 border-neo-black p-4 shadow-hard-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan motion-reduce:transition-none',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-neo-black bg-neo-yellow text-neo-navy">
        <Crown className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>{t('settings.teacherPlan.title')}</span>
        <span className={cn('mt-0.5 block text-sm', isDarkMode ? 'text-gray-300' : 'text-gray-600')}>{t('settings.teacherPlan.body')}</span>
      </span>
      <DirectionalIcon icon={ChevronRight} className={cn('h-5 w-5 shrink-0', isDarkMode ? 'text-white' : 'text-neo-black')} />
    </Link>
  );
}
