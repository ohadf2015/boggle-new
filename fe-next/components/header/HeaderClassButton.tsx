'use client';

import { memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCrazyGames } from '@/components/CrazyGamesSDK';
import { isTeacherProfile } from '@/lib/education/teacherRole';

/**
 * Phone-only "My classroom" button for approved teachers. Below `sm` the header
 * strip (with its teacher link) is hidden, so a teacher had to open the drawer or
 * scroll to the bottom of home to reach their class. This keeps it one tap away
 * on every page. Steps aside inside /teacher and on CrazyGames.
 */
const HeaderClassButton = memo(() => {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const pathname = usePathname();
  const { isOnCrazyGamesPlatform, isLoading } = useCrazyGames();

  if (!isTeacherProfile(profile)) return null;
  if (isLoading || isOnCrazyGamesPlatform) return null;
  if (pathname && /\/teacher(\/|$)/.test(pathname)) return null;

  const label = t('education.nav.myClassroom');

  return (
    <Link
      href={`/${language}/teacher`}
      data-testid="header-my-class"
      aria-label={label}
      className="sm:hidden inline-flex min-h-9 shrink-0 items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-cyan px-2 py-1 font-neo-display text-xs font-black leading-none text-neo-black shadow-hard-sm transition-transform active:translate-y-px active:shadow-none"
    >
      <GraduationCap className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      <span className="max-[359px]:sr-only">{label}</span>
    </Link>
  );
});

HeaderClassButton.displayName = 'HeaderClassButton';

export default HeaderClassButton;
