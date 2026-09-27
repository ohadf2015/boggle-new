'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent?: boolean;
}

/** UUIDs and other opaque record ids — never a step a person navigated to. */
const ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface EducationBreadcrumbsProps {
  /** Additional class names */
  className?: string;
  /** Custom breadcrumb items (overrides automatic detection) */
  customItems?: BreadcrumbItem[];
}

/**
 * Education-specific breadcrumb navigation
 *
 * Automatically generates breadcrumbs based on current path within education routes.
 * Links only to education pages - no escape routes to main app.
 *
 * Features:
 * - Neo-brutalist styling with hard shadows and chunky borders
 * - RTL support for Hebrew
 * - Responsive (collapses on mobile)
 */
export const EducationBreadcrumbs = memo<EducationBreadcrumbsProps>(({
  className,
  customItems,
}) => {
  const pathname = usePathname();
  const { t, language } = useLanguage();

  // Generate breadcrumb items from pathname
  const items: BreadcrumbItem[] = useMemo(() => {
    if (customItems) return customItems;

    const segments = pathname
      .replace(`/${language}`, '')
      .split('/')
      .filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: t('education.header.breadcrumbs.education'),
        href: `/${language}/education`,
        isCurrent: segments.length === 1 && segments[0] === 'education',
      },
    ];

    // Build path progressively
    let currentPath = `/${language}`;

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;

      // Skip 'education' as it's already the root
      if (segment === 'education') return;

      // Map segments to labels
      let label = segment;

      switch (segment) {
        case 'teacher':
          label = t('education.header.breadcrumbs.teacher');
          break;
        case 'student':
          label = t('education.header.breadcrumbs.student');
          break;
        case 'lessons':
          label = t('education.header.breadcrumbs.lessons');
          break;
        case 'classrooms':
          label = t('education.header.breadcrumbs.classrooms');
          break;
        case 'classroom-game':
          label = t('education.header.breadcrumbs.classroomGame');
          break;
        case 'join':
          label = t('education.header.breadcrumbs.join');
          break;
        case 'profile':
          label = t('education.header.breadcrumbs.profile');
          break;
        case 'duels':
          label = t('education.header.breadcrumbs.duels');
          break;
        case 'analytics':
          label = t('education.header.breadcrumbs.analytics');
          break;
        case 'curriculum':
          label = t('education.header.breadcrumbs.curriculum');
          break;
        case 'reports':
          label = t('education.header.breadcrumbs.reports');
          break;
        default:
          /*
            A database id is not a place. This branch used to render
            `d647f2f8...` as the last step of the student's practice trail —
            a raw UUID above the games. Drop the crumb instead of truncating
            it: the segment before it ("Lessons") is a real, clickable step,
            and no new copy is needed in six locales.
          */
          if (ID_SEGMENT.test(segment)) return;
          if (segment.length > 8) {
            label = `${segment.slice(0, 8)}...`;
          }
          break;
      }

      breadcrumbs.push({
        label,
        href: currentPath,
        isCurrent: isLast,
      });
    });

    // A dropped id segment would otherwise leave the trail with no current
    // step, so the last crumb that survived is the one the student is on.
    const tail = breadcrumbs[breadcrumbs.length - 1];
    if (tail) tail.isCurrent = true;

    return breadcrumbs;
  }, [pathname, language, t, customItems]);

  // Don't render if only root breadcrumb
  if (items.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={t('education.header.breadcrumbs.navigation')}
      className={cn('flex items-center', className)}
    >
      <ol
        className={cn(
          'flex items-center gap-1 sm:gap-2 text-sm font-neo-body',
          'overflow-x-auto scrollbar-hide',
          language === 'he' && 'flex-row-reverse'
        )}
      >
        {items.map((item, index) => {
          const isFirst = index === 0;
          const isLast = item.isCurrent;

          return (
            <li
              key={item.href}
              className={cn(
                'flex items-center gap-1 sm:gap-2 whitespace-nowrap',
                language === 'he' && 'flex-row-reverse'
              )}
            >
              {/* Separator (except for first item) */}
              {!isFirst && (
                <DirectionalIcon
                  icon={ChevronRight}
                  className="w-4 h-4 text-neo-white shrink-0"
                  aria-hidden="true"
                />
              )}

              {/* Breadcrumb link or text */}
              {isLast ? (
                <span
                  className={cn(
                    'text-neo-cyan font-bold',
                    'truncate max-w-[150px] sm:max-w-none'
                  )}
                  aria-current="page"
                >
                  {isFirst && (
                    <Home
                      className="w-4 h-4 inline-block me-1 align-text-bottom"
                      aria-hidden="true"
                    />
                  )}
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    'text-neo-white hover:text-neo-white',
                    'transition-colors duration-100',
                    'truncate max-w-[100px] sm:max-w-none',
                    'focus:outline-hidden focus:ring-2 focus:ring-neo-cyan focus:ring-offset-2 focus:ring-offset-neo-navy rounded-sm'
                  )}
                >
                  {isFirst && (
                    <Home
                      className="w-4 h-4 inline-block me-1 align-text-bottom"
                      aria-hidden="true"
                    />
                  )}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

EducationBreadcrumbs.displayName = 'EducationBreadcrumbs';

export default EducationBreadcrumbs;
