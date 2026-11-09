'use client';

import type { RefObject } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, GraduationCap, BookOpen, Users, LogOut, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';
import { TeacherProNavLink } from '@/components/teacher/TeacherProNavLink';
import { ForSchoolsLink } from '@/components/education/ForSchoolsLink';
import { NB_DIALOG_CLOSE } from '@/components/teacher/nb/nbDialogStyles';

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
  /** Absent for a signed-in teacher or student: nothing here leaves their hub. */
  exitHref?: string;
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
        className="fixed inset-0 bg-neo-black/85 z-70 sm:hidden"
        onClick={() => onClose()}
      />
      {/* Slide-out pane */}
      <div
        ref={paneRef}
        className={cn(
          'fixed top-0 bottom-0 w-[280px] max-w-[85vw] z-80 sm:hidden',
          'bg-neo-navy border-s-[3px] rounded-s-neo-xl border-neo-cream/50',
          'shadow-hard-xl overflow-y-auto',
          'pb-[max(env(safe-area-inset-bottom),1rem)]',
          'end-0 animate-in duration-300',
          isRTL ? 'slide-in-from-left-full' : 'slide-in-from-right-full'
        )}
      >
        {/* Pane Header */}
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-neo-cream/50 bg-neo-navy-light p-4">
          <span className="font-neo-display text-2xl font-black text-neo-cream">
            {t('education.header.menu')}
          </span>
          <button
            onClick={() => onClose()}
            className={NB_DIALOG_CLOSE}
            aria-label={t('common.closeMenu')}
          >
            <X className="size-5" strokeWidth={3} aria-hidden="true" />
          </button>
        </div>

        {/* Menu content */}
        <div className="flex flex-col gap-3 p-4">
          {/* Language Section */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-neo-white/80 uppercase tracking-wide">
              {t('settings.language')}
            </span>
            <div className="flex items-center gap-3 px-4 py-3 rounded-neo border-[3px] border-neo-cream/50 bg-neo-navy-light shadow-hard">
              <QuickLanguageSwitcher showLabel />
            </div>
          </div>

          <div className="h-0.5 bg-neo-cream/20 rounded-full" />

          {/* Navigation Section */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-neo-white/80 uppercase tracking-wide">
              {t('education.header.navigation')}
            </span>

            {/* Teacher Dashboard (if teacher) */}
            {isTeacher && (
              <Link
                href={`/${language}/teacher`}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] transition w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  isOnTeacherSection
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                    : 'bg-neo-navy-light hover:bg-neo-cyan/20 text-neo-white border-neo-cream/50 shadow-hard'
                )}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-cyan border-2 border-neo-black text-neo-black">
                  <Users className="w-4 h-4" aria-hidden="true" />
                </span>
                <span>{t('education.header.teacherDashboard')}</span>
              </Link>
            )}

            {isTeacher && (
              <>
                <TeacherProNavLink
                  onNavigate={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] transition w-full',
                    'bg-neo-navy-light hover:bg-neo-lime/20 text-neo-white border-neo-cream/50 shadow-hard',
                  )}
                />
                <ForSchoolsLink
                  placement="teacher_menu_mobile"
                  onNavigate={onClose}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] transition w-full',
                    'bg-neo-navy-light hover:bg-neo-lime/20 text-neo-white border-neo-cream/50 shadow-hard',
                  )}
                />
              </>
            )}

            {/* Student Dashboard */}
            {isAuthenticated && (
              <Link
                href={`/${language}/student`}
                onClick={() => onClose()}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] transition w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                  isOnStudentSection
                    ? 'bg-neo-cyan text-neo-black border-neo-black shadow-hard'
                    : 'bg-neo-navy-light hover:bg-neo-cyan/20 text-neo-white border-neo-cream/50 shadow-hard'
                )}
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink border-2 border-neo-black text-neo-black">
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
                'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] border-neo-cream/50 transition w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                'bg-neo-navy-light hover:bg-neo-lime/20 text-neo-white',
                'shadow-hard'
              )}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-lime border-2 border-neo-black text-neo-black">
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
              </span>
              <span>{t('education.header.educationHome')}</span>
            </Link>
          </div>

          {isAuthenticated && (
            <>
              <div className="h-0.5 bg-neo-cream/20 rounded-full" />

              {/* Account Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-neo-white/80 uppercase tracking-wide">
                  {t('common.account')}
                </span>

                {/* Sign Out */}
                <button
                  onClick={onSignOut}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo-lg border-[3px] border-neo-cream/50 transition w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                    'bg-neo-navy-light hover:bg-neo-pink/20 text-neo-white',
                    'shadow-hard'
                  )}
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-neo bg-neo-pink border-2 border-neo-black text-neo-black">
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span>{t('auth.signOut')}</span>
                </button>
              </div>
            </>
          )}

          {exitHref ? (
            <>
              <div className="h-0.5 bg-neo-cream/20 rounded-full" />

              {/* Secondary on purpose (thin border, no shadow) so it never reads as the primary action. */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-neo-white/80 uppercase tracking-wide">
                  {t('common.leave')}
                </span>

                <Link
                  href={exitHref}
                  onClick={() => onClose()}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-neo border-2 border-neo-cream/40 transition w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan',
                    'bg-transparent hover:bg-neo-cream/10 text-neo-white'
                  )}
                >
                  <span className="flex items-center justify-center w-6 h-6 text-neo-cream/60">
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  </span>
                  <span>{t('education.header.exitEducation')}</span>
                </Link>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}

export default EducationHeaderMobileMenu;
