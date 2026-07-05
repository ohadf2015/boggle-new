'use client';

import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  GraduationCap,
  BookOpen,
  Users,
  LogOut,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import MusicControls from '@/components/MusicControls';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import { EducationBreadcrumbs } from './EducationBreadcrumbs';
import { useSafeArea } from '@/hooks/useSafeArea';

interface EducationHeaderProps {
  /** Additional class names */
  className?: string;
  /** Show back button to education landing */
  showBackButton?: boolean;
  /** Custom title override */
  title?: string;
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
 */
export const EducationHeader = memo<EducationHeaderProps>(({
  className,
  showBackButton = false,
  title,
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

  // Track client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu when clicking outside
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

  // Close mobile menu on escape key
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

  // Determine if user is a teacher (for menu options)
  const isTeacher = profile?.is_admin === true;

  // Determine current section for active state
  const isOnTeacherSection = pathname?.includes('/teacher');
  const isOnStudentSection = pathname?.includes('/student');

  // Handle back to education landing
  const handleBackClick = useCallback(() => {
    router.push(`/${language}/education`);
  }, [language, router]);

  // Handle sign out
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
        'z-[60] bg-neo-cream dark:bg-neo-navy',
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
          'bg-neo-white/90 dark:bg-neo-navy',
          'backdrop-blur-md',
          'border-4 lg:border-4 border-neo-black',
          'shadow-hard-lg',
          'rounded-neo-lg',
          'transition-all duration-100',
          'min-w-0'
        )}
      >
        {/* Left Section: Back button + Logo */}
        <div className={cn('flex items-center gap-2 sm:gap-3', isRTL && 'flex-row-reverse')}>
          {/* Back Button (optional) */}
          {showBackButton && (
            <button
              onClick={handleBackClick}
              className={cn(
                'flex items-center justify-center',
                'w-10 h-10 min-w-[40px] min-h-[40px]',
                'bg-neo-cream text-neo-black dark:bg-neo-navy dark:text-white',
                'border-3 border-neo-black dark:border-slate-500',
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

          {/* Education Logo - Links to education landing only (no main app escape) */}
          <Link
            href={`/${language}/education`}
            className={cn(
              'flex items-center gap-1 sm:gap-2',
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

            {/* Logo text */}
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-lg sm:text-xl lg:text-2xl font-black uppercase tracking-tight',
                  'text-neo-black dark:text-neo-white',
                  'leading-none'
                )}
              >
                {title || t('education.header.title')}
              </span>
              <span
                className={cn(
                  'text-xs sm:text-sm font-bold uppercase tracking-wide',
                  'text-neo-cyan dark:text-neo-cyan',
                  'leading-none'
                )}
              >
                {t('education.header.subtitle')}
              </span>
            </div>
          </Link>
        </div>

        {/* Center Section: Breadcrumbs (desktop only) */}
        <div className="hidden lg:flex flex-1 justify-center px-4">
          <EducationBreadcrumbs />
        </div>

        {/* Right Section: Controls */}
        <div className={cn('flex items-center gap-2 sm:gap-3', isRTL && 'flex-row-reverse')}>
          {/* Desktop Controls */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Language Switcher */}
            <QuickLanguageSwitcher compact />

            {/* Music Controls */}
            <MusicControls />

            {/* Education Menu Dropdown */}
            <EducationMenuDropdown
              isTeacher={isTeacher}
              isOnTeacherSection={isOnTeacherSection}
              isOnStudentSection={isOnStudentSection}
              onSignOut={handleSignOut}
              isAuthenticated={isAuthenticated}
            />
          </div>

          {/* Mobile Controls */}
          <div className="sm:hidden flex items-center gap-2" ref={mobileMenuRef}>
            {/* Music Controls */}
            <MusicControls />

            {/* Hamburger menu button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={cn(
                'flex items-center justify-center shrink-0',
                'w-11 h-11 min-w-[44px] min-h-[44px]',
                'bg-neo-cream text-neo-black',
                'border-3 border-neo-black',
                'rounded-neo shadow-hard-sm',
                'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard',
                'active:translate-x-px active:translate-y-px active:shadow-none',
                'transition-all duration-100'
              )}
              aria-label={showMobileMenu ? t('common.closeMenu') : t('common.openMenu')}
              aria-expanded={showMobileMenu}
            >
              {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Breadcrumbs (below header bar) */}
      <div className="lg:hidden mt-2 px-1">
        <EducationBreadcrumbs className="text-xs" />
      </div>

      {/* Mobile Menu Slide-out Pane */}
      {mounted && createPortal(
        <>
          {showMobileMenu && (
            <>
              {/* Backdrop overlay */}
              <div
                className="fixed inset-0 bg-neo-black/50 z-70 sm:hidden animate-in fade-in-0 duration-200"
                onClick={() => setShowMobileMenu(false)}
              />
              {/* Slide-out pane */}
              <div
                ref={mobileMenuRef}
                className={cn(
                  'fixed top-0 bottom-0 w-[280px] max-w-[85vw] z-80 sm:hidden',
                  'bg-neo-cream dark:bg-neo-navy border-neo-black dark:border-slate-600',
                  'shadow-hard-xl overflow-y-auto',
                  'pb-[max(env(safe-area-inset-bottom),1rem)]',
                  'animate-in duration-300',
                  isRTL
                    ? 'left-0 border-r-4 rounded-r-neo-lg slide-in-from-left-full'
                    : 'right-0 border-l-4 rounded-l-neo-lg slide-in-from-right-full'
                )}
              >
                {/* Pane Header */}
                <div className="flex items-center justify-between p-4 border-b-3 border-neo-black/20 dark:border-slate-600">
                  <span className="text-lg font-bold text-neo-black dark:text-white">
                    {t('education.header.menu')}
                  </span>
                  <button
                    onClick={() => setShowMobileMenu(false)}
                    className={cn(
                      'flex items-center justify-center',
                      'min-w-[48px] min-h-[48px] w-12 h-12',
                      'bg-neo-cream dark:bg-neo-navy text-neo-black dark:text-white',
                      'border-3 border-neo-black dark:border-slate-500',
                      'rounded-neo shadow-hard-sm',
                      'active:translate-x-px active:translate-y-px active:shadow-none',
                      'transition-all duration-100'
                    )}
                    aria-label={t('common.closeMenu')}
                  >
                    <X className="text-xl" size={20} />
                  </button>
                </div>

                {/* Menu content */}
                <div className="flex flex-col gap-3 p-4">
                  {/* Language Section */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-neo-black/80 dark:text-neo-white uppercase tracking-wide">
                      {t('settings.language')}
                    </span>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black dark:border-slate-500 bg-neo-cream dark:bg-neo-navy">
                      <QuickLanguageSwitcher showLabel />
                    </div>
                  </div>

                  <div className="h-0.5 bg-neo-black/20 dark:bg-neo-navy-light rounded-full" />

                  {/* Navigation Section */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-bold text-neo-black/80 dark:text-neo-white uppercase tracking-wide">
                      {t('education.header.navigation')}
                    </span>

                    {/* Teacher Dashboard (if teacher) */}
                    {isTeacher && (
                      <Link
                        href={`/${language}/teacher`}
                        onClick={() => setShowMobileMenu(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 transition-all w-full',
                          isOnTeacherSection
                            ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                            : 'bg-neo-cream dark:bg-neo-navy hover:bg-neo-cyan/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white border-neo-black dark:border-slate-500 shadow-hard-sm hover:shadow-hard'
                        )}
                      >
                        <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-cyan/50 border-3 border-neo-black text-neo-black">
                          <Users className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span>{t('education.header.teacherDashboard')}</span>
                      </Link>
                    )}

                    {/* Student Dashboard */}
                    {isAuthenticated && (
                      <Link
                        href={`/${language}/student`}
                        onClick={() => setShowMobileMenu(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 transition-all w-full',
                          isOnStudentSection
                            ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                            : 'bg-neo-cream dark:bg-neo-navy hover:bg-neo-cyan/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white border-neo-black dark:border-slate-500 shadow-hard-sm hover:shadow-hard'
                        )}
                      >
                        <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink/50 border-3 border-neo-black text-neo-black">
                          <BookOpen className="w-4 h-4" aria-hidden="true" />
                        </span>
                        <span>{t('education.header.studentDashboard')}</span>
                      </Link>
                    )}

                    {/* Education Landing */}
                    <Link
                      href={`/${language}/education`}
                      onClick={() => setShowMobileMenu(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full',
                        'bg-neo-cream dark:bg-neo-navy hover:bg-neo-lime/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white',
                        'shadow-hard-sm hover:shadow-hard'
                      )}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-lime/50 border-3 border-neo-black text-neo-black">
                        <GraduationCap className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span>{t('education.header.educationHome')}</span>
                    </Link>

                    {/* Back to Main App */}
                    <Link
                      href={`/${language}`}
                      onClick={() => setShowMobileMenu(false)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full',
                        'bg-neo-cream dark:bg-neo-navy hover:bg-neo-pink/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white',
                        'shadow-hard-sm hover:shadow-hard'
                      )}
                    >
                      <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink/50 border-3 border-neo-black text-neo-black">
                        <Home className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <span>{t('common.backToHome')}</span>
                    </Link>
                  </div>

                  {isAuthenticated && (
                    <>
                      <div className="h-0.5 bg-neo-black/20 dark:bg-neo-navy-light rounded-full" />

                      {/* Account Section */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-neo-black/80 dark:text-neo-white uppercase tracking-wide">
                          {t('common.account')}
                        </span>

                        {/* Sign Out */}
                        <button
                          onClick={handleSignOut}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-slate-500 transition-all w-full',
                            'bg-neo-cream dark:bg-neo-navy hover:bg-neo-pink/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white',
                            'shadow-hard-sm hover:shadow-hard'
                          )}
                        >
                          <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink/50 border-3 border-neo-black text-neo-black">
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                          </span>
                          <span>{t('auth.signOut')}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </>,
        document.body
      )}
    </header>
  );
});

EducationHeader.displayName = 'EducationHeader';

/**
 * Education Menu Dropdown for desktop
 */
interface EducationMenuDropdownProps {
  isTeacher: boolean;
  isOnTeacherSection: boolean;
  isOnStudentSection: boolean;
  onSignOut: () => void;
  isAuthenticated: boolean;
}

const EducationMenuDropdown = memo<EducationMenuDropdownProps>(({
  isTeacher,
  isOnTeacherSection,
  isOnStudentSection,
  onSignOut,
  isAuthenticated,
}) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isRTL = language === 'he';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 sm:w-11 sm:h-11',
          'bg-neo-cream text-neo-black dark:bg-neo-navy dark:text-white',
          'border-3 border-neo-black dark:border-slate-500',
          'rounded-neo shadow-hard-sm',
          'hover:-translate-x-px hover:-translate-y-px hover:shadow-hard',
          'active:translate-x-px active:translate-y-px active:shadow-none',
          'transition-all duration-100',
          'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2'
        )}
        aria-label={t('common.menu')}
        aria-expanded={isOpen}
      >
        <Menu size={18} />
      </button>

      {isOpen && (
          <div
            className={cn(
              'absolute top-full mt-2 w-56',
              'bg-neo-cream dark:bg-neo-navy',
              'border-3 border-neo-black dark:border-slate-500',
              'rounded-neo shadow-hard-lg',
              'overflow-hidden z-50',
              'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150',
              isRTL ? 'left-0' : 'right-0'
            )}
          >
            {/* Navigation Links */}
            <div className="p-2 space-y-1">
              {isTeacher && (
                <Link
                  href={`/${language}/teacher`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-neo transition-colors',
                    isOnTeacherSection
                      ? 'bg-neo-cyan text-neo-black'
                      : 'text-neo-black dark:text-white hover:bg-neo-cyan/30'
                  )}
                >
                  <Users className="w-4 h-4" />
                  {t('education.header.teacherDashboard')}
                </Link>
              )}

              {isAuthenticated && (
                <Link
                  href={`/${language}/student`}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-neo transition-colors',
                    isOnStudentSection
                      ? 'bg-neo-cyan text-neo-black'
                      : 'text-neo-black dark:text-white hover:bg-neo-cyan/30'
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  {t('education.header.studentDashboard')}
                </Link>
              )}

              <Link
                href={`/${language}/education`}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-neo transition-colors',
                  'text-neo-black dark:text-white hover:bg-neo-lime/30'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                {t('education.header.educationHome')}
              </Link>

              <Link
                href={`/${language}`}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-neo transition-colors',
                  'text-neo-black dark:text-white hover:bg-neo-pink/30'
                )}
              >
                <Home className="w-4 h-4" />
                {t('common.backToHome')}
              </Link>
            </div>

            {isAuthenticated && (
              <>
                <div className="h-px bg-neo-black/20 dark:bg-neo-navy-light mx-2" />

                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onSignOut();
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm font-bold rounded-neo transition-colors w-full',
                      'text-neo-black dark:text-white hover:bg-neo-pink/30'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                    {t('auth.signOut')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
    </div>
  );
});

EducationMenuDropdown.displayName = 'EducationMenuDropdown';

export default EducationHeader;
