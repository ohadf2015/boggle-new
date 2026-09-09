'use client';

import { memo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, Users, BookOpen, GraduationCap, Home, LogOut } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface EducationMenuDropdownProps {
  isTeacher: boolean;
  isOnTeacherSection: boolean;
  isOnStudentSection: boolean;
  onSignOut: () => void;
  isAuthenticated: boolean;
}

/**
 * Desktop "education menu" dropdown (header kebab). Split out of
 * EducationHeader.tsx to bring that file back under the 500-line cap; the
 * mobile slide-out pane lives in the header itself.
 */
export const EducationMenuDropdown = memo<EducationMenuDropdownProps>(({
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
