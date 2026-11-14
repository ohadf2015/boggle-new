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
 * Phone-only class button for approved teachers. Below `sm` the header strip
 * (with its teacher link) is hidden, so a teacher had to open the drawer or
 * scroll to the bottom of home to reach their class. This keeps it one tap away
 * on every page. Icon-only, the same 36px square as the mute and language
 * buttons: a text label crowded the logo on 360px phones (Hebrew logo overlapped
 * it). Steps aside inside /teacher, on CrazyGames and below 350px.
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
      title={label}
      className="sm:hidden max-[349px]:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black shadow-hard-sm transition-transform active:translate-y-px active:shadow-none"
    >
      <GraduationCap className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
    </Link>
  );
});

HeaderClassButton.displayName = 'HeaderClassButton';

export default HeaderClassButton;
