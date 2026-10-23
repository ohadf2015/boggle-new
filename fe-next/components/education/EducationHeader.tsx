'use client';

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, GraduationCap, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import MusicControls from '@/components/MusicControls';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import { EducationBreadcrumbs } from './EducationBreadcrumbs';
import { EducationMenuDropdown } from './EducationMenuDropdown';
import { EducationHeaderMobileMenu } from './EducationHeaderMobileMenu';
import { TeacherWhatsNew } from '@/components/teacher/TeacherWhatsNew';
import { TeacherHelpButton } from '@/components/teacher/TeacherHelpButton';
import { SearchIconButton } from './SearchIconButton';
import { useSafeArea } from '@/hooks/useSafeArea';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { educationBackHref, educationHomeFor } from '@/lib/navigation/educationBackHref';

/**
 * Flattens the controls inside the utility bar: no per-button border, hard
 * shadow, fill or hover lift — just a soft hover wash. `!` because each
 * control's own `hover:shadow-hard` etc. out-specifies a plain descendant rule.
 * Spelled out in full: Tailwind v4 only emits class names it can read verbatim.
 */
const UTILITY_BAR = [
  'bg-neo-cream/5',
  '[&>*>button]:border-0! [&>*>button]:shadow-none! [&>*>button]:bg-transparent! [&>*>button]:translate-none! [&>*>button]:rounded-neo! [&>*>button]:text-neo-cream! [&>*>button]:hover:bg-neo-cream/15!',
  '[&>*>*>button]:border-0! [&>*>*>button]:shadow-none! [&>*>*>button]:bg-transparent! [&>*>*>button]:translate-none! [&>*>*>button]:rounded-neo! [&>*>*>button]:text-neo-cream! [&>*>*>button]:hover:bg-neo-cream/15!',
].join(' ');

interface EducationHeaderProps {
  /** Additional class names */
  className?: string;
  /** Show back button to education landing */
  showBackButton?: boolean;
  /** Custom title override */
  title?: string;
  /**
   * Override where the back button goes. Defaults to `educationBackHref`.
   * A classroom multiplayer game passes its own hub here (teacher dashboard /
   * student hub via `multiplayerExitDestination`) — the education landing is
   * the wrong place mid-game.
   */
  backHref?: string;
  /** Replaces the navigation entirely, e.g. a live host who must confirm leaving first. */
  onBack?: () => void;
}

/**
 * Education-specific header component
 *
 * Replaces the global Header on education routes to create a self-contained
 * educational experience with no escape routes to the main app.
 *
 * Features:
 * - Education-branded logo (non-clickable or links to /education only)
 * - Breadcrumb navigation within education routes
 * - Context-aware menu (education-only links)
 * - Hides: coin balance, gift notifications, main app notifications
 * - Keeps: music controls, language selector
 * - Neo-brutalist styling with RTL support
 *
 * The desktop kebab dropdown lives in ./EducationMenuDropdown (split out to
 * keep this file under the 500-line cap).
 */
export const EducationHeader = memo<EducationHeaderProps>(({
  className,
  showBackButton = false,
  title,
  backHref,
  onBack,
}) => {
  const { t, language } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const safeArea = useSafeArea();
  const isRTL = language === 'he';

  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    if (showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMobileMenu]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMobileMenu(false);
      }
    };
    if (showMobileMenu) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMobileMenu]);

  // Determine if user is a teacher (for menu options). This was `is_admin === true`,
  // which hid the "Teacher dashboard" link from every actual teacher — the one
  // shared predicate (`user_role` teacher/admin, or is_admin) is what /teacher
  // itself gates on.
  const isTeacher = isTeacherProfile(profile);

  const isOnTeacherSection = pathname?.includes('/teacher');
  const isOnStudentSection = pathname?.includes('/student');

  const eduRole = isTeacher ? 'teacher' : profile?.user_role === 'student' ? 'student' : null;
  // Back, error and 404 paths stay in education; this is the one deliberate way out.
  const exitHref = `/${language}`;

  const handleBackClick = useCallback(() => {
    if (onBack) return onBack();
    router.push(backHref || educationBackHref({ pathname, locale: language, role: eduRole }));
  }, [backHref, language, router, pathname, eduRole, onBack]);

  const handleSignOut = useCallback(async () => {
    setShowMobileMenu(false);
    await signOut();
    router.push(`/${language}/education`);
  }, [router, language]);

  return (
    <header
      className={cn(
        'w-full mb-1 sm:mb-2 lg:mb-3 px-2 sm:px-3 lg:px-4 pb-1 lg:pb-2',
        'sticky lg:static',
        'z-[60] bg-neo-navy',
        'min-h-[60px] sm:min-h-[70px] lg:min-h-[80px]',
        className
      )}
      style={{
        top: safeArea.top > 0 ? `${safeArea.top}px` : 0,
      }}
    >
      {/* NEO-BRUTALIST Header Bar */}
      <div
        className={cn(
          'w-full mx-auto',
          'flex items-center justify-between',
          'px-2 sm:px-3 lg:px-4 py-2 sm:py-2 lg:py-2.5',
          'bg-neo-navy',
          'backdrop-blur-md',
          'border-4 lg:border-4 border-neo-cream/40',
          'shadow-hard-lg',
          'rounded-neo-lg',
          'transition-all duration-100',
          'min-w-0'
        )}
      >
        {/* Left Section: Back button + Logo */}
        <div className={cn('flex min-w-0 items-center gap-2 sm:gap-3')}>
          {/* Back Button (optional) */}
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className={cn(
                'flex items-center justify-center',
                'w-10 h-10 min-w-[40px] min-h-[40px]',
                'bg-neo-navy text-neo-white',
                'border-3 border-neo-cream',
                'rounded-neo shadow-hard-sm',
                'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard',
                'active:translate-x-px active:translate-y-px active:shadow-none',
                'transition-all duration-100',
                'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
              )}
              aria-label={t('common.back')}
            >
              <DirectionalIcon icon={ArrowLeft} className="w-5 h-5" />
            </button>
          )}

          <Link
            href={educationHomeFor(language, eduRole)}
            className={cn(
              'flex min-w-0 items-center gap-1 sm:gap-2',
              'hover:opacity-90 transition-opacity',
              'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 rounded-sm'
            )}
            aria-label={t('education.header.homeLink')}
          >
            {/* Graduation cap icon */}
            <div
              className={cn(
                'flex items-center justify-center',
                'w-8 h-8 sm:w-10 sm:h-10',
                'bg-neo-cyan text-neo-black',
                'border-neo sm:border-3 border-neo-black',
                'rounded-neo shadow-hard-sm'
              )}
            >
              <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            {/* Logo text — truncate so help + hamburger never get pushed off a 320px phone. */}
            <div className="flex min-w-0 flex-col">
              <span
                className={cn(
                  'truncate text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tight',
                  'text-neo-white',
                  'leading-none',
                  !title && 'hidden sm:block'
                )}
              >
                {title || t('education.header.title')}
              </span>
              {!title && (
                <span data-testid="edu-header-phone-title" className="flex min-w-0 flex-col leading-none sm:hidden">
                  <span className="truncate text-lg font-black uppercase tracking-tight text-neo-white">
                    {t('eg2Polish.header.brand')}
                  </span>
                  <span className="truncate text-[0.65rem] font-black uppercase tracking-wide text-neo-cyan">
                    {t('eg2Polish.header.section')}
                  </span>
                </span>
              )}
              <span
                className={cn(
                  'hidden sm:block',
                  'text-xs sm:text-sm font-bold uppercase tracking-wide',
                  'text-neo-cyan',
                  'leading-none'
                )}
              >
                {t('education.header.subtitle')}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Breadcrumbs (wide desktop only). From lg the
            240px sidebar already names the page, and at 1024 the crumbs'
            min-content pushed the shrink-0 controls ~13px off-screen, clipping
            the menu button. `min-w-0` lets them yield before the controls do. */}
        <div className="hidden xl:flex min-w-0 flex-1 justify-center px-4">
          <EducationBreadcrumbs />
        </div>

        {/* Right Section: ONE borderless utility bar. Each control ships its
            own boxed neo-brutalist frame for use elsewhere; side by side that
            was six bordered squares of noise. The bar strips the frame off its
            direct triggers only (`>*>button`, `>*>*>button`), never off the
            menus they open, and follows the page `dir` instead of a manual
            flex-row-reverse. Order from the inner side: Sound, Language, Help,
            then the menu at the outer edge. */}
        <div
          data-testid="edu-utility-bar"
          dir={isRTL ? 'rtl' : 'ltr'}
          className={cn('flex shrink-0 items-center gap-0.5 rounded-neo-lg p-1 sm:gap-1', UTILITY_BAR)}
        >
          {/* ponytail: What's new + Search are desktop conveniences; at 390px they pushed the hamburger off-screen */}
          {isTeacher && (
            <>
              <span className="hidden sm:flex">
                <TeacherWhatsNew />
              </span>
              <span className="hidden sm:flex">
                <SearchIconButton />
              </span>
              <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-neo-cream/25 sm:block" />
            </>
          )}

          <span className="flex">
            <MusicControls />
          </span>

          <span className="hidden sm:flex">
            <QuickLanguageSwitcher compact />
          </span>

          {isTeacher && (
            <span className="flex">
              <TeacherHelpButton />
            </span>
          )}

          {/* Desktop: education menu dropdown (profile, dashboards, sign out) */}
          <span className="hidden sm:flex">
            <EducationMenuDropdown
              isTeacher={isTeacher}
              exitHref={exitHref}
              isOnTeacherSection={isOnTeacherSection}
              isOnStudentSection={isOnStudentSection}
              onSignOut={handleSignOut}
              isAuthenticated={isAuthenticated}
            />
          </span>

          {/* Mobile: hamburger opens the slide-out pane */}
          <div className="flex sm:hidden" ref={mobileMenuRef}>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center"
              aria-label={showMobileMenu ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      <EducationHeaderMobileMenu
        open={showMobileMenu}
        mounted={mounted}
        paneRef={mobileMenuRef}
        isRTL={isRTL}
        isTeacher={isTeacher}
        isAuthenticated={isAuthenticated}
        isOnTeacherSection={!!isOnTeacherSection}
        isOnStudentSection={!!isOnStudentSection}
        exitHref={exitHref}
        onClose={() => setShowMobileMenu(false)}
        onSignOut={handleSignOut}
      />
    </header>
  );
});

EducationHeader.displayName = 'EducationHeader';

export default EducationHeader;
