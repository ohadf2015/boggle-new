'use client';

import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, GraduationCap, BookOpen, Users, LogOut, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import { TeacherProNavLink } from '@/components/teacher/TeacherProNavLink';

export interface EducationHeaderMobileMenuProps {
  open: boolean;
  /** Portals need `document`; false during SSR and the first client frame. */
  mounted: boolean;
  paneRef: RefObject<HTMLDivElement | null>;
  isRTL: boolean;
  isTeacher: boolean;
  isAuthenticated: boolean;
  isOnTeacherSection: boolean;
  isOnStudentSection: boolean;
  exitHref: string;
  onClose: () => void;
  onSignOut: () => void;
}

/** The phone slide-out pane of the education header (split out for the 500-line cap). */
export function EducationHeaderMobileMenu({
  open,
  mounted,
  paneRef,
  isRTL,
  isTeacher,
  isAuthenticated,
  isOnTeacherSection,
  isOnStudentSection,
  exitHref,
  onClose,
  onSignOut,
}: EducationHeaderMobileMenuProps) {
  const { t, language } = useLanguage();
  if (!mounted || !open) return null;
  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-neo-black/50 z-70 sm:hidden animate-in fade-in-0 duration-200"
        onClick={() => onClose()}
      />
      {/* Slide-out pane */}
      <div
        ref={paneRef}
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
            onClick={() => onClose()}
            className={cn(
              'flex items-center justify-center',
              'min-w-[48px] min-h-[48px] w-12 h-12',
              'bg-neo-cream dark:bg-neo-navy text-neo-black dark:text-white',
              'border-3 border-neo-black dark:border-neo-cream',
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
            <div className="flex items-center gap-3 px-4 py-3 rounded-neo border-3 border-neo-black dark:border-neo-cream bg-neo-cream dark:bg-neo-navy">
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
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 transition-all w-full',
                  isOnTeacherSection
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                    : 'bg-neo-cream dark:bg-neo-navy hover:bg-neo-cyan/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white border-neo-black dark:border-neo-cream shadow-hard-sm hover:shadow-hard'
                )}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-cyan/50 border-3 border-neo-black text-neo-black">
                  <Users className="w-4 h-4" aria-hidden="true" />
                </span>
                <span>{t('education.header.teacherDashboard')}</span>
              </Link>
            )}

            {isTeacher && (
              <TeacherProNavLink
                onNavigate={onClose}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 transition-all w-full',
                  'bg-neo-cream dark:bg-neo-navy hover:bg-neo-lime/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white border-neo-black dark:border-neo-cream shadow-hard-sm hover:shadow-hard',
                )}
              />
            )}

            {/* Student Dashboard */}
            {isAuthenticated && (
              <Link
                href={`/${language}/student`}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 transition-all w-full',
                  isOnStudentSection
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                    : 'bg-neo-cream dark:bg-neo-navy hover:bg-neo-cyan/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white border-neo-black dark:border-neo-cream shadow-hard-sm hover:shadow-hard'
                )}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink border-3 border-neo-black text-neo-black">
                  <BookOpen className="w-4 h-4" aria-hidden="true" />
                </span>
                <span>{t('education.header.studentDashboard')}</span>
              </Link>
            )}

            {/* Education Landing */}
            <Link
              href={`/${language}/education`}
              onClick={() => onClose()}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-neo-cream transition-all w-full',
                'bg-neo-cream dark:bg-neo-navy hover:bg-neo-lime/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white',
                'shadow-hard-sm hover:shadow-hard'
              )}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-lime/50 border-3 border-neo-black text-neo-black">
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
              </span>
              <span>{t('education.header.educationHome')}</span>
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
                  onClick={onSignOut}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-3 border-neo-black dark:border-neo-cream transition-all w-full',
                    'bg-neo-cream dark:bg-neo-navy hover:bg-neo-pink/30 dark:hover:bg-neo-navy-light text-neo-black dark:text-white',
                    'shadow-hard-sm hover:shadow-hard'
                  )}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink border-3 border-neo-black text-neo-black">
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span>{t('auth.signOut')}</span>
                </button>
              </div>
            </>
          )}

          <div className="h-0.5 bg-neo-black/20 dark:bg-neo-navy-light rounded-full" />

          {/* Leave Education Section — rendered for EVERY user, including
              unauthenticated guest students, who have no other escape
              hatch from the education mobile menu. Kept below its own
              divider and styled as visually secondary (thinner border,
              no shadow-hard, transparent fill) so it never reads as the
              primary action next to "Education Home". */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-neo-black/80 dark:text-neo-white uppercase tracking-wide">
              {t('common.leave')}
            </span>

            {/* Exit Education */}
            <Link
              href={exitHref}
              onClick={() => onClose()}
              className={cn(
                'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-black dark:border-neo-cream/40 transition-all w-full',
                'bg-transparent dark:bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-neo-black dark:text-white'
              )}
            >
              <span className="flex items-center justify-center w-6 h-6 text-neo-black/60 dark:text-neo-cream/60">
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              </span>
              <span>{t('education.header.exitEducation')}</span>
            </Link>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

export default EducationHeaderMobileMenu;
